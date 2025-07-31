from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Data Models
class Customer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    total_credit: float = 0.0
    total_paid: float = 0.0
    outstanding_balance: float = 0.0

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None

class CreditEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    amount: float
    description: Optional[str] = None
    date: datetime
    image_data: Optional[str] = None  # Base64 encoded image
    is_paid: bool = False
    paid_amount: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CreditEntryCreate(BaseModel):
    customer_id: str
    amount: float
    description: Optional[str] = None
    date: datetime
    image_data: Optional[str] = None

class CreditEntryUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    is_paid: Optional[bool] = None
    paid_amount: Optional[float] = None

class PaymentUpdate(BaseModel):
    is_paid: bool
    paid_amount: float


# Helper function to calculate customer totals
async def update_customer_totals(customer_id: str):
    # Get all credit entries for this customer
    entries = await db.credit_entries.find({"customer_id": customer_id}).to_list(1000)
    
    total_credit = sum(entry["amount"] for entry in entries)
    total_paid = sum(entry["paid_amount"] for entry in entries)
    outstanding_balance = total_credit - total_paid
    
    # Update customer record
    await db.customers.update_one(
        {"id": customer_id},
        {
            "$set": {
                "total_credit": total_credit,
                "total_paid": total_paid,
                "outstanding_balance": outstanding_balance
            }
        }
    )


# Customer Routes
@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate):
    customer_dict = customer.dict()
    customer_obj = Customer(**customer_dict)
    await db.customers.insert_one(customer_obj.dict())
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers():
    customers = await db.customers.find().sort("created_at", -1).to_list(1000)
    return [Customer(**customer) for customer in customers]

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str):
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return Customer(**customer)

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer_update: CustomerCreate):
    customer = await db.customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    await db.customers.update_one(
        {"id": customer_id},
        {"$set": customer_update.dict()}
    )
    
    updated_customer = await db.customers.find_one({"id": customer_id})
    return Customer(**updated_customer)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str):
    # Delete customer
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Delete all credit entries for this customer
    await db.credit_entries.delete_many({"customer_id": customer_id})
    return {"message": "Customer deleted successfully"}


# Credit Entry Routes
@api_router.post("/credit-entries", response_model=CreditEntry)
async def create_credit_entry(entry: CreditEntryCreate):
    # Verify customer exists
    customer = await db.customers.find_one({"id": entry.customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    entry_dict = entry.dict()
    entry_obj = CreditEntry(**entry_dict)
    await db.credit_entries.insert_one(entry_obj.dict())
    
    # Update customer totals
    await update_customer_totals(entry.customer_id)
    
    return entry_obj

@api_router.get("/credit-entries/{customer_id}", response_model=List[CreditEntry])
async def get_credit_entries(customer_id: str):
    entries = await db.credit_entries.find({"customer_id": customer_id}).sort("date", -1).to_list(1000)
    return [CreditEntry(**entry) for entry in entries]

@api_router.put("/credit-entries/{entry_id}", response_model=CreditEntry)
async def update_credit_entry(entry_id: str, entry_update: CreditEntryUpdate):
    entry = await db.credit_entries.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Credit entry not found")
    
    update_data = {k: v for k, v in entry_update.dict().items() if v is not None}
    
    await db.credit_entries.update_one(
        {"id": entry_id},
        {"$set": update_data}
    )
    
    updated_entry = await db.credit_entries.find_one({"id": entry_id})
    
    # Update customer totals
    await update_customer_totals(entry["customer_id"])
    
    return CreditEntry(**updated_entry)

@api_router.patch("/credit-entries/{entry_id}/payment", response_model=CreditEntry)
async def update_payment_status(entry_id: str, payment: PaymentUpdate):
    entry = await db.credit_entries.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Credit entry not found")
    
    await db.credit_entries.update_one(
        {"id": entry_id},
        {"$set": {
            "is_paid": payment.is_paid,
            "paid_amount": payment.paid_amount
        }}
    )
    
    updated_entry = await db.credit_entries.find_one({"id": entry_id})
    
    # Update customer totals
    await update_customer_totals(entry["customer_id"])
    
    return CreditEntry(**updated_entry)

@api_router.delete("/credit-entries/{entry_id}")
async def delete_credit_entry(entry_id: str):
    entry = await db.credit_entries.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Credit entry not found")
    
    customer_id = entry["customer_id"]
    
    result = await db.credit_entries.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Credit entry not found")
    
    # Update customer totals
    await update_customer_totals(customer_id)
    
    return {"message": "Credit entry deleted successfully"}


# Dashboard stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_customers = await db.customers.count_documents({})
    total_credit_entries = await db.credit_entries.count_documents({})
    
    # Calculate total outstanding
    customers = await db.customers.find().to_list(1000)
    total_outstanding = sum(customer.get("outstanding_balance", 0) for customer in customers)
    total_credit = sum(customer.get("total_credit", 0) for customer in customers)
    total_paid = sum(customer.get("total_paid", 0) for customer in customers)
    
    return {
        "total_customers": total_customers,
        "total_credit_entries": total_credit_entries,
        "total_outstanding": total_outstanding,
        "total_credit": total_credit,
        "total_paid": total_paid
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
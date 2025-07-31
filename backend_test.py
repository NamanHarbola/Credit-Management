import requests
import sys
from datetime import datetime
import json
import uuid

class CreditManagementAPITester:
    def __init__(self, base_url="https://d675cc68-93c8-49ba-b956-9ddbcdddb6aa.preview.emergentagent.com"):
        self.base_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_customer_id = None
        self.created_entry_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        return success

    def test_create_customer(self):
        """Test customer creation"""
        customer_data = {
            "name": "Rajesh Kumar",
            "phone": "9876543210",
            "address": "123 Main Street, Delhi"
        }
        
        success, response = self.run_test(
            "Create Customer - Rajesh Kumar",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        
        if success and 'id' in response:
            self.created_customer_id = response['id']
            print(f"   Created customer ID: {self.created_customer_id}")
            return True
        return False

    def test_create_second_customer(self):
        """Test creating second customer"""
        customer_data = {
            "name": "Priya Sharma",
            "phone": "9988776655",
            "address": "456 Park Avenue, Mumbai"
        }
        
        success, response = self.run_test(
            "Create Customer - Priya Sharma",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        return success

    def test_get_customers(self):
        """Test getting all customers"""
        success, response = self.run_test(
            "Get All Customers",
            "GET",
            "customers",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} customers")
            return len(response) >= 2  # Should have at least 2 customers
        return False

    def test_get_customer_by_id(self):
        """Test getting customer by ID"""
        if not self.created_customer_id:
            print("❌ No customer ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Customer by ID",
            "GET",
            f"customers/{self.created_customer_id}",
            200
        )
        
        if success:
            expected_name = "Rajesh Kumar"
            actual_name = response.get('name', '')
            if actual_name == expected_name:
                print(f"   Customer name matches: {actual_name}")
                return True
            else:
                print(f"   Customer name mismatch: expected '{expected_name}', got '{actual_name}'")
        return False

    def test_update_customer(self):
        """Test updating customer"""
        if not self.created_customer_id:
            print("❌ No customer ID available for testing")
            return False
            
        update_data = {
            "name": "Rajesh Kumar Updated",
            "phone": "9876543210",
            "address": "123 Main Street, New Delhi"
        }
        
        success, response = self.run_test(
            "Update Customer",
            "PUT",
            f"customers/{self.created_customer_id}",
            200,
            data=update_data
        )
        return success

    def test_create_credit_entry(self):
        """Test creating credit entry"""
        if not self.created_customer_id:
            print("❌ No customer ID available for testing")
            return False
            
        entry_data = {
            "customer_id": self.created_customer_id,
            "amount": 5000.0,
            "description": "Grocery supplies",
            "date": datetime.now().isoformat()
        }
        
        success, response = self.run_test(
            "Create Credit Entry",
            "POST",
            "credit-entries",
            200,
            data=entry_data
        )
        
        if success and 'id' in response:
            self.created_entry_id = response['id']
            print(f"   Created credit entry ID: {self.created_entry_id}")
            return True
        return False

    def test_create_second_credit_entry(self):
        """Test creating second credit entry"""
        if not self.created_customer_id:
            print("❌ No customer ID available for testing")
            return False
            
        entry_data = {
            "customer_id": self.created_customer_id,
            "amount": 2500.0,
            "description": "Hardware items",
            "date": datetime.now().isoformat()
        }
        
        success, response = self.run_test(
            "Create Second Credit Entry",
            "POST",
            "credit-entries",
            200,
            data=entry_data
        )
        return success

    def test_get_credit_entries(self):
        """Test getting credit entries for customer"""
        if not self.created_customer_id:
            print("❌ No customer ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Credit Entries",
            "GET",
            f"credit-entries/{self.created_customer_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} credit entries")
            return len(response) >= 2  # Should have at least 2 entries
        return False

    def test_update_credit_entry(self):
        """Test updating credit entry (NEW FEATURE)"""
        if not self.created_entry_id:
            print("❌ No credit entry ID available for testing")
            return False
            
        update_data = {
            "amount": 6500.0,
            "description": "Grocery supplies + extra items",
            "date": datetime.now().isoformat()
        }
        
        success, response = self.run_test(
            "Update Credit Entry (Edit Feature)",
            "PUT",
            f"credit-entries/{self.created_entry_id}",
            200,
            data=update_data
        )
        
        if success:
            # Verify the update worked
            if response.get('amount') == 6500.0 and 'extra items' in response.get('description', ''):
                print("   ✅ Credit entry update verified!")
                return True
            else:
                print("   ❌ Credit entry update data doesn't match")
        return False

    def test_update_payment_status(self):
        """Test updating payment status"""
        if not self.created_entry_id:
            print("❌ No credit entry ID available for testing")
            return False
            
        payment_data = {
            "is_paid": True,
            "paid_amount": 6500.0  # Updated to match the new amount
        }
        
        success, response = self.run_test(
            "Update Payment Status",
            "PATCH",
            f"credit-entries/{self.created_entry_id}/payment",
            200,
            data=payment_data
        )
        return success

    def test_dashboard_stats_after_data(self):
        """Test dashboard stats after adding data"""
        success, response = self.run_test(
            "Dashboard Stats After Data",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            stats = response
            print(f"   Total Customers: {stats.get('total_customers', 0)}")
            print(f"   Total Credit: ₹{stats.get('total_credit', 0)}")
            print(f"   Total Paid: ₹{stats.get('total_paid', 0)}")
            print(f"   Total Outstanding: ₹{stats.get('total_outstanding', 0)}")
            
            # Verify we have expected data
            if stats.get('total_customers', 0) >= 2 and stats.get('total_credit', 0) >= 7500:
                print("   Stats look correct!")
                return True
            else:
                print("   Stats don't match expected values")
        return False

    def test_error_scenarios(self):
        """Test error scenarios"""
        print(f"\n🔍 Testing Error Scenarios...")
        
        # Test creating customer with missing name
        success, _ = self.run_test(
            "Create Customer - Missing Name",
            "POST",
            "customers",
            422,  # Validation error
            data={"phone": "1234567890"}
        )
        
        # Test getting non-existent customer
        fake_id = str(uuid.uuid4())
        success2, _ = self.run_test(
            "Get Non-existent Customer",
            "GET",
            f"customers/{fake_id}",
            404
        )
        
        # Test creating credit entry for non-existent customer
        success3, _ = self.run_test(
            "Create Credit Entry - Non-existent Customer",
            "POST",
            "credit-entries",
            404,
            data={
                "customer_id": fake_id,
                "amount": 1000.0,
                "description": "Test",
                "date": datetime.now().isoformat()
            }
        )
        
        return success and success2 and success3

def main():
    print("🚀 Starting Credit Management API Tests...")
    print("=" * 60)
    
    tester = CreditManagementAPITester()
    
    # Test sequence
    test_results = []
    
    # Basic connectivity and stats
    test_results.append(tester.test_dashboard_stats())
    
    # Customer management
    test_results.append(tester.test_create_customer())
    test_results.append(tester.test_create_second_customer())
    test_results.append(tester.test_get_customers())
    test_results.append(tester.test_get_customer_by_id())
    test_results.append(tester.test_update_customer())
    
    # Credit entry management
    test_results.append(tester.test_create_credit_entry())
    test_results.append(tester.test_create_second_credit_entry())
    test_results.append(tester.test_get_credit_entries())
    test_results.append(tester.test_update_credit_entry())  # NEW: Test edit functionality
    test_results.append(tester.test_update_payment_status())
    
    # Dashboard verification
    test_results.append(tester.test_dashboard_stats_after_data())
    
    # Error scenarios
    test_results.append(tester.test_error_scenarios())
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
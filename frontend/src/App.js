import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Calendar } from './components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { 
  Users, 
  IndianRupee, 
  Plus, 
  Calendar as CalendarIcon, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Upload,
  Eye,
  TrendingUp,
  TrendingDown,
  Wallet,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [creditEntries, setCreditEntries] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [newCreditEntry, setNewCreditEntry] = useState({
    amount: '',
    description: '',
    date: new Date(),
    image_data: null
  });
  
  // Dialog states
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingCreditEntry, setEditingCreditEntry] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [showPrintBill, setShowPrintBill] = useState(null);

  // Load initial data
  useEffect(() => {
    loadCustomers();
    loadDashboardStats();
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (customers.length > 0) {
      // Auto-save is handled by the backend, but we could add local storage here if needed
    }
  }, [customers, creditEntries]);

  const loadCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to load customers');
      console.error('Error loading customers:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadCreditEntries = async (customerId) => {
    try {
      const response = await axios.get(`${API}/credit-entries/${customerId}`);
      setCreditEntries(response.data);
    } catch (error) {
      toast.error('Failed to load credit entries');
      console.error('Error loading credit entries:', error);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      await axios.post(`${API}/customers`, newCustomer);
      toast.success('Customer created successfully');
      setNewCustomer({ name: '', phone: '', address: '' });
      setShowCustomerDialog(false);
      loadCustomers();
      loadDashboardStats();
    } catch (error) {
      toast.error('Failed to create customer');
      console.error('Error creating customer:', error);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      await axios.put(`${API}/customers/${editingCustomer.id}`, {
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        address: editingCustomer.address
      });
      toast.success('Customer updated successfully');
      setEditingCustomer(null);
      loadCustomers();
    } catch (error) {
      toast.error('Failed to update customer');
      console.error('Error updating customer:', error);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to delete this customer?\n\n' +
      'This will also delete all their credit entries and cannot be undone.\n\n' +
      'Click OK to confirm deletion or Cancel to keep the customer.'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(`${API}/customers/${customerId}`);
      toast.success('Customer deleted successfully');
      
      // Refresh the data
      await loadCustomers();
      await loadDashboardStats();
      
      // Clear selection if the deleted customer was selected
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer(null);
        setCreditEntries([]);
      }
    } catch (error) {
      toast.error('Failed to delete customer. Please try again.');
      console.error('Error deleting customer:', error);
      
      // Show more detailed error if available
      if (error.response && error.response.data && error.response.data.detail) {
        toast.error(`Error: ${error.response.data.detail}`);
      }
    }
  };

  const handleCreateCreditEntry = async () => {
    if (!newCreditEntry.amount || parseFloat(newCreditEntry.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await axios.post(`${API}/credit-entries`, {
        customer_id: selectedCustomer.id,
        amount: parseFloat(newCreditEntry.amount),
        description: newCreditEntry.description,
        date: newCreditEntry.date.toISOString(),
        image_data: newCreditEntry.image_data
      });
      
      toast.success('Credit entry added successfully');
      setNewCreditEntry({ amount: '', description: '', date: new Date(), image_data: null });
      setShowCreditDialog(false);
      loadCreditEntries(selectedCustomer.id);
      loadCustomers(); // Refresh to update totals
      loadDashboardStats();
    } catch (error) {
      toast.error('Failed to add credit entry');
      console.error('Error creating credit entry:', error);
    }
  };

  const handleUpdateCreditEntry = async () => {
    if (!editingCreditEntry.amount || parseFloat(editingCreditEntry.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      await axios.put(`${API}/credit-entries/${editingCreditEntry.id}`, {
        amount: parseFloat(editingCreditEntry.amount),
        description: editingCreditEntry.description,
        date: editingCreditEntry.date.toISOString(),
        image_data: editingCreditEntry.image_data
      });
      
      toast.success('Credit entry updated successfully');
      setEditingCreditEntry(null);
      loadCreditEntries(selectedCustomer.id);
      loadCustomers(); // Refresh to update totals
      loadDashboardStats();
    } catch (error) {
      toast.error('Failed to update credit entry');
      console.error('Error updating credit entry:', error);
    }
  };

  const handleUpdatePaymentStatus = async (entryId, isPaid, paidAmount) => {
    try {
      await axios.patch(`${API}/credit-entries/${entryId}/payment`, {
        is_paid: isPaid,
        paid_amount: paidAmount
      });
      
      toast.success('Payment status updated');
      loadCreditEntries(selectedCustomer.id);
      loadCustomers(); // Refresh to update totals
      loadDashboardStats();
    } catch (error) {
      toast.error('Failed to update payment status');
      console.error('Error updating payment:', error);
    }
  };

  const handleDeleteCreditEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this credit entry?')) {
      return;
    }

    try {
      await axios.delete(`${API}/credit-entries/${entryId}`);
      toast.success('Credit entry deleted successfully');
      loadCreditEntries(selectedCustomer.id);
      loadCustomers(); // Refresh to update totals
      loadDashboardStats();
    } catch (error) {
      toast.error('Failed to delete credit entry');
      console.error('Error deleting credit entry:', error);
    }
  };

  const handleImageUpload = (event, isEditing = false) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isEditing) {
          setEditingCreditEntry({ ...editingCreditEntry, image_data: e.target.result });
        } else {
          setNewCreditEntry({ ...newCreditEntry, image_data: e.target.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrintBill = async (customer) => {
    // Make sure we load the credit entries for this customer first
    try {
      const response = await axios.get(`${API}/credit-entries/${customer.id}`);
      const customerCreditEntries = response.data;
      
      // Set the customer for print dialog and update credit entries if needed
      setShowPrintBill({...customer, creditEntries: customerCreditEntries});
      
      // If this customer is not currently selected, we need to ensure credit entries are available
      if (!selectedCustomer || selectedCustomer.id !== customer.id) {
        setCreditEntries(customerCreditEntries);
      }
      
    } catch (error) {
      toast.error('Failed to load credit entries for printing');
      console.error('Error loading credit entries for print:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Print Bill Component
  const PrintBillContent = ({ customer, entries }) => {
    const totalCredit = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalPaid = entries.reduce((sum, entry) => sum + entry.paid_amount, 0);
    const outstanding = totalCredit - totalPaid;

    return (
      <div className="print-bill-content bg-white p-8 max-w-4xl mx-auto min-h-screen">
        {/* Header */}
        <div className="text-center mb-8 border-b-4 border-gray-800 pb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-wide">CREDIT STATEMENT</h1>
          <p className="text-lg text-gray-700 font-medium">Statement of Account</p>
          <div className="mt-4 text-sm text-gray-600">
            <p>Generated on: {format(new Date(), 'PPPP')}</p>
            <p>Statement #: CS-{customer.id.substr(-6).toUpperCase()}</p>
          </div>
        </div>

        {/* Business Header - You can customize this */}
        <div className="text-center mb-8 bg-gray-50 p-6 rounded-lg border-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">YOUR BUSINESS NAME</h2>
          <p className="text-gray-600">Address: Your Business Address</p>
          <p className="text-gray-600">Phone: Your Phone Number | Email: your@email.com</p>
        </div>

        {/* Customer Details */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b-2 border-gray-300 pb-2">CUSTOMER DETAILS</h2>
          <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-lg font-bold text-gray-900">{customer.name}</p>
                {customer.phone && <p className="text-gray-700"><strong>Phone:</strong> {customer.phone}</p>}
                {customer.address && <p className="text-gray-700"><strong>Address:</strong> {customer.address}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Customer ID: {customer.id.substr(-8).toUpperCase()}</p>
                <p className="text-sm text-gray-600">Statement Date: {format(new Date(), 'PP')}</p>
                <p className="text-sm text-gray-600">Due Date: {format(new Date(), 'PP')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Entries Table */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b-2 border-gray-300 pb-2">TRANSACTION HISTORY</h2>
          <div className="overflow-hidden border-2 border-gray-300 rounded-lg">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-gray-600 px-4 py-3 text-left font-semibold">DATE</th>
                  <th className="border border-gray-600 px-4 py-3 text-left font-semibold">DESCRIPTION</th>
                  <th className="border border-gray-600 px-4 py-3 text-right font-semibold">AMOUNT</th>
                  <th className="border border-gray-600 px-4 py-3 text-right font-semibold">PAID</th>
                  <th className="border border-gray-600 px-4 py-3 text-center font-semibold">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {entries && entries.length > 0 ? (
                  entries.map((entry, index) => (
                    <tr key={entry.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-3 text-sm">
                        {format(new Date(entry.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-sm">
                        {entry.description || 'Credit Entry'}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-bold text-lg">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-green-700">
                        {formatCurrency(entry.paid_amount)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          entry.is_paid 
                            ? 'bg-green-200 text-green-800 border border-green-300' 
                            : 'bg-red-200 text-red-800 border border-red-300'
                        }`}>
                          {entry.is_paid ? 'PAID' : 'UNPAID'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="border border-gray-300 px-4 py-8 text-center text-gray-500 bg-gray-50">
                      No credit entries found for this customer
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="border-t-4 border-gray-800 pt-6 mb-8">
          <div className="bg-gray-100 p-6 rounded-lg border-2 border-gray-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">ACCOUNT SUMMARY</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded border-l-4 border-blue-500">
                <p className="text-sm font-semibold text-gray-700 uppercase">Total Credit</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalCredit)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded border-l-4 border-green-500">
                <p className="text-sm font-semibold text-gray-700 uppercase">Total Paid</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded border-l-4 border-red-500">
                <p className="text-sm font-semibold text-gray-700 uppercase">Outstanding Balance</p>
                <p className={`text-3xl font-bold ${outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {formatCurrency(outstanding)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="mb-8 bg-yellow-50 p-6 rounded-lg border-2 border-yellow-200">
          <h3 className="text-lg font-bold text-gray-800 mb-3">PAYMENT TERMS & CONDITIONS</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Payment is due within 30 days of statement date</p>
            <p>• Late payment charges may apply after due date</p>
            <p>• Please quote your customer ID when making payments</p>
            <p>• For any queries, contact us using the details above</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t-2 border-gray-300 text-center">
          <div className="bg-gray-800 text-white p-4 rounded-lg">
            <p className="font-semibold mb-2">Thank you for your business!</p>
            <p className="text-sm opacity-90">This is a computer-generated statement and does not require a signature.</p>
            <p className="text-xs opacity-75 mt-2">
              Generated on {format(new Date(), 'PPpp')} | Credit Management System v1.0
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Credit Management Dashboard</h1>
              <p className="text-gray-600">Manage customer credits and payments</p>
            </div>
            <Button onClick={() => setShowCustomerDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardStats.total_customers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Credit</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardStats.total_credit || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Wallet className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardStats.total_paid || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingDown className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardStats.total_outstanding || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customers List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedCustomer?.id === customer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      loadCreditEntries(customer.id);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
                        {customer.phone && <p className="text-sm text-gray-600">{customer.phone}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            Credit: {formatCurrency(customer.total_credit)}
                          </Badge>
                          <Badge variant={customer.outstanding_balance > 0 ? "destructive" : "secondary"} className="text-xs">
                            Outstanding: {formatCurrency(customer.outstanding_balance)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePrintBill(customer);
                          }}
                          title="Print Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingCustomer(customer);
                          }}
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteCustomer(customer.id);
                          }}
                          title="Delete Customer"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {customers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No customers found. Add your first customer to get started.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Credit Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <IndianRupee className="w-5 h-5 mr-2" />
                  Credit Entries
                  {selectedCustomer && <span className="ml-2 text-sm font-normal">({selectedCustomer.name})</span>}
                </div>
                {selectedCustomer && (
                  <Button size="sm" onClick={() => setShowCreditDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Entry
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCustomer ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {creditEntries.map((entry) => (
                    <div key={entry.id} className="p-4 border rounded-lg bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-lg">{formatCurrency(entry.amount)}</span>
                            <Badge variant={entry.is_paid ? "default" : "secondary"}>
                              {entry.is_paid ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(entry.date), 'PPP')}
                          </p>
                          {entry.is_paid && entry.paid_amount && (
                            <p className="text-xs text-green-600 mt-1">
                              Paid: {formatCurrency(entry.paid_amount)}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          {entry.image_data && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowImagePreview(entry.image_data)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCreditEntry({
                                ...entry,
                                amount: entry.amount.toString(),
                                date: new Date(entry.date)
                              });
                            }}
                            title="Edit Entry"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const newStatus = !entry.is_paid;
                              const paidAmount = newStatus ? entry.amount : 0;
                              handleUpdatePaymentStatus(entry.id, newStatus, paidAmount);
                            }}
                          >
                            {entry.is_paid ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCreditEntry(entry.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {creditEntries.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No credit entries found. Add the first entry for this customer.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a customer to view their credit entries
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customer-name">Name *</Label>
              <Input
                id="customer-name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="customer-address">Address</Label>
              <Textarea
                id="customer-address"
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCustomer}>Create Customer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-customer-name">Name *</Label>
                <Input
                  id="edit-customer-name"
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="edit-customer-phone">Phone</Label>
                <Input
                  id="edit-customer-phone"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="edit-customer-address">Address</Label>
                <Textarea
                  id="edit-customer-address"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingCustomer(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCustomer}>Update Customer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Credit Entry Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credit Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="credit-amount">Amount (₹) *</Label>
              <Input
                id="credit-amount"
                type="number"
                value={newCreditEntry.amount}
                onChange={(e) => setNewCreditEntry({ ...newCreditEntry, amount: e.target.value })}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label htmlFor="credit-description">Description</Label>
              <Textarea
                id="credit-description"
                value={newCreditEntry.description}
                onChange={(e) => setNewCreditEntry({ ...newCreditEntry, description: e.target.value })}
                placeholder="Enter description or bill details"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(newCreditEntry.date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newCreditEntry.date}
                    onSelect={(date) => setNewCreditEntry({ ...newCreditEntry, date: date || new Date() })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="credit-image">Attach Image (Bill/Receipt)</Label>
              <Input
                id="credit-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
              />
              {newCreditEntry.image_data && (
                <div className="mt-2">
                  <img
                    src={newCreditEntry.image_data}
                    alt="Preview"
                    className="max-w-full h-32 object-cover rounded border"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCreditEntry}>Add Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Credit Entry Dialog */}
      <Dialog open={!!editingCreditEntry} onOpenChange={() => setEditingCreditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Credit Entry</DialogTitle>
          </DialogHeader>
          {editingCreditEntry && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-credit-amount">Amount (₹) *</Label>
                <Input
                  id="edit-credit-amount"
                  type="number"
                  value={editingCreditEntry.amount}
                  onChange={(e) => setEditingCreditEntry({ ...editingCreditEntry, amount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label htmlFor="edit-credit-description">Description</Label>
                <Textarea
                  id="edit-credit-description"
                  value={editingCreditEntry.description || ''}
                  onChange={(e) => setEditingCreditEntry({ ...editingCreditEntry, description: e.target.value })}
                  placeholder="Enter description or bill details"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(editingCreditEntry.date, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={editingCreditEntry.date}
                      onSelect={(date) => setEditingCreditEntry({ ...editingCreditEntry, date: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="edit-credit-image">Update Image (Bill/Receipt)</Label>
                <Input
                  id="edit-credit-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, true)}
                />
                {editingCreditEntry.image_data && (
                  <div className="mt-2">
                    <img
                      src={editingCreditEntry.image_data}
                      alt="Preview"
                      className="max-w-full h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingCreditEntry(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCreditEntry}>Update Entry</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Bill Dialog */}
      <Dialog open={!!showPrintBill} onOpenChange={() => setShowPrintBill(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Print Customer Bill</DialogTitle>
          </DialogHeader>
          {showPrintBill && (
            <div>
              <div className="flex justify-end mb-4 no-print">
                <Button
                  onClick={() => {
                    window.print();
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Bill
                </Button>
              </div>
              <PrintBillContent 
                customer={showPrintBill} 
                entries={showPrintBill.creditEntries || creditEntries} 
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!showImagePreview} onOpenChange={() => setShowImagePreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {showImagePreview && (
            <div className="flex justify-center">
              <img
                src={showImagePreview}
                alt="Credit entry attachment"
                className="max-w-full max-h-96 object-contain rounded"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
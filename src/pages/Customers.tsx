import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer } from '../types';
import { Plus, Search, Printer } from 'lucide-react';
import { getCustomers, addCustomer, getSettings, updateCustomer, deleteCustomer } from '../lib/api';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({ name: '', phone: '', address: '', loan_balance: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  const [currency, setCurrency] = useState('USD');

  const fetchCustomers = () => {
    getCustomers().then(setCustomers).catch(console.error);
  };

  useEffect(() => {
    fetchCustomers();
    getSettings()
      .then(settings => {
        if (settings.currency) setCurrency(settings.currency);
      })
      .catch(console.error);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id, ...customerData } = formData as any;
    
    // Remove undefined and null values to prevent Firestore errors
    Object.keys(customerData).forEach(key => {
      if (customerData[key] === undefined || customerData[key] === null) {
        delete customerData[key];
      }
    });

    // Ensure required fields are present
    if (customerData.loan_balance === undefined) customerData.loan_balance = 0;

    try {
      if (editingId) {
        await updateCustomer(editingId, customerData);
      } else {
        await addCustomer(customerData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', phone: '', address: '', loan_balance: 0 });
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      alert("Failed to save customer. Please check your permissions and try again.");
    }
  };

  const handleEdit = (customer: Customer) => {
    setFormData(customer);
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer(id);
      fetchCustomers();
    }
  };

  const filteredCustomers = customers.filter(customer => 
    (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Customers</h1>
        <div className="flex w-full sm:w-auto gap-3 flex-col sm:flex-row">
          <button
            onClick={() => navigate('/print-pending-loans')}
            className="w-full sm:w-auto bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
          >
            <Printer size={20} /> Print Pending Loans
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', phone: '', address: '', loan_balance: 0 });
              setShowForm(!showForm);
            }}
            className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={20} /> Add Customer
          </button>
        </div>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Search customers..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-slate-900"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Customer' : 'New Customer'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input required type="text" className="w-full p-2 border rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="text" className="w-full p-2 border rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input type="text" className="w-full p-2 border rounded-lg" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Loan Balance</label>
              <input type="number" step="0.01" className="w-full p-2 border rounded-lg" value={formData.loan_balance} onChange={e => setFormData({...formData, loan_balance: Number(e.target.value)})} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800">{editingId ? 'Update Customer' : 'Save Customer'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Phone</th>
              <th className="p-4 font-medium">Address</th>
              <th className="p-4 font-medium text-right">Loan Balance</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map(customer => (
              <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{customer.name}</td>
                <td className="p-4 text-slate-500">{customer.phone || '-'}</td>
                <td className="p-4 text-slate-500">{customer.address || '-'}</td>
                <td className="p-4 text-right font-medium text-red-600">{formatCurrency(customer.loan_balance)}</td>
                <td className="p-4 text-right">
                  {customer.loan_balance > 0 && (
                    <button onClick={() => navigate(`/loan-receipt/${customer.id}?print=true`)} className="text-emerald-600 hover:text-emerald-800 mr-3 text-sm font-medium" title="Print Loan Statement">
                      <Printer size={16} className="inline mr-1" />Print Statement
                    </button>
                  )}
                  <button onClick={() => handleEdit(customer)} className="text-blue-600 hover:text-blue-800 mr-3 text-sm font-medium">Edit</button>
                  <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No customers found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

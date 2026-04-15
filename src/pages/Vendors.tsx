import React, { useState, useEffect } from 'react';
import { Vendor } from '../types';
import { Plus } from 'lucide-react';
import { getVendors, addVendor, getSettings, updateVendor, deleteVendor } from '../lib/api';

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Vendor>>({ name: '', phone: '', address: '', balance: 0 });

  const [currency, setCurrency] = useState('USD');

  const fetchVendors = () => {
    getVendors().then(setVendors).catch(console.error);
  };

  useEffect(() => {
    fetchVendors();
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
    const { id, ...vendorData } = formData as any;
    
    // Remove undefined and null values to prevent Firestore errors
    Object.keys(vendorData).forEach(key => {
      if (vendorData[key] === undefined || vendorData[key] === null) {
        delete vendorData[key];
      }
    });

    // Ensure required fields are present
    if (vendorData.balance === undefined) vendorData.balance = 0;

    try {
      if (editingId) {
        await updateVendor(editingId, vendorData);
      } else {
        await addVendor(vendorData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', phone: '', address: '', balance: 0 });
      fetchVendors();
    } catch (error) {
      console.error("Error saving vendor:", error);
      alert("Failed to save vendor. Please check your permissions and try again.");
    }
  };

  const handleEdit = (vendor: Vendor) => {
    setFormData(vendor);
    setEditingId(vendor.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      await deleteVendor(id);
      fetchVendors();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Vendors</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', phone: '', address: '', balance: 0 });
            setShowForm(!showForm);
          }}
          className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
        >
          <Plus size={20} /> Add Vendor
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Vendor' : 'New Vendor'}</h2>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Balance</label>
              <input type="number" step="0.01" className="w-full p-2 border rounded-lg" value={formData.balance} onChange={e => setFormData({...formData, balance: Number(e.target.value)})} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800">{editingId ? 'Update Vendor' : 'Save Vendor'}</button>
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
              <th className="p-4 font-medium text-right">Balance to Pay</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.map(vendor => (
              <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{vendor.name}</td>
                <td className="p-4 text-slate-500">{vendor.phone || '-'}</td>
                <td className="p-4 text-slate-500">{vendor.address || '-'}</td>
                <td className="p-4 text-right font-medium text-orange-600">{formatCurrency(vendor.balance)}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleEdit(vendor)} className="text-blue-600 hover:text-blue-800 mr-3 text-sm font-medium">Edit</button>
                  <button onClick={() => handleDelete(vendor.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No vendors found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

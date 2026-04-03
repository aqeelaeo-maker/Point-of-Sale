import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '../types';
import { Plus, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getProducts, addProduct, addProductsBulk, getSettings } from '../lib/api';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', barcode: '', unit: 'piece', cost_price: 0, price_per_unit: 0, stock: 0, batch_number: '', expiry_date: ''
  });

  const [search, setSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      p.barcode?.includes(lowerSearch)
    );
  }, [products, search]);
  const [currency, setCurrency] = useState('USD');

  const fetchProducts = () => {
    getProducts().then(setProducts);
  };

  useEffect(() => {
    fetchProducts();
    getSettings()
      .then(settings => {
        if (settings.currency) setCurrency(settings.currency);
      })
      .catch(console.error);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Send data to backend
        await addProductsBulk(data);
        
        fetchProducts();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        alert('Products imported successfully!');
      } catch (error) {
        console.error('Error importing products:', error);
        alert('Failed to import products. Please check the file format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addProduct(formData);
    setShowForm(false);
    setFormData({ name: '', barcode: '', unit: 'piece', cost_price: 0, price_per_unit: 0, stock: 0, batch_number: '', expiry_date: '' });
    fetchProducts();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Products Inventory</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full sm:w-64 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <Upload size={20} /> Import Excel
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={20} /> Add Product
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold mb-4">New Product</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input required type="text" className="w-full p-2 border rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
              <input type="text" className="w-full p-2 border rounded-lg" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select className="w-full p-2 border rounded-lg" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                <option value="piece">Piece</option>
                <option value="kg">Kg</option>
                <option value="liter">Liter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
              <input required type="number" step="0.01" className="w-full p-2 border rounded-lg" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price</label>
              <input required type="number" step="0.01" className="w-full p-2 border rounded-lg" value={formData.price_per_unit} onChange={e => setFormData({...formData, price_per_unit: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Initial Stock</label>
              <input required type="number" step="0.01" className="w-full p-2 border rounded-lg" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
              <input type="text" className="w-full p-2 border rounded-lg" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
              <input type="date" className="w-full p-2 border rounded-lg" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
            </div>
            <div className="lg:col-span-3 flex justify-end mt-4">
              <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800">Save Product</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Barcode</th>
              <th className="p-4 font-medium">Cost</th>
              <th className="p-4 font-medium">Selling Price</th>
              <th className="p-4 font-medium">Stock</th>
              <th className="p-4 font-medium">Batch</th>
              <th className="p-4 font-medium">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{product.name}</td>
                <td className="p-4 text-slate-500 font-mono text-sm">{product.barcode || '-'}</td>
                <td className="p-4 text-slate-600 font-medium">{formatCurrency(product.cost_price || 0)}</td>
                <td className="p-4 text-emerald-600 font-medium">{formatCurrency(product.price_per_unit)} / {product.unit}</td>
                <td className="p-4 text-slate-700">{product.stock} {product.unit}</td>
                <td className="p-4 text-slate-500">{product.batch_number || '-'}</td>
                <td className="p-4 text-slate-500">{product.expiry_date || '-'}</td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

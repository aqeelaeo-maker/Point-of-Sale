import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '../types';
import { Plus, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getProducts, addProduct, addProductsBulk, getSettings, updateProduct, deleteProduct } from '../lib/api';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', barcode: '', unit: 'piece', has_sub_unit: false, sub_unit: '', conversion_rate: 1, cost_price: 0, price_per_unit: 0, stock: 0
  });

  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [availableUnits, setAvailableUnits] = useState<string[]>(['piece', 'kg', 'liter']);

  const filteredProducts = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      p.barcode?.includes(lowerSearch)
    );
  }, [products, search]);
  const [currency, setCurrency] = useState('USD');

  const fetchProducts = () => {
    getProducts().then(setProducts).catch(console.error);
  };

  useEffect(() => {
    fetchProducts();
    getSettings()
      .then(settings => {
        if (settings.currency) setCurrency(settings.currency);
        if (settings.units) {
          const parsedUnits = settings.units.split(',').map((u: string) => u.trim()).filter(Boolean);
          if (parsedUnits.length > 0) {
            setAvailableUnits(parsedUnits);
            // Update default unit in form data if current is not in list
            setFormData(prev => ({
              ...prev,
              unit: parsedUnits.includes(prev.unit as string) ? prev.unit : parsedUnits[0]
            }));
          }
        }
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
    if (editingId) {
      await updateProduct(editingId, formData);
    } else {
      await addProduct(formData);
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', barcode: '', unit: availableUnits[0] || 'piece', cost_price: 0, price_per_unit: 0, stock: 0, batch_number: '', expiry_date: '', has_sub_unit: false, sub_unit: '', conversion_rate: 1 });
    fetchProducts();
  };

  const handleEdit = (product: Product) => {
    setFormData(product);
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      fetchProducts();
    }
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
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', barcode: '', unit: availableUnits[0] || 'piece', cost_price: 0, price_per_unit: 0, stock: 0, batch_number: '', expiry_date: '', has_sub_unit: false, sub_unit: '', conversion_rate: 1 });
              setShowForm(!showForm);
            }}
            className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <Plus size={20} /> Add Product
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Product' : 'New Product'}</h2>
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
                {availableUnits.map(u => (
                  <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-3 border-t border-slate-200 pt-4 mt-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-4 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" checked={formData.has_sub_unit} onChange={e => setFormData({...formData, has_sub_unit: e.target.checked})} />
                Enable Sub-units (e.g., 1 Box = 10 Pieces, 1 Liter = 1000 ml)
              </label>
              
              {formData.has_sub_unit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub-unit Name</label>
                    <input type="text" placeholder="e.g., ml, gm, piece" className="w-full p-2 border rounded-lg" value={formData.sub_unit} onChange={e => setFormData({...formData, sub_unit: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Conversion Rate</label>
                    <input type="number" min="1" step="any" className="w-full p-2 border rounded-lg" value={formData.conversion_rate} onChange={e => setFormData({...formData, conversion_rate: Number(e.target.value)})} />
                  </div>
                </div>
              )}
            </div>
            <div className="lg:col-span-3 flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800">{editingId ? 'Update Product' : 'Save Product'}</button>
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
              <th className="p-4 font-medium">Unit</th>
              <th className="p-4 font-medium">Sub-unit</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{product.name}</td>
                <td className="p-4 text-slate-500 font-mono text-sm">{product.barcode || '-'}</td>
                <td className="p-4 text-slate-600">{product.unit}</td>
                <td className="p-4 text-slate-600">
                  {product.has_sub_unit ? `1 ${product.unit} = ${product.conversion_rate} ${product.sub_unit}` : '-'}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-800 mr-3 text-sm font-medium">Edit</button>
                  <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

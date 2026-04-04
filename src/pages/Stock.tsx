import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import { getProducts, updateProduct, getSettings } from '../lib/api';
import { Search, Edit } from 'lucide-react';

export default function Stock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    add_stock: 0,
    cost_price: 0,
    price_per_unit: 0,
    batch_number: '',
    expiry_date: ''
  });
  const [currency, setCurrency] = useState('USD');

  const fetchProducts = () => {
    getProducts().then(setProducts).catch(console.error);
  };

  useEffect(() => {
    fetchProducts();
    getSettings()
      .then(settings => {
        if (settings.currency) setCurrency(settings.currency);
      })
      .catch(console.error);
  }, []);

  const filteredProducts = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      p.barcode?.includes(lowerSearch)
    );
  }, [products, search]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      add_stock: 0,
      cost_price: product.cost_price || 0,
      price_per_unit: product.price_per_unit || 0,
      batch_number: product.batch_number || '',
      expiry_date: product.expiry_date || ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const newStock = (editingProduct.stock || 0) + formData.add_stock;

    await updateProduct(editingProduct.id, {
      stock: newStock,
      cost_price: formData.cost_price,
      price_per_unit: formData.price_per_unit,
      batch_number: formData.batch_number,
      expiry_date: formData.expiry_date
    });

    setEditingProduct(null);
    fetchProducts();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Stock Management</h1>
        <div className="w-full sm:w-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full sm:w-64 pl-10 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Update Stock: {editingProduct.name}</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Current Stock:</span>
                <span className="text-xl font-bold text-slate-900">{editingProduct.stock} {editingProduct.unit}</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Add Stock (+)</label>
                <input required type="number" step="any" className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={formData.add_stock} onChange={e => setFormData({...formData, add_stock: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
                <input required type="number" step="0.01" className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price</label>
                <input required type="number" step="0.01" className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={formData.price_per_unit} onChange={e => setFormData({...formData, price_per_unit: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
                <input type="text" className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                <input type="date" className="w-full p-2 border rounded-lg focus:ring-emerald-500 focus:border-emerald-500" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100">Cancel</button>
                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Barcode</th>
              <th className="p-4 font-medium">Stock</th>
              <th className="p-4 font-medium">Cost</th>
              <th className="p-4 font-medium">Selling Price</th>
              <th className="p-4 font-medium">Batch</th>
              <th className="p-4 font-medium">Expiry</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{product.name}</td>
                <td className="p-4 text-slate-500 font-mono text-sm">{product.barcode || '-'}</td>
                <td className="p-4 text-slate-700 font-medium">
                  {product.stock} {product.unit}
                  {product.has_sub_unit && product.conversion_rate && (
                    <div className="text-xs text-slate-500 mt-1">
                      ({(product.stock * product.conversion_rate).toFixed(2)} {product.sub_unit})
                    </div>
                  )}
                </td>
                <td className="p-4 text-slate-600">{formatCurrency(product.cost_price || 0)}</td>
                <td className="p-4 text-emerald-600 font-medium">
                  {formatCurrency(product.price_per_unit || 0)} / {product.unit}
                </td>
                <td className="p-4 text-slate-500">{product.batch_number || '-'}</td>
                <td className="p-4 text-slate-500">{product.expiry_date || '-'}</td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleEdit(product)} 
                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 text-sm font-medium bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Edit size={16} /> Update
                  </button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">No products found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

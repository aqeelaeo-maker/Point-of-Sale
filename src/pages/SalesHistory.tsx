import React, { useState, useEffect } from 'react';
import { Search, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getSales, getSettings, getCustomers } from '../lib/api';

export default function SalesHistory() {
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const [currency, setCurrency] = useState('USD');

  const fetchSales = async (query: string = '') => {
    try {
      const allSales = await getSales();
      const allCustomers = await getCustomers();
      setCustomers(allCustomers);
      
      const filtered = allSales.filter(sale => {
        const customer = allCustomers.find(c => c.id === sale.customer_id);
        const customerName = customer ? customer.name : 'Walk-in';
        sale.customer_name = customerName; // attach for rendering
        
        if (!query) return true;
        const q = query.toLowerCase();
        return sale.id.toString().includes(q) || customerName.toLowerCase().includes(q);
      });
      setSales(filtered);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSales(search);
  }, [search]);

  useEffect(() => {
    getSettings()
      .then(settings => {
        if (settings.currency) setCurrency(settings.currency);
      })
      .catch(console.error);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Sales & Invoices</h1>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 md:mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by Invoice ID or Customer Name..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm uppercase tracking-wider">
              <th className="p-4 font-medium">Invoice ID</th>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Customer</th>
              <th className="p-4 font-medium text-right">Total Amount</th>
              <th className="p-4 font-medium text-right">Paid Amount</th>
              <th className="p-4 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map(sale => (
              <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-slate-900 font-medium">#{sale.id.toString().padStart(6, '0')}</td>
                <td className="p-4 text-slate-500">{format(new Date(sale.date), 'PP p')}</td>
                <td className="p-4 text-slate-700">{sale.customer_name || 'Walk-in'}</td>
                <td className="p-4 text-right font-medium text-slate-900">{formatCurrency(sale.total_amount)}</td>
                <td className="p-4 text-right text-emerald-600 font-medium">{formatCurrency(sale.paid_amount)}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => navigate(`/invoice/${sale.id}`)}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FileText size={16} /> View Invoice
                  </button>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">No sales found matching your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

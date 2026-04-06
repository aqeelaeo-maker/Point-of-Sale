import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Truck, DollarSign, AlertTriangle, Clock, X } from 'lucide-react';
import { getAnalytics, getSettings, getProducts } from '../lib/api';
import { Product } from '../types';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [lowStockLimits, setLowStockLimits] = useState<Record<string, number>>({});
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showExpiringModal, setShowExpiringModal] = useState(false);

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(console.error);
      
    getSettings()
      .then(settings => {
        if (settings.currency) setCurrency(settings.currency);
        if (settings.low_stock_limits) {
          try {
            setLowStockLimits(JSON.parse(settings.low_stock_limits));
          } catch (e) {}
        } else if (settings.low_stock_limit) {
          // Fallback for old setting
          const defaultLimits: Record<string, number> = {};
          const parsedUnits = (settings.units || 'piece, kg, liter').split(',').map((u:string) => u.trim()).filter(Boolean);
          parsedUnits.forEach((u:string) => defaultLimits[u] = Number(settings.low_stock_limit));
          setLowStockLimits(defaultLimits);
        }
      })
      .catch(console.error);

    getProducts()
      .then(setProducts)
      .catch(console.error);
  }, []);

  if (!data) return <div className="p-8">Loading dashboard...</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const lowStockProducts = products.filter(p => {
    const limit = lowStockLimits[p.unit] !== undefined ? lowStockLimits[p.unit] : 10;
    return p.stock <= limit;
  });
  
  const today = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  
  const expiringProducts = products.filter(p => {
    if (!p.expiry_date) return false;
    const expDate = new Date(p.expiry_date);
    return expDate <= thirtyDaysFromNow;
  });

  const stats = [
    { title: 'Total Revenue (30d)', value: formatCurrency(data.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: 'Total Profit (30d)', value: formatCurrency(data.totalProfit), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Customer Loans', value: formatCurrency(data.totalLoans), icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'Vendor Balances', value: formatCurrency(data.totalVendorBalance), icon: Truck, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Low Stock Items', value: lowStockProducts.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', onClick: () => setShowLowStockModal(true) },
    { title: 'Expiring Soon', value: expiringProducts.length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100', onClick: () => setShowExpiringModal(true) },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2">Overview of your store's performance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div 
              key={i} 
              onClick={stat.onClick}
              className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 ${stat.onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
            >
              <div className={`p-4 rounded-xl ${stat.bg}`}>
                <Icon className={stat.color} size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Revenue & Cost (Last 30 Days)</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Cost" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Profit Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.salesData.map((d: any) => ({ ...d, profit: d.revenue - d.cost }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                <Tooltip cursor={{stroke: '#cbd5e1', strokeWidth: 2}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showLowStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Low Stock Items</h2>
              <button onClick={() => setShowLowStockModal(false)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                    <th className="p-3 font-medium">Product</th>
                    <th className="p-3 font-medium">Barcode</th>
                    <th className="p-3 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockProducts.map(p => (
                    <tr key={p.id}>
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-slate-500">{p.barcode || '-'}</td>
                      <td className="p-3 text-red-600 font-bold">{p.stock} {p.unit}</td>
                    </tr>
                  ))}
                  {lowStockProducts.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-500">No low stock items.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showExpiringModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">Expiring Soon (Next 30 Days)</h2>
              <button onClick={() => setShowExpiringModal(false)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                    <th className="p-3 font-medium">Product</th>
                    <th className="p-3 font-medium">Batch</th>
                    <th className="p-3 font-medium">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiringProducts.map(p => {
                    const isExpired = new Date(p.expiry_date) < new Date();
                    return (
                      <tr key={p.id}>
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-slate-500">{p.batch_number || '-'}</td>
                        <td className={`p-3 font-bold ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                          {p.expiry_date} {isExpired && '(Expired)'}
                        </td>
                      </tr>
                    );
                  })}
                  {expiringProducts.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-slate-500">No expiring items.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

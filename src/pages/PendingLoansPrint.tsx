import React, { useEffect, useState } from 'react';
import { getCustomers, getSettings } from '../lib/api';
import { Customer } from '../types';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

export default function PendingLoansPrint() {
  const navigate = useNavigate();
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'a4' | 'thermal80'>('a4');

  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
    getCustomers().then(data => {
      // Filter customers with loan > 0 and sort by highest loan first
      const pending = data
        .filter(c => (c.loan_balance || 0) > 0)
        .sort((a, b) => (b.loan_balance || 0) - (a.loan_balance || 0));
      setCustomers(pending);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (customers.length > 0 && settings) {
      const searchParams = new URLSearchParams(location.search);
      // Auto-print only if we explicitly requested it via URL param, otherwise just display
      if (searchParams.get('print') === 'true') {
        setTimeout(() => {
          window.print();
        }, 500); // Give it a moment to render
      }
    }
  }, [customers, settings, location]);

  const handlePrint = () => {
    window.print();
  };

  if (!settings || customers.length === 0) return <div className="p-8 text-center">Loading list...</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: settings.currency || 'USD' }).format(amount);
  };

  const totalPending = customers.reduce((sum, c) => sum + (c.loan_balance || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white flex flex-col items-center">
      {/* Controls - Hidden when printing */}
      <div className="w-full mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden" style={{ maxWidth: printMode === 'a4' ? '56rem' : '80mm' }}>
        <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft size={20} /> Back to Customers
        </button>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            className="p-2 border rounded-lg bg-white w-full sm:w-auto text-sm"
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value as 'a4' | 'thermal80')}
          >
            <option value="a4">Full Page (A4)</option>
            <option value="thermal80">Thermal Receipt (80mm)</option>
          </select>
          <button 
            onClick={handlePrint}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors whitespace-nowrap"
          >
            <Printer size={20} /> Print Report
          </button>
        </div>
      </div>

      <div 
        className="bg-white text-slate-900 mx-auto" 
        style={
          printMode === 'a4' 
            ? { width: '100%', maxWidth: '56rem', padding: '2rem', minHeight: '100vh', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } 
            : { width: '80mm', minHeight: 'auto', padding: '8mm', paddingBottom: '20mm', margin: '0 auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
        }
      >
        <div className={`text-center ${printMode === 'a4' ? 'mb-8 border-b pb-6' : 'mb-4 border-b border-dashed border-slate-400 pb-4'}`}>
          {settings.invoice_header_type === 'logo' && settings.store_logo ? (
            <img src={settings.store_logo} alt="Store Logo" className={`mx-auto object-contain ${printMode === 'a4' ? 'max-h-24 mb-4' : 'max-h-16 mb-2'}`} />
          ) : (
            <h1 className={`${printMode === 'a4' ? 'text-3xl' : 'text-xl'} font-bold mb-1`}>
              {settings.store_name?.toUpperCase() || 'STORE NAME'}
            </h1>
          )}
          <p className={`${printMode === 'a4' ? 'text-lg text-slate-500' : 'text-xs text-slate-600'}`}>{settings.store_address}</p>
          <p className={`${printMode === 'a4' ? 'text-lg text-slate-500' : 'text-xs text-slate-600'}`}>{settings.store_phone}</p>
        </div>

        <div className={`${printMode === 'a4' ? 'mb-6 flex justify-between items-end border-b pb-4' : 'mb-3 flex flex-col items-center gap-1 border-b border-dashed border-slate-400 pb-3'}`}>
          <div className={printMode === 'a4' ? '' : 'text-center'}>
            <h2 className={`${printMode === 'a4' ? 'text-2xl' : 'text-lg uppercase'} font-bold text-slate-800`}>Pending Loans</h2>
            <p className={`${printMode === 'a4' ? 'text-slate-500' : 'text-xs text-slate-600'}`}>Date: {new Date().toLocaleDateString()}</p>
          </div>
          {printMode === 'a4' && (
            <div className="text-right">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalPending)}</p>
            </div>
          )}
        </div>

        {printMode === 'a4' ? (
          // A4 Layout
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-3 px-2 font-bold text-slate-700">#</th>
                  <th className="py-3 px-2 font-bold text-slate-700">Customer Name</th>
                  <th className="py-3 px-2 font-bold text-slate-700">Phone Number</th>
                  <th className="py-3 px-2 font-bold text-right text-slate-700">Pending Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c, index) => (
                  <tr key={c.id}>
                    <td className="py-3 px-2 text-slate-500">{index + 1}</td>
                    <td className="py-3 px-2 font-medium">{c.name}</td>
                    <td className="py-3 px-2 text-slate-600">{c.phone || '-'}</td>
                    <td className="py-3 px-2 text-right font-bold text-red-600">{formatCurrency(c.loan_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          // Thermal Layout (80mm)
          <>
            <div className="w-full text-sm">
              <div className="flex justify-between font-bold border-b border-slate-300 pb-1 mb-2 text-xs uppercase">
                <span className="w-8">#</span>
                <span className="flex-1">Customer / Phone</span>
                <span className="text-right">Amount</span>
              </div>
              
              <div className="space-y-2 mb-4">
                {customers.map((c, index) => (
                  <div key={c.id} className="flex justify-between items-start text-xs border-b border-dashed border-slate-200 pb-1">
                    <span className="w-6 text-slate-500">{index + 1}.</span>
                    <div className="flex-1 pr-2 leading-tight">
                      <div className="font-bold">{c.name}</div>
                      {c.phone && <div className="text-[10px] text-slate-500">{c.phone}</div>}
                    </div>
                    <span className="text-right font-bold whitespace-nowrap">{formatCurrency(c.loan_balance)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t-2 border-slate-800 pt-2 flex justify-between items-end mb-4">
                <span className="font-bold text-sm uppercase">Total</span>
                <span className="text-lg font-bold">{formatCurrency(totalPending)}</span>
              </div>
              
              <div className="text-center text-[10px] text-slate-500 mt-6 border-t border-dashed border-slate-400 pt-4">
                Report generated on {new Date().toLocaleString()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Print only styles */}
      <style>{`
        @media print {
          body { 
            background: white; 
            margin: 0;
            padding: 0;
          }
          @page {
            size: ${printMode === 'a4' ? 'A4' : '80mm auto'};
            margin: ${printMode === 'a4' ? '20mm' : '0'};
          }
          /* Hide sidebar and any wrappers from main app layout */
          nav, aside, .sidebar { display: none !important; }
        }
      `}</style>
    </div>
  );
}

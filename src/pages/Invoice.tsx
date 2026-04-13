import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sale } from '../types';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import { getSaleById, getSettings, getCustomers, getProducts } from '../lib/api';

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState({ store_name: 'GROCERY STORE', store_address: '', store_phone: '', store_logo: '' });
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        const [saleData, customers, products] = await Promise.all([
          getSaleById(id),
          getCustomers(),
          getProducts()
        ]);
        
        const customer = customers.find(c => c.id === saleData.customer_id);
        
        // Fallback for older sales that didn't store product_name and unit
        const enrichedItems = saleData.items.map((item: any) => {
          if (!item.product_name || !item.unit) {
            const product = products.find(p => p.id === item.product_id);
            return {
              ...item,
              product_name: item.product_name || (product ? product.name : 'Unknown Product'),
              unit: item.unit || (product ? product.unit : '')
            };
          }
          return item;
        });

        setSale({ ...saleData, items: enrichedItems, customer } as any);
      } catch (error) {
        console.error(error);
      }
    };
    
    fetchData();
      
    getSettings()
      .then(data => {
        setSettings({
          store_name: data.store_name || 'GROCERY STORE',
          store_address: data.store_address || '',
          store_phone: data.store_phone || '',
          store_logo: data.store_logo || ''
        });
        if (data.currency) setCurrency(data.currency);
      })
      .catch(console.error);
  }, [id]);

  if (!sale) return <div className="p-8">Loading invoice...</div>;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white flex flex-col items-center">
      {/* Controls - Hidden when printing */}
      <div className="w-full max-w-2xl mb-6 md:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft size={20} /> Back to POS
        </button>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            className="p-2 border rounded-lg bg-white w-full sm:w-auto"
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value as 'thermal' | 'a4')}
          >
            <option value="thermal">Thermal Receipt (80mm)</option>
            <option value="a4">Full Page (A4)</option>
          </select>
          <button 
            onClick={handlePrint}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 w-full sm:w-auto"
          >
            <Printer size={20} /> Print
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div className={`bg-white shadow-xl print:shadow-none ${printMode === 'thermal' ? 'w-[80mm] p-4 text-sm' : 'w-[210mm] min-h-[297mm] p-12'}`}>
        
        {/* Header */}
        <div className={`text-center ${printMode === 'a4' ? 'mb-12' : 'mb-6'}`}>
          {settings.store_logo && (
            <img src={settings.store_logo} alt="Logo" className={`mx-auto object-contain ${printMode === 'a4' ? 'h-24 mb-4' : 'h-12 mb-2'}`} />
          )}
          <h1 className={`font-bold ${printMode === 'a4' ? 'text-4xl' : 'text-xl'}`}>{settings.store_name}</h1>
          <p className="text-slate-500 mt-1">{settings.store_address}</p>
          <p className="text-slate-500">Tel: {settings.store_phone}</p>
        </div>

        {/* Invoice Info */}
        <div className={`flex justify-between border-b border-slate-200 pb-4 ${printMode === 'a4' ? 'mb-8' : 'mb-4 text-xs'}`}>
          <div>
            <p><span className="font-semibold">Invoice No:</span> #{sale.id?.toString().padStart(6, '0')}</p>
            <p><span className="font-semibold">Date:</span> {sale.date ? format(new Date(sale.date), 'PP p') : ''}</p>
          </div>
          <div className="text-right">
            <p><span className="font-semibold">Customer:</span> {sale.customer?.name || 'Walk-in'}</p>
            {sale.customer && <p className="text-slate-500">{sale.customer.phone}</p>}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left mb-8">
          <thead>
            <tr className="border-b border-slate-900">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 font-semibold text-right">Qty</th>
              <th className="py-2 font-semibold text-right">Price</th>
              <th className="py-2 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody className={`${printMode === 'thermal' ? 'text-xs' : ''}`}>
            {sale.items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-100">
                <td className="py-2">{item.product_name}</td>
                <td className="py-2 text-right">{item.quantity} {item.unit}</td>
                <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-2 text-right">{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className={`${printMode === 'a4' ? 'w-1/2' : 'w-full'}`}>
            <div className="flex justify-between py-2 text-slate-600">
              <span>Current Sale:</span>
              <span>{formatCurrency(sale.total_amount)}</span>
            </div>
            {(sale.previous_loan || 0) > 0 && (
              <div className="flex justify-between py-2 text-slate-600">
                <span>Previous Loan:</span>
                <span>{formatCurrency(sale.previous_loan || 0)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 text-xl font-bold border-t border-slate-900">
              <span>Total Due:</span>
              <span>{formatCurrency(sale.total_due ?? sale.total_amount)}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600">
              <span>Paid Amount:</span>
              <span>{formatCurrency(sale.paid_amount)}</span>
            </div>
            
            {sale.paid_amount > (sale.total_due ?? sale.total_amount) && (
              <div className="flex justify-between py-2 text-emerald-600 font-semibold">
                <span>Change:</span>
                <span>{formatCurrency(sale.paid_amount - (sale.total_due ?? sale.total_amount))}</span>
              </div>
            )}
            
            {(sale.total_due ?? sale.total_amount) > sale.paid_amount && (
              <div className="flex justify-between py-2 text-red-600 font-semibold border-t border-slate-200 mt-2">
                <span>Remaining Loan:</span>
                <span>{formatCurrency((sale.total_due ?? sale.total_amount) - sale.paid_amount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>Thank you for your business!</p>
          <p>Please keep this receipt for your records.</p>
        </div>
        
        {/* Invisible element to trigger auto-cut on thermal printers */}
        <div className="print:break-after-page"></div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .bg-white.shadow-xl {
            visibility: visible;
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
          }
          .bg-white.shadow-xl * {
            visibility: visible;
          }
          .print\\:break-after-page {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Customer } from '../types';
import { format } from 'date-fns';
import { Printer, ArrowLeft } from 'lucide-react';
import { getCustomers, getSettings } from '../lib/api';

export default function LoanReceipt() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState({ store_name: 'GROCERY STORE', store_address: '', store_phone: '', store_logo: '', invoice_header_type: 'name' });
  const [printMode, setPrintMode] = useState<'thermal80' | 'a4'>('thermal80');
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (!customerId) return;
    
    const fetchData = async () => {
      try {
        const customers = await getCustomers();
        const found = customers.find(c => c.id === customerId);
        if (found) {
          setCustomer(found);
        }
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
          store_logo: data.store_logo || '',
          invoice_header_type: data.invoice_header_type || 'name'
        });
        if (data.currency) setCurrency(data.currency);
      })
      .catch(console.error);
  }, [customerId]);

  if (!customer) return <div className="p-8">Loading customer details...</div>;

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
        <button onClick={() => navigate('/pos')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowLeft size={20} /> Back to POS
        </button>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            className="p-2 border rounded-lg bg-white w-full sm:w-auto"
            value={printMode}
            onChange={(e) => setPrintMode(e.target.value as 'thermal80' | 'a4')}
          >
            <option value="thermal80">Thermal Receipt (80mm)</option>
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
      <div className={`bg-white shadow-xl print:shadow-none mx-auto ${
        printMode === 'thermal80'
          ? 'w-[80mm] p-4 text-sm text-black font-bold font-mono tracking-tight leading-tight'
          : 'w-[210mm] min-h-[297mm] p-12 font-sans'
      }`}>
        
        {/* Header */}
        <div className={`text-center ${printMode === 'a4' ? 'mb-12' : 'mb-4'}`}>
          {settings.invoice_header_type === 'logo' && settings.store_logo ? (
            <img src={settings.store_logo} alt="Logo" className={`mx-auto object-contain ${printMode === 'a4' ? 'h-32 mb-6' : 'h-28 max-w-[90%] mb-3 grayscale contrast-125'}`} />
          ) : (
            <h1 className={`font-black ${printMode === 'a4' ? 'text-4xl' : 'text-2xl uppercase tracking-widest'}`}>{settings.store_name}</h1>
          )}
          <p className={`${printMode.startsWith('thermal') ? 'text-black font-bold text-[10px] sm:text-xs mt-1' : 'text-slate-500 mt-1'}`}>{settings.store_address}</p>
          <p className={`${printMode.startsWith('thermal') ? 'text-black font-bold text-[10px] sm:text-xs' : 'text-slate-500'}`}>Tel: {settings.store_phone}</p>
        </div>

        {/* Invoice Info */}
        <div className={`flex justify-between pb-3 ${printMode === 'a4' ? 'mb-8 border-b border-slate-200' : 'mb-3 text-[10px] sm:text-xs border-b-2 border-dashed border-black'}`}>
          <div>
            <p><span className={`${printMode === 'a4' ? 'font-semibold' : 'font-black'}`}>Statement Date:</span> {format(new Date(), printMode === 'thermal80' ? 'dd/MM/yy HH:mm' : 'PP p')}</p>
          </div>
          <div className="text-right">
            <p><span className={`${printMode === 'a4' ? 'font-semibold' : 'font-black'}`}>Cust:</span> {customer.name}</p>
            {customer.phone && <p className={`${printMode.startsWith('thermal') ? 'text-black' : 'text-slate-500'}`}>{customer.phone}</p>}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className={`${printMode === 'a4' ? 'text-2xl font-bold text-slate-800' : 'text-lg font-black uppercase'}`}>Loan Balance Statement</h2>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className={`${printMode === 'a4' ? 'w-1/2' : 'w-full'}`}>
            <div className={`flex justify-between py-2 ${printMode === 'thermal80' ? 'text-xl' : 'text-2xl'} font-black ${printMode.startsWith('thermal') ? 'border-y-2 border-black border-dashed' : 'border-y border-slate-900 bg-slate-50 p-4'}`}>
              <span>Pending Loan:</span>
              <span>{formatCurrency(customer.loan_balance || 0)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`mt-12 text-center ${printMode === 'thermal80' ? 'text-[10px]' : 'text-sm'} ${printMode.startsWith('thermal') ? 'text-black font-bold' : 'text-slate-500'}`}>
          <p>Thank you for your business!</p>
          <p className="mt-2 font-medium">Software Developed By 0332-5059526</p>
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

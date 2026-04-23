import React, { useState, useEffect } from 'react';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';
import { getSettings, updateSettings } from '../lib/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_logo: '',
    currency: 'USD',
    language: 'en',
    units: 'piece, kg, liter',
    invoice_header_type: 'name',
    dashboard_pin: ''
  });
  const [lowStockLimits, setLowStockLimits] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getSettings()
      .then(data => {
        setSettings({
          store_name: data.store_name || '',
          store_address: data.store_address || '',
          store_phone: data.store_phone || '',
          store_logo: data.store_logo || '',
          currency: data.currency || 'USD',
          language: data.language || 'en',
          units: data.units || 'piece, kg, liter',
          invoice_header_type: data.invoice_header_type || 'name',
          dashboard_pin: data.dashboard_pin || ''
        });
        
        if (data.low_stock_limits) {
          try {
            setLowStockLimits(JSON.parse(data.low_stock_limits));
          } catch (e) {}
        } else if (data.low_stock_limit) {
          const parsedUnits = (data.units || 'piece, kg, liter').split(',').map((u:string) => u.trim()).filter(Boolean);
          const defaultLimits: Record<string, number> = {};
          parsedUnits.forEach((u:string) => defaultLimits[u] = Number(data.low_stock_limit));
          setLowStockLimits(defaultLimits);
        }
      });
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, store_logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      const res = await updateSettings({
        ...settings,
        low_stock_limits: JSON.stringify(lowStockLimits)
      });
      
      if (res.success) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch (error) {
      setMessage('An error occurred while saving.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Store Settings</h1>
        <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2">Manage your store details for invoices and receipts.</p>
      </div>

      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Store Logo</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden">
                {settings.store_logo ? (
                  <img src={settings.store_logo} alt="Store Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="text-slate-400" size={32} />
                )}
              </div>
              <div>
                <label className="cursor-pointer bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium">
                  <Upload size={16} />
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                <p className="text-xs text-slate-500 mt-2">Recommended size: 200x200px. Max 1MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Store Name</label>
            <input 
              required 
              type="text" 
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
              value={settings.store_name} 
              onChange={e => setSettings({...settings, store_name: e.target.value})} 
              placeholder="e.g. GROCERY STORE"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Contact Number</label>
            <input 
              required 
              type="text" 
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
              value={settings.store_phone} 
              onChange={e => setSettings({...settings, store_phone: e.target.value})} 
              placeholder="e.g. +1 234 567 8900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Store Address</label>
            <textarea 
              required 
              rows={3}
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none" 
              value={settings.store_address} 
              onChange={e => setSettings({...settings, store_address: e.target.value})} 
              placeholder="e.g. 123 Market Street, City, Country"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Product Units (comma separated)</label>
              <input 
                type="text" 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                value={settings.units} 
                onChange={e => setSettings({...settings, units: e.target.value})} 
                placeholder="e.g. piece, kg, liter, box, pack"
              />
              <p className="text-xs text-slate-500 mt-2">These units will be available when adding or editing products.</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Low Stock Thresholds (per unit)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {settings.units.split(',').map(u => u.trim()).filter(Boolean).map(unit => (
                  <div key={unit} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="block text-xs font-medium text-slate-500 mb-1 capitalize">{unit}</label>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                      value={lowStockLimits[unit] ?? 10} 
                      onChange={e => setLowStockLimits({...lowStockLimits, [unit]: Number(e.target.value)})} 
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Products with stock at or below these numbers will trigger a low stock alert on the dashboard.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
              <select 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                value={settings.currency}
                onChange={e => setSettings({...settings, currency: e.target.value})}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="SAR">SAR (﷼)</option>
                <option value="PKR">PKR (₨)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Header Display</label>
              <select 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                value={settings.invoice_header_type}
                onChange={e => setSettings({...settings, invoice_header_type: e.target.value})}
              >
                <option value="name">Store Name</option>
                <option value="logo">Store Logo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
              <select 
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                value={settings.language}
                onChange={e => setSettings({...settings, language: e.target.value})}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
                <option value="ur">اردو</option>
                <option value="hi">हिन्दी</option>
                <option value="zh">中文</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Dashboard PIN Options</label>
              <input 
                type="text" 
                maxLength={4}
                pattern="\d{4}"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                value={settings.dashboard_pin} 
                onChange={e => setSettings({...settings, dashboard_pin: e.target.value.replace(/\D/g, '')})} 
                placeholder="Leave blank to disable (4 digits)"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            <span className={`text-sm font-medium ${message.includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>
              {message}
            </span>
            <button 
              type="submit" 
              disabled={saving}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-70"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Product, Customer } from '../types';
import { Search, Plus, Minus, Trash2, Printer, ShoppingCart, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { getProducts, getCustomers, getSettings, addSale, getSaleById, updateSale } from '../lib/api';

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<(Product & { quantity: number, is_sub_unit: boolean, unit_price: number })[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [discountInput, setDiscountInput] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const navigate = useNavigate();
  const location = useLocation();
  const editSaleId = new URLSearchParams(location.search).get('edit');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prods, custs, settings] = await Promise.all([
          getProducts(),
          getCustomers(),
          getSettings()
        ]);
        setProducts(prods);
        setCustomers(custs);
        if (settings.currency) setCurrency(settings.currency);

        if (editSaleId) {
          const saleData = await getSaleById(editSaleId);
          setSelectedCustomer(saleData.customer_id || null);
          setPaidAmountInput(saleData.paid_amount.toString());
          if (saleData.discount) {
            setDiscountInput(saleData.discount.toString());
          }
          
          // Reconstruct cart
          const reconstructedCart = saleData.items.map((item: any) => {
            const product = prods.find(p => p.id === item.product_id);
            return {
              id: item.product_id,
              name: product ? product.name : 'Unknown Product',
              barcode: product ? product.barcode : '',
              unit: product ? product.unit : 'piece',
              cost_price: item.cost_price,
              price_per_unit: product ? product.price_per_unit : item.unit_price,
              stock: product ? product.stock : 0,
              has_sub_unit: product ? product.has_sub_unit : false,
              sub_unit: product ? product.sub_unit : '',
              conversion_rate: product ? product.conversion_rate : 1,
              quantity: item.quantity,
              is_sub_unit: item.is_sub_unit || false,
              unit_price: item.unit_price
            };
          });
          setCart(reconstructedCart);
          setIsCartOpen(true);
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadData();
  }, [editSaleId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const filteredProducts = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerSearch) || 
      p.barcode?.includes(lowerSearch)
    );
  }, [products, search]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, is_sub_unit: false, unit_price: product.price_per_unit }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const toggleSubUnit = (id: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.has_sub_unit) {
        const newIsSubUnit = !item.is_sub_unit;
        const newUnitPrice = newIsSubUnit 
          ? item.price_per_unit / (item.conversion_rate || 1)
          : item.price_per_unit;
        return { ...item, is_sub_unit: newIsSubUnit, unit_price: newUnitPrice };
      }
      return item;
    }));
  };

  const updateUnitPrice = (id: string, price: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, unit_price: price };
      }
      return item;
    }));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const discount = Number(discountInput) || 0;
  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
  const previousLoan = selectedCustomerData?.loan_balance || 0;
  const totalDue = Math.max(0, totalAmount - discount) + previousLoan;

  const canCheckout = cart.length > 0 || (selectedCustomer && Number(paidAmountInput) > 0);

  const handleCheckout = async () => {
    if (!canCheckout) return;

    const finalPaidAmount = paidAmountInput === '' ? totalDue : Number(paidAmountInput);

    const saleData = {
      customer_id: selectedCustomer || null,
      total_amount: totalAmount,
      discount: discount,
      paid_amount: finalPaidAmount,
      items: cart.map(item => ({
        product_id: item.id || '',
        product_name: item.name || 'Unknown',
        unit: (item.is_sub_unit ? item.sub_unit : item.unit) || 'piece',
        quantity: item.quantity || 0,
        cost_price: (item.is_sub_unit ? (item.cost_price / (item.conversion_rate || 1)) : item.cost_price) || 0,
        unit_price: item.unit_price || 0,
        total_price: (item.unit_price * item.quantity) || 0,
        is_sub_unit: item.is_sub_unit || false,
        stock_deduction: (item.is_sub_unit ? (item.quantity / (item.conversion_rate || 1)) : item.quantity) || 0
      }))
    };

    try {
      let data;
      if (editSaleId) {
        data = await updateSale(editSaleId, saleData);
      } else {
        data = await addSale(saleData);
      }
      
      if (data.success) {
        setCart([]);
        setPaidAmountInput('');
        setDiscountInput('');
        setSelectedCustomer(null);
        navigate(`/invoice/${data.saleId}?print=true`);
      }
    } catch (error: any) {
      console.error('Checkout failed', error);
      alert(`Checkout failed: ${error.message || error}`);
    }
  };

  return (
    <div className="flex h-full">
      {/* Products Section */}
      <div className="flex-1 flex flex-col bg-slate-50/50 lg:border-r border-slate-200 pb-24 lg:pb-0">
        <div className="p-6 bg-white border-b border-slate-200">
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search products by name or barcode..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-100/80 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-slate-900 placeholder:text-slate-500 font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value.trim();
                  if (val !== '') {
                    const exactMatch = products.find(p => p.barcode === val);
                    if (exactMatch) {
                      addToCart(exactMatch);
                      setSearch('');
                    }
                  }
                }
              }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => {
                  addToCart(product);
                  // Optional: briefly show feedback or open cart automatically on mobile
                }}
                className="group bg-white p-5 rounded-3xl shadow-sm border border-slate-200/60 hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-0.5 transition-all text-left flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="font-bold text-slate-900 mb-1 text-lg leading-tight">{product.name}</div>
                <div className="text-xs font-mono text-slate-400 mb-6">{product.barcode || 'No barcode'}</div>
                <div className="mt-auto flex items-end justify-between w-full">
                  <div className="text-xl font-black text-emerald-600 tracking-tight">{formatCurrency(product.price_per_unit)}</div>
                  <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">{product.unit}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Cart Toggle */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-safe">
        <div>
          <p className="text-sm text-slate-500 font-medium">Total ({cart.length} items)</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalAmount)}</p>
        </div>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm"
        >
          <ShoppingCart size={20} /> View Cart
        </button>
      </div>

      {/* Cart Overlay */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Cart Section */}
      <div className={cn(
        "fixed lg:static inset-y-0 right-0 w-full sm:w-[420px] bg-white flex flex-col shadow-2xl z-40 border-l border-slate-200 transition-transform duration-300 ease-in-out",
        isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Current Order</h2>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">{cart.length} items</span>
            </div>
            <button onClick={() => setIsCartOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-2 -mr-2">
              <X size={24} />
            </button>
          </div>
          <select
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-medium text-slate-700 transition-all"
            value={selectedCustomer || ''}
            onChange={e => setSelectedCustomer(e.target.value || null)}
          >
            <option value="">Walk-in Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} (Loan: {formatCurrency(c.loan_balance)})</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.map(item => (
            <div key={item.id} className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-100 gap-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{item.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-20 p-1 text-sm border border-slate-300 rounded focus:ring-emerald-500 focus:border-emerald-500"
                      value={item.unit_price}
                      onChange={e => updateUnitPrice(item.id, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-sm text-slate-500">/</span>
                    {item.has_sub_unit ? (
                      <select 
                        className="text-sm border border-slate-300 rounded p-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                        value={item.is_sub_unit ? 'sub' : 'main'}
                        onChange={() => toggleSubUnit(item.id)}
                      >
                        <option value="main">{item.unit}</option>
                        <option value="sub">{item.sub_unit}</option>
                      </select>
                    ) : (
                      <span className="text-sm text-slate-500">{item.unit}</span>
                    )}
                  </div>
                </div>
                <div className="font-bold text-slate-900 text-right">
                  {formatCurrency(item.unit_price * item.quantity)}
                </div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="text-xs text-slate-500">
                  Stock: {item.stock} {item.unit}
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                  <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-100 rounded-md text-slate-600"><Minus size={16} /></button>
                  <input 
                    type="number" 
                    step="any"
                    className="w-12 text-center font-medium text-sm bg-transparent border-none focus:ring-0 p-0"
                    value={item.quantity}
                    onChange={e => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                      }
                    }}
                  />
                  <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-100 rounded-md text-slate-600"><Plus size={16} /></button>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Cart is empty</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4">
          <div className="flex justify-between text-slate-600">
            <span>Current Sale</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {selectedCustomerData && (
            <div className="flex justify-between text-slate-600">
              <span>Previous Loan</span>
              <span className="text-red-500">{formatCurrency(previousLoan)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-slate-900">
            <span>Total Due</span>
            <span>{formatCurrency(totalDue)}</span>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Paid Amount</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  value={paidAmountInput}
                  onChange={e => setPaidAmountInput(e.target.value)}
                  placeholder={`Exact amount: ${totalDue.toFixed(2)}`}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {selectedCustomer && (
              <button
                onClick={() => navigate(`/loan-receipt/${selectedCustomer}?print=true`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Printer size={20} />
                Print Loan Statement
              </button>
            )}

            <button
              onClick={handleCheckout}
              disabled={!canCheckout}
              className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Printer size={20} />
              {editSaleId ? 'Update & Print' : 'Checkout & Print'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

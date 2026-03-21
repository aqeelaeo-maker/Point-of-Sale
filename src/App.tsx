import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { ShoppingCart, Users, Truck, Package, Settings as SettingsIcon, LayoutDashboard, History, Menu, X, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Pages
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Vendors from './pages/Vendors';
import Invoice from './pages/Invoice';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import SalesHistory from './pages/SalesHistory';
import Login from './pages/Login';

import { getSettings } from './lib/api';

function Sidebar({ isOpen, setIsOpen, onLogout }: { isOpen: boolean; setIsOpen: (v: boolean) => void; onLogout: () => void }) {
  const location = useLocation();
  const [logo, setLogo] = React.useState('');

  React.useEffect(() => {
    getSettings()
      .then(data => {
        if (data.store_logo) setLogo(data.store_logo);
      });
  }, []);
  
  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'POS', path: '/pos', icon: ShoppingCart },
    { name: 'Sales History', path: '/sales', icon: History },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Vendors', path: '/vendors', icon: Truck },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-white h-screen flex flex-col shadow-2xl z-30 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between lg:justify-start gap-3">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt="Logo" className="w-10 h-10 rounded-lg object-cover bg-white" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-xl">G</div>
            )}
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">GroceryOS</h1>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto pb-4">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-emerald-500/10 text-emerald-400 font-semibold" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Icon size={20} className={isActive ? "text-emerald-400" : ""} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all duration-200"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}

function Layout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} onLogout={onLogout} />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center gap-4 z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 hover:text-slate-900">
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">GroceryOS</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ id: userSnap.id, ...userSnap.data() });
        } else {
          setUser({ id: firebaseUser.uid, email: firebaseUser.email, role: 'admin' });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) return null;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout onLogout={handleLogout}><Dashboard /></Layout>} />
        <Route path="/pos" element={<Layout onLogout={handleLogout}><POS /></Layout>} />
        <Route path="/sales" element={<Layout onLogout={handleLogout}><SalesHistory /></Layout>} />
        <Route path="/products" element={<Layout onLogout={handleLogout}><Products /></Layout>} />
        <Route path="/customers" element={<Layout onLogout={handleLogout}><Customers /></Layout>} />
        <Route path="/vendors" element={<Layout onLogout={handleLogout}><Vendors /></Layout>} />
        <Route path="/settings" element={<Layout onLogout={handleLogout}><Settings /></Layout>} />
        <Route path="/invoice/:id" element={<Invoice />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import React, { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { checkEmailAllowed } from '../lib/api';

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      if (!user.email) throw new Error('No email found in Google account.');

      const isAllowed = await checkEmailAllowed(user.email);
      if (!isAllowed) {
        await signOut(auth);
        throw new Error('Your email is not authorized to create a store.');
      }

      // Check if user exists in our db, if not create them
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      let userData = {
        id: user.uid,
        username: user.displayName || user.email,
        email: user.email,
        role: 'admin' // Defaulting to admin for this prototype
      };

      if (!userSnap.exists()) {
        await setDoc(userRef, userData);
      } else {
        userData = { id: userSnap.id, ...userSnap.data() } as any;
      }
      
      onLogin(userData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <ShoppingCart size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">GroceryOS</h1>
          <p className="text-slate-500 mt-2">Sign in to your account</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium text-center mb-6">
              {error}
            </div>
          )}
          
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-slate-300 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    </div>
  );
}

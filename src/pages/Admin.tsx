import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, AlertCircle, X } from 'lucide-react';
import { getAllowedEmails, addAllowedEmail, removeAllowedEmail } from '../lib/api';

export default function Admin() {
  const [emails, setEmails] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [emailToRemove, setEmailToRemove] = useState<string | null>(null);

  const fetchEmails = async () => {
    try {
      const data = await getAllowedEmails();
      setEmails(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setError('');
    try {
      await addAllowedEmail(newEmail.trim().toLowerCase());
      setNewEmail('');
      fetchEmails();
    } catch (err) {
      console.error(err);
      setError('Failed to add email');
    }
  };

  const confirmRemove = async () => {
    if (!emailToRemove) return;
    setError('');
    try {
      await removeAllowedEmail(emailToRemove);
      setEmailToRemove(null);
      fetchEmails();
    } catch (err) {
      console.error(err);
      setError('Failed to remove email');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <Shield size={24} />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Super Admin</h1>
          <p className="text-slate-500 mt-1">Manage who can create stores in GroceryOS.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
          <AlertCircle size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Allow New Email</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <input
            type="email"
            required
            placeholder="Enter email address..."
            className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} /> Add
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Allowed Emails</h2>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="p-4 flex items-center justify-between bg-slate-50">
            <span className="font-medium text-slate-900">aqeelaeo@gmail.com</span>
            <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">SUPER ADMIN</span>
          </div>
          {emails.map(item => (
            <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <span className="font-medium text-slate-700">{item.email}</span>
              <button
                onClick={() => setEmailToRemove(item.id)}
                className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Remove access"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
          {emails.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No additional emails allowed yet.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {emailToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-900">Remove Access</h3>
              <button onClick={() => setEmailToRemove(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <p className="text-slate-600 mb-6">
              Are you sure you want to revoke access for <span className="font-bold text-slate-900">{emailToRemove}</span>? They will no longer be able to log in or access their store.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEmailToRemove(null)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors"
              >
                Remove Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

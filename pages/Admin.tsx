import React, { useState, useEffect } from 'react';
import { User } from '../types';
import * as DB from '../services/db';
import { UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdminProps {
  currentUser: User;
}

const AdminPage: React.FC<AdminProps> = ({ currentUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee' as 'admin' | 'employee',
    casual: 10,
    sick: 10,
    annual: 20,
    reporting_to: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    // Load all users for the reporting_to dropdown
    const loadUsers = async () => {
      const users = await DB.getUsers();
      setAllUsers(users);
    };
    loadUsers();
  }, []);

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    if (!formData.name || !formData.email || !formData.password) {
      setMessage({ type: 'error', text: 'Please fill all required fields.' });
      setLoading(false);
      return;
    }

    try {
      const newUser: User = {
        id: crypto.randomUUID(),
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        balance: {
          casual: Number(formData.casual),
          sick: Number(formData.sick),
          annual: Number(formData.annual)
        },
        history: [],
        reporting_to: formData.reporting_to || undefined
      };

      const success = await DB.addUser(newUser);
      if (success) {
        setMessage({ type: 'success', text: `User ${newUser.name} enrolled successfully!` });
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'employee',
          casual: 10,
          sick: 10,
          annual: 20,
          reporting_to: ''
        });
        // Reload users list
        const users = await DB.getUsers();
        setAllUsers(users);
      } else {
        setMessage({ type: 'error', text: 'A user with this email already exists.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Get potential managers (admins and employees who can approve)
  const potentialManagers = allUsers.filter(u => u.role === 'admin' || u.id !== currentUser.id);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Enroll New Employee</h1>
        <p className="text-slate-500">Create login credentials and assign initial leave balance.</p>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6 md:p-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="e.g. Sarah Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* NEW: Reporting To Field */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reports To (Manager for Leave Approval)
              </label>
              <select
                value={formData.reporting_to}
                onChange={e => setFormData({...formData, reporting_to: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
              >
                <option value="">No Manager (Self-approve)</option>
                {potentialManagers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({manager.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Select who will approve this employee's leave requests
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
             <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Initial Leave Balance</h3>
             <div className="grid grid-cols-3 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Casual</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.casual}
                    onChange={e => setFormData({...formData, casual: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sick</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sick}
                    onChange={e => setFormData({...formData, sick: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Annual</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.annual}
                    onChange={e => setFormData({...formData, annual: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  />
               </div>
             </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPage;
import React, { useState } from 'react';
import { 
  Calendar, 
  PlusCircle, 
  Briefcase, 
  Activity, 
  Clock,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { User, LeaveType, LeaveRecord } from '../types';
import { LEAVE_TYPES } from '../constants';
import * as DB from '../services/db';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  user: User;
  refreshUser: () => void;
}

const StatCard: React.FC<{ 
  title: string; 
  value: number | string; 
  subtitle?: string; 
  icon: React.ElementType;
  colorClass: string; 
}> = ({ title, value, subtitle, icon: Icon, colorClass }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ user, refreshUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 1,
    type: 'casual' as LeaveType
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Stats Logic
  const totalAvailable = user.balance.casual + user.balance.sick + user.balance.annual;
  const leavesLast30Days = user.history.filter(h => {
    const dayDiff = (Date.now() - h.timestamp) / (1000 * 3600 * 24);
    return dayDiff <= 30;
  }).reduce((acc, curr) => acc + curr.amount, 0);

  // Count pending leaves
  const pendingLeaves = user.history.filter(h => h.status === 'pending').length;

  // Form Handlers
  const handleTakeLeave = async () => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    // Basic Validation
    if (formData.amount <= 0) {
      setError("Amount must be greater than 0");
      setSubmitting(false);
      return;
    }

    if (user.balance[formData.type] < formData.amount) {
      setError(`Insufficient ${formData.type} leave balance. Available: ${user.balance[formData.type]}`);
      setSubmitting(false);
      return;
    }

    // Action
    try {
      const newLeave: LeaveRecord = {
        id: crypto.randomUUID(),
        date: formData.date,
        amount: formData.amount,
        type: formData.type,
        timestamp: new Date(formData.date).getTime(),
        status: 'pending'
      };
      
      const success = await DB.submitLeaveRequest(user.id, newLeave);
      
      if (success) {
        await refreshUser();
        
        if (user.reporting_to && user.manager_name) {
          setSuccess(`Leave request submitted! Waiting for ${user.manager_name}'s approval.`);
        } else {
          setSuccess("Leave request submitted successfully!");
        }
        
        setTimeout(() => {
          setSuccess(null);
          setShowModal(false);
          setFormData({
            date: new Date().toISOString().split('T')[0],
            amount: 1,
            type: 'casual'
          });
        }, 3000);
      } else {
        setError("Failed to submit leave request. Please try again.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getEmailTemplate = () => {
    const typeLabel = LEAVE_TYPES.find(t => t.id === formData.type)?.label;
    return `Subject: Leave Application - ${user.name}

Dear ${user.manager_name || 'HR/Manager'},

I would like to request ${formData.amount} day(s) of ${typeLabel} on ${formData.date}.

I have checked my leave balance and verified that I have sufficient leaves available. I will ensure all my pending tasks are handed over before my leave.

Regards,
${user.name}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getEmailTemplate());
    alert("Email template copied to clipboard!");
  };

  const chartData = [
    { name: 'Casual', value: user.balance.casual, color: '#3b82f6' },
    { name: 'Sick', value: user.balance.sick, color: '#ef4444' },
    { name: 'Annual', value: user.balance.annual, color: '#22c55e' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏱';
      case 'approved':
        return '✓';
      case 'rejected':
        return '✗';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Overview of your leave status</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-primary-600/30 transition-all active:scale-95"
        >
          <PlusCircle size={20} />
          Request Leave
        </button>
      </div>

      {user.reporting_to && user.manager_name && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-lg">
                {user.manager_name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900">
                Your Manager: {user.manager_name}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                All leave requests require approval from your manager
              </p>
            </div>
          </div>
        </div>
      )}

      {pendingLeaves > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-900">
              You have {pendingLeaves} leave request{pendingLeaves > 1 ? 's' : ''} pending approval
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Available" 
          value={totalAvailable} 
          subtitle="Combined balance"
          icon={Briefcase} 
          colorClass="bg-indigo-500 text-indigo-500" 
        />
        <StatCard 
          title="Casual Leaves" 
          value={user.balance.casual} 
          icon={Clock} 
          colorClass="bg-blue-500 text-blue-500" 
        />
        <StatCard 
          title="Sick Leaves" 
          value={user.balance.sick} 
          icon={Activity} 
          colorClass="bg-red-500 text-red-500" 
        />
        <StatCard 
          title="Recent Usage" 
          value={leavesLast30Days} 
          subtitle="Past 30 days"
          icon={Calendar} 
          colorClass="bg-orange-500 text-orange-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h3 className="text-lg font-bold text-slate-900 mb-6">Balance Breakdown</h3>
           <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
           </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent History</h3>
          <div className="space-y-4">
            {user.history.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No leave history found.</p>
            ) : (
              user.history.slice(0, 4).map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className={`w-2 h-10 rounded-full ${
                    record.type === 'casual' ? 'bg-blue-500' : 
                    record.type === 'sick' ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 capitalize">{record.type} Leave</p>
                    <p className="text-xs text-slate-500">{record.date} • {record.amount} day(s)</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(record.status)}`}>
                    {getStatusIcon(record.status)} {record.status === 'pending' ? 'Pending' : record.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                </div>
              ))
            )}
            {user.history.length > 4 && (
              <p className="text-xs text-center text-primary-600 font-medium cursor-pointer">View full history</p>
            )}
          </div>
        </div>
      </div>

      {/* Take Leave Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Request Leave</h3>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                  setSuccess(null);
                }}
                disabled={submitting}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} /> {success}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Date</label>
                  <input 
                    type="date" 
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Duration (Days)</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    min="0.5"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Leave Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {LEAVE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFormData({...formData, type: type.id})}
                      disabled={submitting}
                      className={`
                        py-2 text-xs font-medium rounded-lg border transition-all
                        ${formData.type === type.id 
                          ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500' 
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase">Email Template Preview</span>
                  <button 
                    onClick={copyToClipboard}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    disabled={submitting}
                  >
                    Copy Text
                  </button>
                </div>
                <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans bg-white p-2 rounded border border-slate-200 max-h-40 overflow-y-auto">
                  {getEmailTemplate()}
                </pre>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleTakeLeave}
                  disabled={submitting}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
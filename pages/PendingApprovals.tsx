import React, { useState, useEffect } from 'react';
import { User, PendingLeaveRequest } from '../types';
import * as DB from '../services/db';
import { Clock, CheckCircle, XCircle, Calendar, User as UserIcon, AlertCircle } from 'lucide-react';

interface PendingApprovalsProps {
  user: User;
  refreshUser: () => void;
}

const PendingApprovalsPage: React.FC<PendingApprovalsProps> = ({ user, refreshUser }) => {
  const [pendingRequests, setPendingRequests] = useState<PendingLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const loadPendingRequests = async () => {
    setLoading(true);
    try {
      const requests = await DB.getPendingApprovals(user.id);
      setPendingRequests(requests);
    } catch (err) {
      console.error('Error loading pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingRequests();
  }, [user.id]);

  const handleApprove = async (leaveId: string, employeeName: string) => {
    setProcessing(leaveId);
    setMessage(null);

    try {
      const result = await DB.approveLeave(leaveId, user.id);
      if (result.success) {
        setMessage({ type: 'success', text: `Leave approved for ${employeeName}` });
        await loadPendingRequests();
        refreshUser();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to approve leave' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (leaveId: string, employeeName: string) => {
    setProcessing(leaveId);
    setMessage(null);

    const reason = rejectReason[leaveId] || 'No reason provided';

    try {
      const result = await DB.rejectLeave(leaveId, user.id, reason);
      if (result.success) {
        setMessage({ type: 'success', text: `Leave rejected for ${employeeName}` });
        await loadPendingRequests();
        setShowRejectModal(null);
        setRejectReason({ ...rejectReason, [leaveId]: '' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to reject leave' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessing(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'casual': return 'bg-blue-100 text-blue-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'annual': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
        <p className="text-slate-500">Review and approve leave requests from your team</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {pendingRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pending Requests</h3>
          <p className="text-slate-500">All leave requests have been processed.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <UserIcon size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{request.user_name}</h3>
                      <p className="text-sm text-slate-500">{request.user_email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-slate-400" />
                      <span className="text-slate-600">
                        <strong>Date:</strong> {request.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} className="text-slate-400" />
                      <span className="text-slate-600">
                        <strong>Duration:</strong> {request.amount} day(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getTypeColor(request.type)}`}>
                        {request.type} Leave
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400">
                    Requested on: {new Date(request.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(request.id, request.user_name)}
                    disabled={processing === request.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === request.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(request.id)}
                    disabled={processing === request.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>

              {/* Reject Modal */}
              {showRejectModal === request.id && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Reject Leave Request</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Are you sure you want to reject this leave request from <strong>{request.user_name}</strong>?
                    </p>
                    <textarea
                      value={rejectReason[request.id] || ''}
                      onChange={(e) => setRejectReason({ ...rejectReason, [request.id]: e.target.value })}
                      placeholder="Reason for rejection (optional)"
                      className="w-full border border-slate-300 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-primary-500 outline-none"
                      rows={3}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowRejectModal(null)}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(request.id, request.user_name)}
                        disabled={processing === request.id}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {processing === request.id ? 'Processing...' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingApprovalsPage;
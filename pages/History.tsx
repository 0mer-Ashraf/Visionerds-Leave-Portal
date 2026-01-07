import React from 'react';
import { User } from '../types';

interface HistoryProps {
  user: User;
}

const HistoryPage: React.FC<HistoryProps> = ({ user }) => {
  return (
    <div className="space-y-6">
       <div>
          <h1 className="text-2xl font-bold text-slate-900">Leave History</h1>
          <p className="text-slate-500">Record of all leaves taken</p>
        </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {user.history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm">
                    No records found.
                  </td>
                </tr>
              ) : (
                user.history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {record.date}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${record.type === 'casual' ? 'bg-blue-100 text-blue-800' : 
                          record.type === 'sick' ? 'bg-red-100 text-red-800' : 
                          'bg-green-100 text-green-800'}
                      `}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {record.amount} Day(s)
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-green-600 font-medium text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                        Approved
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
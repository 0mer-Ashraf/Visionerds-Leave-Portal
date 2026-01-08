import React, { useState, useEffect } from 'react';
import { User } from '../types';
import * as DB from '../services/db';
import { 
  Users, 
  Search, 
  Edit2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Save,
  UserCircle
} from 'lucide-react';

interface AdminEmployeeManagementProps {
  currentUser: User;
}

const AdminEmployeeManagement: React.FC<AdminEmployeeManagementProps> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    reporting_to: '',
    casual: 0,
    sick: 0,
    annual: 0
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  const loadEmployees = async () => {
    try {
      const allUsers = await DB.getUsers();
      setEmployees(allUsers);
      setFilteredEmployees(allUsers);
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const openEditModal = (employee: User) => {
    setSelectedEmployee(employee);
    setEditForm({
      reporting_to: employee.reporting_to || '',
      casual: employee.balance.casual,
      sick: employee.balance.sick,
      annual: employee.balance.annual
    });
    setMessage(null);
    setShowEditModal(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedEmployee) return;

    setMessage(null);
    setLoading(true);

    try {
      // Validate balances
      if (editForm.casual < 0 || editForm.sick < 0 || editForm.annual < 0) {
        setMessage({ type: 'error', text: 'Leave balances cannot be negative' });
        setLoading(false);
        return;
      }

      const success = await DB.updateEmployeeSettings(
        selectedEmployee.id,
        editForm.reporting_to || undefined,
        {
          casual: editForm.casual,
          sick: editForm.sick,
          annual: editForm.annual
        }
      );

      if (success) {
        setMessage({ 
          type: 'success', 
          text: `Settings updated successfully for ${selectedEmployee.name}` 
        });
        await loadEmployees();
        setTimeout(() => {
          setShowEditModal(false);
          setSelectedEmployee(null);
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update settings' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Get potential managers (excluding the selected employee)
  const getPotentialManagers = () => {
    if (!selectedEmployee) return [];
    return employees.filter(emp => emp.id !== selectedEmployee.id);
  };

  if (currentUser.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only administrators can access this page.</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
        <p className="text-slate-500">Manage reporting structure and leave quotas</p>
      </div>

      {message && !showEditModal && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reports To</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Leave Balance</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                    {searchTerm ? 'No employees found matching your search.' : 'No employees found.'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-bold">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                          <p className="text-xs text-slate-500">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        employee.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {employee.manager_name ? (
                        <div className="flex items-center gap-2">
                          <UserCircle size={16} className="text-slate-400" />
                          <span className="text-sm text-slate-700">{employee.manager_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No manager</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                          C: {employee.balance.casual}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-medium">
                          S: {employee.balance.sick}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                          A: {employee.balance.annual}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(employee)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg font-medium transition-colors"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Edit Employee Settings</h3>
                    <p className="text-sm text-primary-100">{selectedEmployee.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                    setMessage(null);
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {message && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {message.text}
                </div>
              )}

              {/* Current Info Display */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Current Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium text-slate-900">{selectedEmployee.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Role:</span>
                    <p className="font-medium text-slate-900 capitalize">{selectedEmployee.role}</p>
                  </div>
                </div>
              </div>

              {/* Reporting Manager Section */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Reports To (Manager for Leave Approval)
                </label>
                <select
                  value={editForm.reporting_to}
                  onChange={(e) => setEditForm({...editForm, reporting_to: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white"
                  disabled={loading}
                >
                  <option value="">No Manager (Self-approve)</option>
                  {getPotentialManagers().map(manager => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email}) - {manager.role}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Select who will approve this employee's leave requests
                </p>
              </div>

              {/* Leave Balance Section */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Leave Balance Quotas</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      Casual Leave
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.casual}
                      onChange={(e) => setEditForm({...editForm, casual: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      disabled={loading}
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Current: {selectedEmployee.balance.casual}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      Sick Leave
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.sick}
                      onChange={(e) => setEditForm({...editForm, sick: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                      disabled={loading}
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Current: {selectedEmployee.balance.sick}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-2">
                      Annual Leave
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editForm.annual}
                      onChange={(e) => setEditForm({...editForm, annual: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                      disabled={loading}
                    />
                    <div className="mt-1 text-xs text-slate-500">
                      Current: {selectedEmployee.balance.annual}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary of Changes */}
              {(editForm.casual !== selectedEmployee.balance.casual ||
                editForm.sick !== selectedEmployee.balance.sick ||
                editForm.annual !== selectedEmployee.balance.annual ||
                editForm.reporting_to !== (selectedEmployee.reporting_to || '')) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="text-xs font-bold text-blue-900 mb-2">Changes to be made:</h5>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {editForm.reporting_to !== (selectedEmployee.reporting_to || '') && (
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>
                          Manager: {selectedEmployee.manager_name || 'None'} → {
                            editForm.reporting_to 
                              ? employees.find(e => e.id === editForm.reporting_to)?.name 
                              : 'None'
                          }
                        </span>
                      </li>
                    )}
                    {editForm.casual !== selectedEmployee.balance.casual && (
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Casual Leave: {selectedEmployee.balance.casual} → {editForm.casual}</span>
                      </li>
                    )}
                    {editForm.sick !== selectedEmployee.balance.sick && (
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Sick Leave: {selectedEmployee.balance.sick} → {editForm.sick}</span>
                      </li>
                    )}
                    {editForm.annual !== selectedEmployee.balance.annual && (
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Annual Leave: {selectedEmployee.balance.annual} → {editForm.annual}</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                    setMessage(null);
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
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

export default AdminEmployeeManagement;

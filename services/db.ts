import { User, LeaveRecord, PendingLeaveRequest } from '../types';
import { supabase } from './supabase';

// Map database row to User type
const mapDbToUser = async (dbUser: any, history: any[] = []): Promise<User> => {
  // Get manager name if reporting_to exists
  let manager_name = undefined;
  if (dbUser.reporting_to) {
    const { data: manager } = await supabase
      .from('users')
      .select('name')
      .eq('id', dbUser.reporting_to)
      .single();
    manager_name = manager?.name;
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    password: dbUser.password,
    role: dbUser.role,
    balance: {
      casual: dbUser.casual_balance,
      sick: dbUser.sick_balance,
      annual: dbUser.annual_balance
    },
    history: history.map(h => ({
      id: h.id,
      date: h.date,
      amount: parseFloat(h.amount),
      type: h.type,
      timestamp: h.timestamp,
      status: h.status || 'approved', // Default for old records
      approved_by: h.approved_by,
      approved_at: h.approved_at,
      rejection_reason: h.rejection_reason
    })),
    reporting_to: dbUser.reporting_to,
    manager_name
  };
};

export const getUsers = async (): Promise<User[]> => {
  const { data: users, error } = await supabase
    .from('users')
    .select('*');

  if (error) throw error;
  
  // Fetch history for each user
  const usersWithHistory = await Promise.all(
    users.map(async (user) => {
      const { data: history } = await supabase
        .from('leave_history')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });
      
      return mapDbToUser(user, history || []);
    })
  );

  return usersWithHistory;
};

export const getUserById = async (id: string): Promise<User | undefined> => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !user) return undefined;

  const { data: history } = await supabase
    .from('leave_history')
    .select('*')
    .eq('user_id', id)
    .order('timestamp', { ascending: false });

  return mapDbToUser(user, history || []);
};

export const addUser = async (newUser: User): Promise<boolean> => {
  // Check if user exists
  const { data: existing } = await supabase
    .from('users')
    .select('email')
    .eq('email', newUser.email)
    .single();

  if (existing) return false;

  // Insert new user
  const { error } = await supabase
    .from('users')
    .insert({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      casual_balance: newUser.balance.casual,
      sick_balance: newUser.balance.sick,
      annual_balance: newUser.balance.annual,
      reporting_to: newUser.reporting_to
    });

  return !error;
};

// FIXED: Submit leave request with pending leaves validation
export const submitLeaveRequest = async (userId: string, leave: LeaveRecord): Promise<boolean> => {
  // Get current user to check balance
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) return false;

  // Get all pending leaves of the same type
  const { data: pendingLeaves, error: pendingError } = await supabase
    .from('leave_history')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', leave.type)
    .eq('status', 'pending');

  if (pendingError) return false;

  // Calculate total pending amount for this leave type
  const totalPending = pendingLeaves?.reduce((sum, l) => sum + parseFloat(l.amount), 0) || 0;

  // Check if user has enough balance (current balance - pending leaves)
  const balanceField = `${leave.type}_balance` as 'casual_balance' | 'sick_balance' | 'annual_balance';
  const currentBalance = user[balanceField];
  const availableBalance = currentBalance - totalPending;

  if (availableBalance < leave.amount) {
    throw new Error(
      `Insufficient ${leave.type} leave balance. Available: ${availableBalance} (${currentBalance} total - ${totalPending} pending)`
    );
  }

  // Insert leave request with 'pending' status (DON'T deduct balance yet)
  const { error: leaveError } = await supabase
    .from('leave_history')
    .insert({
      id: leave.id,
      user_id: userId,
      date: leave.date,
      amount: leave.amount,
      type: leave.type,
      timestamp: leave.timestamp,
      status: 'pending' // KEY: Set as pending
    });

  return !leaveError;
};

// NEW: Get pending leave requests for a manager
export const getPendingApprovals = async (managerId: string): Promise<PendingLeaveRequest[]> => {
  // Get all employees who report to this manager
  const { data: reportees, error: reporteesError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('reporting_to', managerId);

  if (reporteesError || !reportees || reportees.length === 0) return [];

  const reporteeIds = reportees.map(r => r.id);

  // Get pending leave requests from these employees
  const { data: pendingLeaves, error: leavesError } = await supabase
    .from('leave_history')
    .select('*')
    .in('user_id', reporteeIds)
    .eq('status', 'pending')
    .order('timestamp', { ascending: false });

  if (leavesError || !pendingLeaves) return [];

  // Combine with user info
  return pendingLeaves.map(leave => {
    const user = reportees.find(r => r.id === leave.user_id);
    return {
      ...leave,
      amount: parseFloat(leave.amount),
      user_id: leave.user_id,
      user_name: user?.name || 'Unknown',
      user_email: user?.email || ''
    };
  });
};

// NEW: Approve leave request
export const approveLeave = async (
  leaveId: string, 
  approverId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get leave record
    const { data: leave, error: leaveError } = await supabase
      .from('leave_history')
      .select('*, user_id')
      .eq('id', leaveId)
      .single();

    if (leaveError || !leave) {
      return { success: false, error: 'Leave request not found' };
    }

    if (leave.status !== 'pending') {
      return { success: false, error: 'Leave request already processed' };
    }

    // Get user's current balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', leave.user_id)
      .single();

    if (userError || !user) {
      return { success: false, error: 'User not found' };
    }

    const balanceField = `${leave.type}_balance` as 'casual_balance' | 'sick_balance' | 'annual_balance';
    const currentBalance = user[balanceField];

    // Check if user still has balance
    if (currentBalance < leave.amount) {
      return { success: false, error: 'Insufficient leave balance' };
    }

    // Deduct balance
    const newBalance = currentBalance - leave.amount;
    const { error: updateBalanceError } = await supabase
      .from('users')
      .update({ [balanceField]: newBalance })
      .eq('id', leave.user_id);

    if (updateBalanceError) {
      return { success: false, error: 'Failed to update balance' };
    }

    // Update leave status to approved
    const { error: updateLeaveError } = await supabase
      .from('leave_history')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString()
      })
      .eq('id', leaveId);

    if (updateLeaveError) {
      return { success: false, error: 'Failed to approve leave' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// NEW: Reject leave request
export const rejectLeave = async (
  leaveId: string,
  approverId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get leave record
    const { data: leave, error: leaveError } = await supabase
      .from('leave_history')
      .select('status')
      .eq('id', leaveId)
      .single();

    if (leaveError || !leave) {
      return { success: false, error: 'Leave request not found' };
    }

    if (leave.status !== 'pending') {
      return { success: false, error: 'Leave request already processed' };
    }

    // Update leave status to rejected (no balance deduction)
    const { error: updateError } = await supabase
      .from('leave_history')
      .update({
        status: 'rejected',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        rejection_reason: reason
      })
      .eq('id', leaveId);

    if (updateError) {
      return { success: false, error: 'Failed to reject leave' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

// Keep old function for backward compatibility (now submits as pending)
export const addLeave = async (userId: string, leave: LeaveRecord): Promise<User | null> => {
  const success = await submitLeaveRequest(userId, leave);
  if (!success) return null;
  return await getUserById(userId) || null;
};

// NEW: Update user password
export const updateUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('Error updating password:', err);
    return false;
  }
};

// NEW: Update employee settings (reporting_to and leave balances)
export const updateEmployeeSettings = async (
  userId: string,
  reporting_to: string | undefined,
  balance: { casual: number; sick: number; annual: number }
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        reporting_to: reporting_to || null,
        casual_balance: balance.casual,
        sick_balance: balance.sick,
        annual_balance: balance.annual
      })
      .eq('id', userId);

    return !error;
  } catch (err) {
    console.error('Error updating employee settings:', err);
    return false;
  }
};
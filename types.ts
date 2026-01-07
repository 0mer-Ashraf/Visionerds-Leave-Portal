export type LeaveType = 'casual' | 'sick' | 'annual';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRecord {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  amount: number; // 0.5, 1, 2 etc.
  type: LeaveType;
  timestamp: number;
  status: LeaveStatus;
  approved_by?: string; // User ID who approved
  approved_at?: string; // ISO timestamp
  rejection_reason?: string;
}

export interface UserBalance {
  casual: number;
  sick: number;
  annual: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // Stored in plain text for this demo requirements
  role: 'admin' | 'employee';
  balance: UserBalance;
  history: LeaveRecord[];
  reporting_to?: string; // User ID of manager
  manager_name?: string; // Populated when fetched
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface PendingLeaveRequest extends LeaveRecord {
  user_id: string;
  user_name: string;
  user_email: string;
}
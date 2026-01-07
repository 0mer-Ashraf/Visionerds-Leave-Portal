import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  UserPlus, 
  LogOut, 
  Menu, 
  X,
  Clock,
  Lock,
  Key
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  onChangePassword?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onChangePassword }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Build navigation items dynamically
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/history', label: 'Leave History', icon: History },
  ];

  // Add Pending Approvals for admins (they have people reporting to them)
  if (user.role === 'admin') {
    navItems.push({ 
      path: '/approvals', 
      label: 'Pending Approvals', 
      icon: Clock 
    });
  }

  // Admin-only features
  if (user.role === 'admin') {
    navItems.push(
      { path: '/admin', label: 'Enroll User', icon: UserPlus },
      { path: '/admin/passwords', label: 'Password Management', icon: Lock }
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 flex flex-col
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary-600 rounded flex items-center justify-center">
              <span className="text-white text-lg">V</span>
            </div>
            <span>Visionerds</span>
          </div>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isActive(item.path) 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'}
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.role}</p>
            </div>
          </div>
          
          {/* Change Password Button */}
          {onChangePassword && (
            <button
              onClick={onChangePassword}
              className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-sm font-medium mb-2"
            >
              <Key size={18} />
              Change Password
            </button>
          )}
          
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-950/30 hover:text-red-300 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-2 md:hidden">
             <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">V</span>
            </div>
             <span className="font-bold text-slate-900">Visionerds</span>
          </div>

          <div className="hidden md:flex items-center gap-4 ml-auto">
            {/* Header Right Area - Could have notifications here */}
            <span className="text-sm text-slate-500">Welcome back, {user.name}</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
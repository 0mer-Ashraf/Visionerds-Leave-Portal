import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from './types';
import * as DB from './services/db';
import LoginPage from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/History';
import AdminPage from './pages/Admin';
import PendingApprovalsPage from './pages/PendingApprovals'; // ⭐ NEW

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const sessionUserId = localStorage.getItem('visionerds_session_user');
      if (sessionUserId) {
        const foundUser = await DB.getUserById(sessionUserId);
        if (foundUser) setUser(foundUser);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('visionerds_session_user', u.id);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('visionerds_session_user');
  };

  const refreshUser = async () => {
    if (user) {
      const updatedUser = await DB.getUserById(user.id);
      if (updatedUser) setUser(updatedUser);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/" 
          element={user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Dashboard user={user} refreshUser={refreshUser} />
            </Layout>
          ) : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/history" 
          element={user ? (
            <Layout user={user} onLogout={handleLogout}>
              <HistoryPage user={user} />
            </Layout>
          ) : <Navigate to="/login" />} 
        />

        {/* ⭐ NEW ROUTE - Pending Approvals */}
        <Route 
          path="/approvals" 
          element={user ? (
            <Layout user={user} onLogout={handleLogout}>
              <PendingApprovalsPage user={user} refreshUser={refreshUser} />
            </Layout>
          ) : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/admin" 
          element={user ? (
            <Layout user={user} onLogout={handleLogout}>
              <AdminPage currentUser={user} />
            </Layout>
          ) : <Navigate to="/login" />} 
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
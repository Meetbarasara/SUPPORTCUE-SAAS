import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import CompanySetup from './pages/CompanySetup';

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // No role-specific gating now

  return children;
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    
    // Force router to update by navigating to login
    window.location.href = '/login';
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home user={user} onLogout={handleLogout} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/company-setup" element={<CompanySetup />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          <Route path="/widget" element={<WidgetRoute />} />
        </Routes>
      </div>
    </Router>
  );
}

// Standalone route for iframe embed
import { useSearchParams } from 'react-router-dom';
import ChatWidget from './components/ChatWidget';

function WidgetRoute() {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('companyId');
  const customerId = searchParams.get('customerId');
  
  useEffect(() => {
    document.documentElement.classList.add('widget-mode');
    return () => document.documentElement.classList.remove('widget-mode');
  }, []);

  if (!companyId) {
    return <div className="text-white text-xs p-4">Missing companyId</div>;
  }
  
  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent">
      <ChatWidget companyId={companyId} initialCustomerId={customerId} standalone={true} />
    </div>
  );
}

export default App;

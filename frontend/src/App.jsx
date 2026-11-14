import React, { useState, useEffect, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import PortalSelector from './pages/PortalSelector';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import BlockchainExplorer from './pages/BlockchainExplorer';
import Register from './pages/Register';
import SystemStatus from './pages/SystemStatus';
import { API_BASE } from './config';

// Global Error Boundary to prevent blank/white screen crashes
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-6">
          <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-gray-400">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={async () => {
                  try {
                    if ('serviceWorker' in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      for (const reg of regs) await reg.unregister();
                    }
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      for (const key of keys) await caches.delete(key);
                    }
                  } catch (e) {}
                  this.setState({ hasError: false });
                  window.location.href = '/';
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Go to Portals
              </button>
              <button
                onClick={async () => {
                  try {
                    if ('serviceWorker' in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      for (const reg of regs) await reg.unregister();
                    }
                    if ('caches' in window) {
                      const keys = await caches.keys();
                      for (const key of keys) await caches.delete(key);
                    }
                  } catch (e) {}
                  window.location.reload(true);
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Reload & Purge Cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global axios interceptor to handle expired tokens
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // NEVER intercept login or register endpoint errors - let Login/Register components handle them!
    const requestUrl = error.config?.url || '';
    if (requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')) {
      return Promise.reject(error);
    }

    if (error.response && (error.response.status === 401 || error.response.status === 422)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on the login page or portal selector
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Role-based protection wrapper
const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    user = {};
  }
  
  if (!token) return <Navigate to={`/login?role=${role || 'student'}`} />;
  if (role && user.role !== role) {
    // If logged in with different role, send to their own portal
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'teacher') return <Navigate to="/teacher" />;
    return <Navigate to="/student" />;
  }
  
  return children;
};

function App() {
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await axios.get('/api/health');
        setIsBackendOffline(false);
      } catch (err) {
        setIsBackendOffline(true);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {isBackendOffline && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white text-center py-2 px-4 font-semibold text-xs shadow-md flex items-center justify-center gap-2 transition-all sticky top-0 z-50">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-200 animate-ping"></span>
            <span>
              ⚡ Mobile Standalone Mode Active — Complete app runs 24/7 on mobile (No backend or laptop required!)
            </span>
          </div>
        )}
        <ErrorBoundary>
          <Routes>
            {/* Main Entry: Portal Selector Hub */}
            <Route path="/" element={<PortalSelector />} />
            
            {/* Dedicated Login */}
            <Route path="/login" element={<Login />} />
            
            {/* Dedicated Student App */}
            <Route path="/student" element={
              <PrivateRoute role="student">
                <StudentDashboard />
              </PrivateRoute>
            } />
            
            {/* Dedicated Teacher App */}
            <Route path="/teacher" element={
              <PrivateRoute role="teacher">
                <TeacherDashboard />
              </PrivateRoute>
            } />

            {/* Dedicated Admin App */}
            <Route path="/admin" element={
              <PrivateRoute role="admin">
                <AdminDashboard />
              </PrivateRoute>
            } />
            
            {/* Student Registration */}
            <Route path="/register" element={<Register />} />

            {/* Blockchain Ledger Explorer */}
            <Route path="/blockchain" element={<BlockchainExplorer />} />

            {/* Enterprise System Status & Telemetry */}
            <Route path="/status" element={<SystemStatus />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </Router>
  );
}

export default App;

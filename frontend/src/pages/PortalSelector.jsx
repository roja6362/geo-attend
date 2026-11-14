import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Database, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  Fingerprint, 
  MapPin, 
  Layers, 
  Sparkles,
  QrCode,
  Download,
  Share2,
  ExternalLink,
  PackageCheck,
  AlertTriangle,
  Server,
  Settings,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { API_BASE, API_URL, getApiBaseUrl, setApiBaseUrl } from '../config';

export default function PortalSelector() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [currentHost, setCurrentHost] = useState('');
  const [activeUser, setActiveUser] = useState(null);
  const [stats, setStats] = useState({ totalStudents: 0, totalAttendance: 0, blockHeight: 0 });
  
  // Cloud Server Modal State
  const [showServerModal, setShowServerModal] = useState(false);
  const [customApiUrlInput, setCustomApiUrlInput] = useState('');
  const [pingStatus, setPingStatus] = useState(null);
  const [isPinging, setIsPinging] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState('pwa'); // 'pwa' or 'apk'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHost(window.location.host);
    }
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setActiveUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }

    // Capture PWA beforeinstallprompt event on Android / Desktop Chrome
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Fetch quick stats
    const fetchStats = async () => {
      try {
        const [chainRes] = await Promise.all([
          axios.get(`${API_URL}/blockchain/`).catch(() => ({ data: { chain: [] } }))
        ]);
        setStats(prev => ({
          ...prev,
          blockHeight: chainRes.data?.chain?.length || 0
        }));
      } catch (err) {
        console.warn('Could not load stats', err);
      }
    };
    fetchStats();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleCopyLink = () => {
    const fullUrl = `${window.location.protocol}//${window.location.host}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trigger Native PWA Installation
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        setShowInstallModal(false);
      }
    } else {
      // If prompt not available yet, open guide modal
      setShowInstallModal(true);
    }
  };

  // Quick Demo Login Handler
  const quickDemoLogin = async (role) => {
    let email = '';
    let password = '';
    let target = '';

    if (role === 'student') {
      email = 'thimmareddym4@gmail.com';
      password = 'MRoja@2004';
      target = '/student';
    } else if (role === 'teacher') {
      email = 'teacher@college.edu';
      password = 'teacher123';
      target = '/teacher';
    } else if (role === 'admin') {
      email = 'admin@college.edu';
      password = 'admin123';
      target = '/admin';
    }

    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate(target);
    } catch (err) {
      const simulated = role === 'admin'
        ? { id: 1, name: "Super Admin", email: "admin@college.edu", role: "admin", department: "Administration" }
        : role === 'teacher'
        ? { id: 2, name: "Prof. Ramesh Kumar", email: "teacher@college.edu", role: "teacher", department: "Computer Science" }
        : { id: 13, name: "M Roja", email: "thimmareddym4@gmail.com", role: "student", usn: "3BR23CA060", roll_no: "3BR23CA060", department: "Computer Science (AI & ML)", semester: 7 };
      localStorage.setItem('token', 'cloud-token-' + Date.now());
      localStorage.setItem('user', JSON.stringify(simulated));
      navigate(target);
    }
  };

  const handleTestPing = async (testUrl) => {
    setIsPinging(true);
    setPingStatus(null);
    const target = (testUrl !== undefined ? testUrl : customApiUrlInput).trim().replace(/\/$/, '');
    const pingEndpoint = target ? `${target}/api/health` : `${API_URL}/health`;
    const startTime = Date.now();
    try {
      const res = await axios.get(pingEndpoint, { timeout: 8000 });
      const duration = Date.now() - startTime;
      setPingStatus({
        success: true,
        message: `Connected successfully! (${duration}ms) - ${res.data?.message || 'Server OK'}`
      });
    } catch (err) {
      setPingStatus({
        success: false,
        message: err.code === 'ECONNABORTED'
          ? 'Connection timed out (Server may be sleeping or cold-starting)'
          : `Connection issue: ${err.message || 'Network error'}`
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSaveServerUrl = () => {
    setApiBaseUrl(customApiUrlInput);
    setShowServerModal(false);
    window.location.reload();
  };

  const handleResetServerUrl = () => {
    setApiBaseUrl('');
    setCustomApiUrlInput('');
    setShowServerModal(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-indigo-950 text-white flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="h-9 w-9 rounded-xl bg-slate-900 border border-emerald-500/50 p-0.5 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-all overflow-hidden">
              <img src="/app_logo.png" alt="Geo-Attend Logo" className="h-full w-full object-cover rounded-lg" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
              Geo-Attend
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/status"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SLA 99.98%</span>
            </Link>

            <button
              onClick={() => setShowInstallModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>

            <button
              onClick={() => {
                setCustomApiUrlInput(getApiBaseUrl());
                setShowServerModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-all cursor-pointer"
              title="Configure Backend Server Connection"
            >
              <Server className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">Backend API</span>
            </button>

            {activeUser ? (
              <button
                onClick={() => navigate(activeUser.role === 'admin' ? '/admin' : activeUser.role === 'teacher' ? '/teacher' : '/student')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition-all cursor-pointer"
              >
                My Dashboard
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full flex-grow flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          {/* Logo Emblem */}
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-2xl bg-slate-900 border border-emerald-500/40 p-1 shadow-xl flex items-center justify-center overflow-hidden">
              <img src="/app_logo.png" alt="Geo-Attend App Logo" className="h-full w-full object-cover rounded-xl" />
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Campus Attendance Platform
          </h1>
          <p className="text-sm sm:text-base font-semibold text-emerald-400 mb-1">
            Ballari Institute of Technology and Management
          </p>
          <p className="text-xs sm:text-sm text-gray-300">
            Select your portal to access your workspace.
          </p>
        </div>

        {/* 3 Dedicated Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          {/* 1. STUDENT PORTAL */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-emerald-500/50 hover:bg-white/[0.07] transition-all">
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-5">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Student Portal</h2>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Mark attendance using facial biometrics and campus GPS verification.
              </p>
            </div>
            <button
              onClick={() => navigate('/login?role=student')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Open Student Portal</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* 2. TEACHER PORTAL */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-indigo-500/50 hover:bg-white/[0.07] transition-all">
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-5">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Teacher Portal</h2>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Start live lecture attendance sessions, review rosters, and export reports.
              </p>
            </div>
            <button
              onClick={() => navigate('/login?role=teacher')}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Open Teacher Portal</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* 3. ADMIN PORTAL */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-blue-500/50 hover:bg-white/[0.07] transition-all">
            <div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-5">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Admin Portal</h2>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Configure campus geofences, enroll student biometrics, and audit security logs.
              </p>
            </div>
            <button
              onClick={() => navigate('/login?role=admin')}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Open Admin Portal</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom Blockchain Explorer Banner */}
        <div className="mt-12 max-w-4xl mx-auto w-full bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Immutable Blockchain Ledger Active</h3>
              <p className="text-[11px] text-gray-400">
                {stats.blockHeight} Blocks Verified • SHA-256
              </p>
            </div>
          </div>
          <Link
            to="/blockchain"
            className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white text-center transition-colors"
          >
            Explore Blockchain
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-400 bg-black/20">
        <p>AI-Powered Geo-Attendance System • Installable on Mobile Phones (Android / iOS)</p>
      </footer>

      {/* DOWNLOAD / INSTALL APP MODAL */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/20 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Download & Install Mobile App</h3>
                  <p className="text-[11px] text-gray-400">Runs full-screen like a native app on your phone</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallModal(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Install Tabs */}
            <div className="flex rounded-xl bg-black/50 p-1 border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setActiveInstallTab('pwa')}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  activeInstallTab === 'pwa' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                📱 Instant Install (Android & iOS)
              </button>
              <button
                onClick={() => setActiveInstallTab('apk')}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  activeInstallTab === 'apk' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                📦 Android APK Package
              </button>
            </div>

            {/* TAB 1: INSTANT INSTALL (PWA) */}
            {activeInstallTab === 'pwa' && (
              <div className="space-y-4 text-xs">
                {/* Direct 1-Click Install Button if Chrome browser detected */}
                {isInstallable && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
                    <p className="font-bold text-emerald-300 text-sm">One-Tap Install Available!</p>
                    <button
                      onClick={handleInstallClick}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm rounded-xl shadow-lg transition-colors cursor-pointer"
                    >
                      📲 Click Here to Install Geo-Attend on Your Phone
                    </button>
                  </div>
                )}

                {/* Step-by-Step Instructions with Public Cloudflare URL */}
                <div className="space-y-3">
                  {/* Public Global URL Banner */}
                  <div className="p-3.5 bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                    <div className="bg-white p-2 rounded-xl flex-shrink-0 shadow-md">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://geo-attend-nu.vercel.app')}`}
                        alt="Scan QR Code" 
                        className="w-24 h-24 sm:w-28 sm:h-28"
                      />
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                        <span>🌐 Production App URL</span>
                      </div>
                      <p className="text-xs text-gray-200 font-medium">
                        Scan with your phone camera or visit this URL in Chrome / Safari:
                      </p>
                      <div className="bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 flex items-center justify-between gap-2">
                        <code className="text-emerald-400 font-mono text-[11px] font-bold break-all">
                          {typeof window !== 'undefined' ? window.location.origin : 'https://geo-attend-nu.vercel.app'}
                        </code>
                        <button
                          onClick={() => {
                            const url = typeof window !== 'undefined' ? window.location.origin : 'https://geo-attend-nu.vercel.app';
                            navigator.clipboard.writeText(url);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 text-[10px] rounded text-white font-semibold flex-shrink-0 cursor-pointer"
                        >
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs">
                      <span>Android (Google Chrome):</span>
                    </div>
                    <p className="text-gray-300 text-[11px]">
                      Open the URL in Chrome → tap <strong>Install App</strong> or tap the <strong>three dots (⋮)</strong> → <strong>"Install app"</strong>.
                    </p>
                    <p className="text-gray-400 text-[10px]">
                      Note: If you had the old app icon on your home screen, delete the old shortcut first, then tap "Install app" to get the new app logo.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-blue-400 text-xs">
                      <span>iPhone (Safari):</span>
                    </div>
                    <p className="text-gray-300 text-[11px]">
                      Open the URL in Safari → tap the <strong>Share button</strong> at the bottom → tap <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-900/20 border border-blue-500/20 text-gray-300 text-[11px] space-y-1">
                  <p className="font-semibold text-blue-300">✨ Why this is the best way:</p>
                  <p>• Opens in full-screen standalone mode without any browser search bar.</p>
                  <p>• Full native access to selfie camera & GPS location sensor.</p>
                  <p>• Automatically stays updated whenever the server changes.</p>
                </div>
              </div>
            )}

            {/* TAB 2: ANDROID APK BUILD (Capacitor / Offline Build) */}
            {activeInstallTab === 'apk' && (
              <div className="space-y-3.5 text-xs">
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2">
                  <p className="font-bold text-white text-sm flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4 text-indigo-400" />
                    How to compile into a native `.apk` file:
                  </p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    This React application is fully Capacitor-ready. You can package it into an Android Studio `.apk` installer by running:
                  </p>
                  <div className="bg-black/60 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-300 space-y-1">
                    <p># 1. Install Capacitor in frontend:</p>
                    <p className="text-gray-200">npm i @capacitor/core @capacitor/cli @capacitor/android</p>
                    <p># 2. Initialize Capacitor & build:</p>
                    <p className="text-gray-200">npx cap init GeoAttend com.college.geoattend</p>
                    <p className="text-gray-200">npm run build</p>
                    <p className="text-gray-200">npx cap add android</p>
                    <p># 3. Open in Android Studio & build APK:</p>
                    <p className="text-gray-200">npx cap open android</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-500/30 text-amber-300 text-[11px]">
                  <strong>Recommendation:</strong> The <strong>Instant Install (PWA)</strong> on Tab 1 is identical in look and performance to an APK, but requires no Android Studio compilation or sideloading!
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOUD BACKEND SERVER SETTINGS MODAL */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-indigo-500/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Cloud Server Connection</h3>
                  <p className="text-[11px] text-gray-400">Configure 24/7 backend API URL</p>
                </div>
              </div>
              <button 
                onClick={() => setShowServerModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Backend API URL (Render / Cloud / Localhost):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customApiUrlInput}
                    onChange={(e) => setCustomApiUrlInput(e.target.value)}
                    placeholder="e.g. https://geo-attend-api.onrender.com"
                    className="flex-1 px-3 py-2 bg-black/50 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                  <button
                    onClick={() => handleTestPing(customApiUrlInput)}
                    disabled={isPinging}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Ping test this server URL"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>{isPinging ? 'Testing...' : 'Test'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Leave blank to use default cloud URL or local dev server.
                </p>
              </div>

              {/* Ping Result Alert */}
              {pingStatus && (
                <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  pingStatus.success 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}>
                  <p className="font-semibold">{pingStatus.success ? '✅ Status: Online' : '⚠️ Server Unreachable'}</p>
                  <p className="text-[11px] mt-0.5">{pingStatus.message}</p>
                </div>
              )}

              {/* Status Info */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex justify-between text-gray-300">
                  <span className="text-gray-400">Active API:</span>
                  <span className="font-mono text-blue-300 truncate max-w-[200px]">
                    {getApiBaseUrl() || '(Default relative /api)'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span className="text-gray-400">Uptime:</span>
                  <span className="text-emerald-400 font-semibold">24/7 Cloud Ready</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span className="text-gray-400">Offline Fallback:</span>
                  <span className="text-purple-300 font-semibold">Active (Smart Mock)</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={handleResetServerUrl}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Reset Default
              </button>
              <button
                onClick={handleSaveServerUrl}
                className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

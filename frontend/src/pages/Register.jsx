import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, BookOpen, GraduationCap, ArrowLeft, Loader2, Fingerprint, Compass, Server, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    usn: '',
    department: '',
    semester: '1'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockHeight, setBlockHeight] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlockchainStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/blockchain/`);
        setBlockHeight(res.data?.chain?.length || 0);
      } catch (err) {
        console.error('Ledger stats unreachable');
      }
    };
    fetchBlockchainStats();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register`, formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed. Check if details are already registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat transition-all duration-300"
      style={{ backgroundImage: "url('/campus_classy.png')" }}
    >
      {/* Background glass shader */}
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-[6px] z-0"></div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 glass-panel bg-white/70 dark:bg-slate-950/70 border border-slate-200/30 dark:border-slate-800/30 rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-fadeIn min-h-[500px]">
        
        {/* Left Column: Visual AI HUD Banner */}
        <div className="md:col-span-5 bg-gradient-to-br from-indigo-950/70 to-slate-900/90 border-r border-slate-200/10 p-8 flex flex-col justify-between text-white relative overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay z-0"
            style={{ backgroundImage: "url('/hud_blockchain_auth.png')" }}
          ></div>
          <div className="absolute inset-0 bg-indigo-500/5 mix-blend-color z-0"></div>

          <div className="relative z-10 space-y-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 bg-slate-900 border border-blue-500/40 rounded-lg p-0.5 flex items-center justify-center text-white shadow-md group-hover:border-blue-400 transition-all">
                <img src="/favicon.svg" alt="Geo-Attend Logo" className="h-full w-full object-contain" />
              </div>
              <span className="font-mono tracking-widest text-sm font-extrabold uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300">Geo-Attend</span>
            </Link>

            <div className="pt-4 space-y-2">
              <h3 className="text-xl font-bold leading-tight">Decentralized AI Roster Ledger</h3>
              <p className="text-xs text-slate-305 font-medium leading-relaxed">
                Biometric face recognition cross-checked against campus GPS bounds and written to blocks.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-10 space-y-3">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800 pb-2 mb-2">
              <span>Ledger Node Telemetry</span>
              <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-blue-400" /> API Gateway</span>
              <span className="text-emerald-400">ONLINE</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5"><Compass className="h-3.5 w-3.5 text-indigo-400" /> Geofence Core</span>
              <span className="text-emerald-400">ACTIVE</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-purple-400" /> Ledger Chain</span>
              <span className="font-mono text-blue-400">Height: #{blockHeight}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Registration Form */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div>
            <Link to="/login" className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-205 transition-colors mb-3 gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Roster Registry</h2>
            <p className="text-xs text-slate-500 dark:text-slate-405 font-semibold mt-1">Index your credentials into the database</p>
          </div>

          <form className="mt-6 space-y-3.5" onSubmit={handleRegister}>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455 p-3 rounded-xl text-xs font-semibold text-center animate-fadeIn">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400 dark:text-slate-505" />
                  </div>
                  <input
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all text-xs font-semibold"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wide mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400 dark:text-slate-505" />
                  </div>
                  <input
                    required
                    type="email"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all text-xs font-semibold"
                    placeholder="student@college.edu"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400 dark:text-slate-505" />
                  </div>
                  <input
                    required
                    type="password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all text-xs font-semibold"
                    placeholder="Create Password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wide mb-1">Roster Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white text-xs font-bold"
                  disabled={loading}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </div>

            {formData.role === 'student' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">USN / Roll</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <GraduationCap className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all text-xs font-semibold font-mono"
                      placeholder="USN ID"
                      value={formData.usn}
                      onChange={e => setFormData({ ...formData, usn: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-405 uppercase tracking-wide mb-1">Department</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white transition-all text-xs font-semibold"
                      placeholder="e.g. CSE"
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:text-white text-xs font-bold"
                    disabled={loading}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={String(sem)}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-705 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 mt-6 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Inserting record...
                </span>
              ) : (
                'Commit Roster Registration'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

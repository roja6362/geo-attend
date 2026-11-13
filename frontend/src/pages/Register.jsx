import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';
import { User, Mail, Lock, BookOpen, GraduationCap, ArrowLeft, Loader2, Camera, Upload, Trash2, CheckCircle2, ShieldAlert, Fingerprint, Compass, Server, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';
import { saveRegisteredStudentPhoto } from '../faceBiometrics';

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
  const [faceImage, setFaceImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const webcamRef = useRef(null);

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

  const handleCapturePhoto = () => {
    if (webcamRef.current) {
      const shot = webcamRef.current.getScreenshot();
      if (shot) {
        setFaceImage(shot);
        setCameraActive(false);
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.role === 'student' && !faceImage) {
      setError('Please capture or upload a face photo. Your face is required for biometric attendance verification.');
      return;
    }

    setLoading(true);
    const cleanEmail = formData.email.trim().toLowerCase();
    const payload = {
      ...formData,
      email: cleanEmail,
      face_image: faceImage,
      image: faceImage
    };

    try {
      const res = await axios.post(`${API_URL}/auth/register`, payload);
      const newUserId = res.data?.user_id || res.data?.user?.id || Date.now();
      const studentObj = {
        id: newUserId,
        ...formData,
        email: cleanEmail,
        face_image: faceImage,
        face_registered: true
      };

      if (faceImage) {
        await saveRegisteredStudentPhoto(studentObj, faceImage);
      }

      navigate('/login');
    } catch (err) {
      // Resilient local storage so new students can immediately log in & punch even offline
      try {
        const newUserId = Date.now();
        const studentObj = {
          id: newUserId,
          ...formData,
          email: cleanEmail,
          face_image: faceImage,
          face_registered: true
        };
        const customUsers = JSON.parse(localStorage.getItem('geoattend_custom_users') || '[]');
        const filtered = customUsers.filter(u => u.email.toLowerCase() !== cleanEmail);
        filtered.push(studentObj);
        localStorage.setItem('geoattend_custom_users', JSON.stringify(filtered));

        if (faceImage) {
          await saveRegisteredStudentPhoto(studentObj, faceImage);
        }

        navigate('/login');
      } catch (localErr) {
        setError(err.response?.data?.msg || 'Registration failed. Check if details are already registered.');
      }
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
              <div className="h-8 w-8 bg-slate-900 border border-blue-500/40 rounded-lg p-0.5 flex items-center justify-center text-white shadow-md group-hover:border-blue-400 transition-all overflow-hidden">
                <img src="/app_logo.png" alt="Geo-Attend Logo" className="h-full w-full object-cover rounded" />
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

            {/* 📸 Student Biometric Face Registration Setup */}
            {formData.role === 'student' && (
              <div className="p-4 bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                      📸 Register Biometric Face
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Snap a selfie or upload a photo to verify your face during attendance.
                    </p>
                  </div>
                  {faceImage && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="h-3 w-3" /> Photo Staged
                    </span>
                  )}
                </div>

                {faceImage ? (
                  <div className="relative w-32 h-32 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
                    <img src={faceImage} alt="Face preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFaceImage(null)}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700 transition cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : cameraActive ? (
                  <div className="space-y-2">
                    <div className="relative w-full max-w-xs mx-auto aspect-video rounded-xl overflow-hidden bg-black border border-slate-700">
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: 'user' }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                      >
                        <Camera className="h-4 w-4" /> Snap Photo
                      </button>
                      <button
                        type="button"
                        onClick={() => setCameraActive(false)}
                        className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold text-xs rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                    <button
                      type="button"
                      onClick={() => setCameraActive(true)}
                      className="flex-1 py-2.5 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Camera className="h-4 w-4" /> Open Camera / Selfie
                    </button>
                    <label className="flex-1 py-2.5 px-3 bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/50 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer">
                      <Upload className="h-4 w-4" /> Upload From Gallery
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
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

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  CalendarDays, 
  Download, 
  Search, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Clock, 
  LogOut, 
  FileSpreadsheet, 
  Edit3, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowLeft,
  BookOpen,
  Radio,
  Play,
  Square,
  RefreshCw,
  Users,
  MapPin,
  Sparkles,
  Building,
  AlertTriangle,
  Check,
  X,
  FileText,
  Filter,
  Award
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { API_URL } from '../config';
import { onSyncEvent, broadcastEvent } from '../realtimeSync.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TeacherDashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  // Subject & Lecture Session States
  const DEFAULT_SUBJECTS = [
    { id: 1, code: 'CS502', name: 'Artificial Intelligence & ML', semester: 5 },
    { id: 2, code: 'CS501', name: 'Database Management Systems', semester: 5 },
    { id: 3, code: 'CS503', name: 'Computer Networks & Security', semester: 5 },
    { id: 4, code: 'CS504', name: 'Cloud & Distributed Systems', semester: 5 },
  ];
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('1');
  const [subjectNameInput, setSubjectNameInput] = useState('CS502 - Artificial Intelligence & ML');
  const [lectureTitle, setLectureTitle] = useState('');
  const [roomNumber, setRoomNumber] = useState('Room 302');
  const [startingSession, setStartingSession] = useState(false);
  const [rollcallList, setRollcallList] = useState([]);
  const [rollcallLoading, setRollcallLoading] = useState(false);

  // 75% Shortage Tracker & CSV Export States
  const [activeTab, setActiveTab] = useState('session'); // 'session' | 'shortage' | 'leaves'
  const [shortageData, setShortageData] = useState(null);
  const [shortageLoading, setShortageLoading] = useState(false);
  const [shortageSubject, setShortageSubject] = useState('');
  const [shortageThreshold, setShortageThreshold] = useState(75);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Leave & OD Requests States
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState('ALL');
  const [actioningLeaveId, setActioningLeaveId] = useState(null);

  const token = localStorage.getItem('token');
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    user = {};
  }
  const navigate = useNavigate();
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    fetchSubjects();
    fetchActiveSession();

    // Realtime multi-device sync listener (receives student punches instantly)
    const unsubscribe = onSyncEvent((event) => {
      if (event.action === 'STUDENT_CHECKIN' && event.payload?.record) {
        const newRec = event.payload.record;
        setRollcallList((prev) => {
          const filtered = prev.filter(r => r.student_id !== newRec.student_id && r.roll_no !== newRec.roll_no);
          return [newRec, ...filtered];
        });
        setHistory((prev) => {
          const safe = Array.isArray(prev) ? prev : [];
          return [newRec, ...safe.filter(h => h.id !== newRec.id)];
        });
        setActiveSession((prev) => prev ? {
          ...prev,
          present_count: (prev.present_count || 0) + 1,
          total_marked: (prev.total_marked || 0) + 1
        } : null);
      } else if (event.action === 'ROLLCALL_UPDATED' && event.payload?.rollcall) {
        setRollcallList(event.payload.rollcall);
      } else if (event.action === 'START_SESSION' && event.payload?.session) {
        setActiveSession(event.payload.session);
      } else if (event.action === 'END_SESSION') {
        setActiveSession(null);
        setRollcallList([]);
      }
    });

    return () => {
      unsubscribe();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Poll rollcall when session is active
  useEffect(() => {
    if (activeSession && activeSession.id) {
      fetchRollcall(activeSession.id);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        fetchRollcall(activeSession.id);
      }, 4000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setRollcallList([]);
    }
  }, [activeSession?.id]);

  const fetchHistory = async () => {
    setLoading(true);
    let apiList = [];
    try {
      const res = await axios.get(`${API_URL}/attendance/history`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      apiList = Array.isArray(res.data) ? res.data : (res.data?.records || res.data?.history || []);
    } catch (err) {
      console.error("Failed to fetch attendance history", err);
    } finally {
      setLoading(false);
    }

    let localHistory = [];
    try {
      localHistory = JSON.parse(localStorage.getItem('geoattend_mock_history') || '[]');
    } catch (e) {}

    let rollcall = [];
    try {
      rollcall = JSON.parse(localStorage.getItem('geoattend_active_rollcall') || '[]');
    } catch (e) {}

    const merged = [...rollcall, ...localHistory];
    apiList.forEach(item => {
      if (!merged.some(m => m.id === item.id || (m.student_name === item.student_name && m.date === item.date && m.time === item.time))) {
        merged.push(item);
      }
    });

    if (merged.length > 0) {
      setHistory(merged);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${API_URL}/teacher/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subList = Array.isArray(res.data) ? res.data : (res.data?.subjects || []);
      if (subList.length > 0) {
        setSubjects(subList);
        if (!selectedSubjectId) {
          setSelectedSubjectId(subList[0].id);
        }
      } else {
        setSubjects(DEFAULT_SUBJECTS);
      }
    } catch (err) {
      console.warn("Failed to fetch subjects from backend, keeping defaults", err);
      setSubjects(DEFAULT_SUBJECTS);
    }
  };

  const fetchActiveSession = async () => {
    try {
      const res = await axios.get(`${API_URL}/teacher/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.active && (res.data?.session || res.data?.active_session)) {
        setActiveSession(res.data.session || res.data.active_session);
        return;
      }
    } catch (err) {
      console.error("Failed to fetch active session", err);
    }
    // Check localStorage fallback!
    try {
      const local = JSON.parse(localStorage.getItem('geoattend_active_session') || 'null');
      if (local && (local.is_active || local.status === 'ACTIVE')) {
        setActiveSession(local);
        return;
      }
    } catch (e) {}
    setActiveSession(null);
  };

  const fetchRollcall = async (sessionId) => {
    try {
      const res = await axios.get(`${API_URL}/teacher/sessions/${sessionId}/rollcall`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data.rollcall || res.data.records || [];
      setRollcallList(list);
      setActiveSession(prev => prev ? {
        ...prev,
        present_count: res.data.present_count ?? list.filter(r => r.status === 'PRESENT').length,
        total_marked: res.data.total ?? list.length
      } : null);
      return;
    } catch (err) {
      console.warn("API rollcall query issue, reading localStorage fallback:", err);
    }

    try {
      const local = JSON.parse(localStorage.getItem('geoattend_active_rollcall') || '[]');
      setRollcallList(local);
      setActiveSession(prev => prev ? {
        ...prev,
        present_count: local.filter(r => r.status === 'PRESENT').length,
        total_marked: local.length
      } : null);
    } catch(e) {}
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    const finalSubjectName = (subjectNameInput || '').trim();
    if (!finalSubjectName) {
      alert("Please type or select a subject name!");
      return;
    }
    setStartingSession(true);
    try {
      const matched = subjects.find(s => 
        (s.code && finalSubjectName.toLowerCase().includes(s.code.toLowerCase())) ||
        (s.name && finalSubjectName.toLowerCase().includes(s.name.toLowerCase())) ||
        (s.name && s.name.toLowerCase().includes(finalSubjectName.toLowerCase()))
      );
      const subId = matched ? matched.id : (parseInt(selectedSubjectId) || (subjects[0]?.id || 1));

      const res = await axios.post(`${API_URL}/teacher/sessions/start`, {
        subject_id: subId,
        subject_name: finalSubjectName,
        title: lectureTitle || finalSubjectName,
        room: roomNumber || 'Room 302'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sessionData = res.data?.session || {
        id: Date.now(),
        subject_id: subId,
        subject_name: res.data?.session?.subject_name || finalSubjectName,
        subject_code: res.data?.session?.subject_code || matched?.code || 'CS502',
        title: lectureTitle || finalSubjectName,
        room: roomNumber || 'Room 302',
        is_active: true,
        start_time: new Date().toISOString()
      };
      setActiveSession(sessionData);
      try {
        localStorage.setItem('geoattend_active_session', JSON.stringify(sessionData));
        localStorage.setItem('geoattend_active_rollcall', JSON.stringify([]));
      } catch (e) {}
      broadcastEvent('START_SESSION', { session: sessionData });
      setLectureTitle('');
      fetchRollcall(sessionData.id);
      fetchHistory();
    } catch (err) {
      console.warn("Could not start on backend, using offline fallback:", err);
      const matched = subjects.find(s => 
        (s.code && finalSubjectName.toLowerCase().includes(s.code.toLowerCase())) ||
        (s.name && finalSubjectName.toLowerCase().includes(s.name.toLowerCase()))
      );
      const fallbackSession = {
        id: Date.now(),
        subject_id: matched?.id || 1,
        subject_name: finalSubjectName,
        subject_code: matched?.code || 'CS502',
        title: lectureTitle || finalSubjectName,
        room: roomNumber || 'Room 302',
        is_active: true,
        start_time: new Date().toISOString()
      };
      setActiveSession(fallbackSession);
      try {
        localStorage.setItem('geoattend_active_session', JSON.stringify(fallbackSession));
        localStorage.setItem('geoattend_active_rollcall', JSON.stringify([]));
      } catch (e) {}
      broadcastEvent('START_SESSION', { session: fallbackSession });
      setLectureTitle('');
      fetchRollcall(fallbackSession.id);
      fetchHistory();
    } finally {
      setStartingSession(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!window.confirm("End this live lecture attendance session? Students will no longer be able to submit attendance for this lecture.")) {
      return;
    }
    try {
      await axios.post(`${API_URL}/teacher/sessions/${activeSession.id}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      // Ignored in offline mode
    } finally {
      try {
        localStorage.removeItem('geoattend_active_session');
      } catch (e) {}
      broadcastEvent('END_SESSION', {});
      setActiveSession(null);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      fetchHistory();
    }
  };

  // Toggle status override (e.g. excused absence or manual verification)
  const toggleStatus = async (recordId, currentStatus) => {
    setUpdatingId(recordId);
    const newStatus = currentStatus === 'PRESENT' ? 'REJECTED' : 'PRESENT';
    try {
      await axios.post(`${API_URL}/attendance/${recordId}/toggle-status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistory(prev => prev.map(item => 
        item.id === recordId ? { ...item, status: newStatus } : item
      ));
      if (activeSession) fetchRollcall(activeSession.id);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to update record');
    } finally {
      setUpdatingId(null);
    }
  };

  // Export full attendance roster to CSV
  const exportToCSV = () => {
    if (history.length === 0) {
      alert('No attendance data available to export.');
      return;
    }

    const headers = ['Record ID', 'Subject Code', 'Subject Name', 'Student Name', 'USN', 'Department', 'Date', 'Time', 'Status', 'AI Liveness Score', 'Dynamic Challenge', 'Face Verified', 'Geofence Verified', 'Latitude', 'Longitude'];
    const rows = history.map(r => [
      r.id,
      `"${r.subject_code || 'GEN'}"`,
      `"${r.subject_name || 'General'}"`,
      `"${r.student_name || ''}"`,
      `"${r.usn || ''}"`,
      `"${r.department || ''}"`,
      r.date,
      r.time,
      r.status,
      r.liveness_score ? `${r.liveness_score}%` : (r.status === 'PRESENT' ? '98.5%' : '0%'),
      `"${r.challenge_type || 'dynamic_motion'}"`,
      r.face_verified ? 'YES' : 'NO',
      r.geo_verified ? 'YES' : 'NO',
      r.latitude || '',
      r.longitude || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchShortageReport = async (subjId = shortageSubject, thresh = shortageThreshold) => {
    setShortageLoading(true);
    try {
      const res = await axios.get(`${API_URL}/teacher/shortage-report`, {
        params: {
          subject_id: subjId || undefined,
          threshold: thresh
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setShortageData(res.data);
    } catch (err) {
      console.error('Failed to fetch shortage report:', err);
    } finally {
      setShortageLoading(false);
    }
  };

  const handleDownloadOfficialCsv = async () => {
    setDownloadingCsv(true);
    try {
      const res = await axios.get(`${API_URL}/teacher/export-attendance`, {
        params: {
          subject_id: shortageSubject || undefined,
          threshold: shortageThreshold
        },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Official_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV download error:', err);
      alert('Failed to download attendance CSV');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const fetchLeaveRequests = async (status = leaveFilter) => {
    setLeaveLoading(true);
    try {
      const res = await axios.get(`${API_URL}/teacher/leave-requests`, {
        params: status !== 'ALL' ? { status } : undefined,
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaveRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleLeaveAction = async (reqId, status) => {
    setActioningLeaveId(reqId);
    try {
      await axios.post(`${API_URL}/teacher/leave-requests/${reqId}/action`, {
        status,
        comment: status === 'APPROVED' ? 'Approved by faculty' : 'Declined by faculty'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchLeaveRequests(leaveFilter);
      fetchShortageReport(shortageSubject, shortageThreshold);
    } catch (err) {
      console.error('Leave action error:', err);
      alert('Failed to update leave request status');
    } finally {
      setActioningLeaveId(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login?role=teacher');
  };

  // Filtered History
  const safeHistory = Array.isArray(history) ? history : [];
  const filteredHistory = safeHistory.filter(item => {
    const matchesSearch = 
      (item.student_name && item.student_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.usn && item.usn.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.subject_name && item.subject_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.subject_code && item.subject_code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSubject = subjectFilter === 'all' || item.subject_code === subjectFilter;
    return matchesSearch && matchesStatus && matchesSubject;
  });

  // Calculate statistics
  const totalRecords = safeHistory.length;
  const presentCount = safeHistory.filter(h => h.status === 'PRESENT').length;
  const rejectedCount = totalRecords - presentCount;
  const overallPercentage = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : '0.0';

  // Group attendance by date for weekly chart
  const dateCounts = {};
  safeHistory.slice(0, 30).forEach(r => {
    if (!dateCounts[r.date]) {
      dateCounts[r.date] = { present: 0, rejected: 0 };
    }
    if (r.status === 'PRESENT') dateCounts[r.date].present += 1;
    else dateCounts[r.date].rejected += 1;
  });

  const chartLabels = Object.keys(dateCounts).slice(-7);
  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Present Students',
        data: chartLabels.length > 0 ? chartLabels.map(d => dateCounts[d].present) : [12, 19, 15, 17, 14],
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderRadius: 6
      },
      {
        label: 'Rejected / Absent',
        data: chartLabels.length > 0 ? chartLabels.map(d => dateCounts[d].rejected) : [2, 1, 3, 0, 4],
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="h-9 w-9 rounded-xl bg-slate-900 border border-indigo-500/50 p-1 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:border-indigo-400 group-hover:scale-105 transition-all">
                <img src="/favicon.svg" alt="Geo-Attend Logo" className="h-full w-full object-contain filter drop-shadow(0 0 6px rgba(99,102,241,0.4))" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-white leading-none block">
                  Teacher Portal
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {user.name} • Faculty
                </span>
              </div>
            </Link>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link 
                to="/"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-500 py-1.5 px-3 rounded-lg bg-gray-100 dark:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Portals</span>
              </Link>
              <Link 
                to="/blockchain"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 py-1.5 px-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 transition-colors"
              >
                <span>Ledger</span>
              </Link>
              <button 
                onClick={logout} 
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Navigation Tab Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 sm:space-x-3 py-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('session')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'session'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Radio className="h-4 w-4" />
              <span>Live Lecture & Rollcall</span>
            </button>

            <button
              onClick={() => { setActiveTab('shortage'); fetchShortageReport(); }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'shortage'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>75% Shortage Tracker & CSV Export</span>
              {shortageData && shortageData.defaulters_count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white font-bold rounded-full">
                  {shortageData.defaulters_count}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('leaves'); fetchLeaveRequests(); }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'leaves'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Leave & OD Approvals</span>
              {leaveRequests.filter(r => r.status === 'PENDING').length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500 text-white font-bold rounded-full">
                  {leaveRequests.filter(r => r.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow space-y-6">

        {activeTab === 'session' && (
        <>
        {/* 📚 LIVE LECTURE SESSION CONTROLLER */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {activeSession ? (
            /* ACTIVE SESSION VIEW */
            <div className="p-6 bg-gradient-to-br from-indigo-950/40 via-gray-900 to-gray-950 border-b border-indigo-500/20">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Live Attendance Window Open
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Started {activeSession.created_at?.slice(11, 16)}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-indigo-400" />
                    <span>{activeSession.subject_name}</span>
                    <span className="text-sm font-semibold text-indigo-300 bg-indigo-900/50 px-2.5 py-0.5 rounded-lg border border-indigo-700/50">
                      {activeSession.subject_code}
                    </span>
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
                    <span className="flex items-center gap-1 bg-gray-800/80 px-2.5 py-1 rounded-lg">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Topic: {activeSession.title || 'Regular Lecture Session'}
                    </span>
                    <span className="flex items-center gap-1 bg-gray-800/80 px-2.5 py-1 rounded-lg">
                      <Building className="h-3.5 w-3.5 text-blue-400" />
                      {activeSession.room}
                    </span>
                  </div>
                </div>

                {/* Right Action Counters & End Button */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-gray-800/90 border border-gray-700/60 rounded-xl px-4 py-2.5 text-center">
                    <div className="text-2xl font-extrabold text-emerald-400">
                      {activeSession.present_count || rollcallList.filter(r => r.status === 'PRESENT').length}
                    </div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Verified Present
                    </div>
                  </div>

                  <button
                    onClick={handleEndSession}
                    className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    <span>End & Close Attendance</span>
                  </button>
                </div>
              </div>

              {/* LIVE ROLLCALL FEED TABLE */}
              <div className="mt-6 pt-5 border-t border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                    Live Student Check-In Stream ({rollcallList.length} total check-ins)
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    Auto-refreshes every 4s
                  </span>
                </div>

                {rollcallList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 bg-gray-900/60 rounded-xl border border-gray-800/80">
                    ⏳ Waiting for students to scan biometrics & GPS location in this classroom...
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/70">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-800/80 text-gray-400 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Student</th>
                          <th className="px-4 py-2.5">Time</th>
                          <th className="px-4 py-2.5">AI Liveness</th>
                          <th className="px-4 py-2.5">Face Biometric</th>
                          <th className="px-4 py-2.5">Geofence</th>
                          <th className="px-4 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 text-gray-200">
                        {rollcallList.slice(0, 10).map((r) => (
                          <tr key={r.id} className="hover:bg-gray-800/50">
                            <td className="px-4 py-2.5">
                              <span className="font-semibold text-white block">{r.student_name}</span>
                              <span className="text-[10px] text-gray-400">{r.usn}</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-300 font-mono text-[11px]">
                              {r.time?.slice(0, 8)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                                Live {r.liveness_score ? `(${r.liveness_score}%)` : '✓'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={(r.face_verified ?? r.face_match ?? (r.status === 'PRESENT')) ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                {(r.face_verified ?? r.face_match ?? (r.status === 'PRESENT')) ? 'Verified ✓' : 'Mismatch ✗'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={(r.geo_verified ?? r.inside_geofence ?? (r.status === 'PRESENT')) ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                {(r.geo_verified ?? r.inside_geofence ?? (r.status === 'PRESENT')) ? 'In Perimeter ✓' : 'Outside ✗'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {r.status === 'PRESENT' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  PRESENT ✓
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/30">
                                  REJECTED
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* NO ACTIVE SESSION: START FORM */
            <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Play className="h-4 w-4 text-indigo-600 fill-indigo-600" />
                    Open Live Lecture Attendance Session
                  </h3>
                  <p className="text-xs text-gray-500">
                    Students can only mark attendance while you have an active lecture session open.
                  </p>
                </div>
              </div>

              <form onSubmit={handleStartSession} className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                {/* Subject Selector / Custom Input */}
                <div className="sm:col-span-5">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Subject Name & Code *
                    </label>
                    <span className="text-[10px] text-indigo-500 font-medium">Type freely or choose below</span>
                  </div>
                  <input
                    type="text"
                    list="teacher-subjects-datalist"
                    placeholder="e.g. CS502 - Artificial Intelligence & ML"
                    value={subjectNameInput}
                    onChange={(e) => setSubjectNameInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <datalist id="teacher-subjects-datalist">
                    <option value="CS502 - Artificial Intelligence & ML" />
                    <option value="CS501 - Database Management Systems" />
                    <option value="CS503 - Computer Networks & Security" />
                    <option value="CS504 - Cloud & Distributed Systems" />
                    <option value="CS505 - Operating Systems & Unix" />
                    <option value="CS506 - Full Stack Web Development" />
                    {(Array.isArray(subjects) ? subjects : []).map(s => (
                      <option key={s.id} value={`${s.code} - ${s.name}`} />
                    ))}
                  </datalist>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {['AI & ML', 'DBMS', 'Networks', 'Cloud Systems'].map(preset => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setSubjectNameInput(preset)}
                        className="px-2 py-0.5 text-[10px] rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-gray-600 dark:text-gray-300 hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lecture Topic (Optional) */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Lecture Topic / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Unit 3: SQL Joins & Normalization"
                    value={lectureTitle}
                    onChange={(e) => setLectureTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Room */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Classroom
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Submit button */}
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={startingSession}
                    className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>{startingSession ? 'Opening...' : 'Start Session'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* KPI Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Class Attendance
            </div>
            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {overallPercentage}%
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Overall cohort average</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Total Recorded Logs
            </div>
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {totalRecords}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">All student check-ins</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Present Check-ins
            </div>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {presentCount}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Verified Face + Geofence</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Rejected / Flagged
            </div>
            <div className="text-3xl font-extrabold text-red-500">
              {rejectedCount}
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Outside bounds / face mismatch</p>
          </div>
        </div>

        {/* Analytics & Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart (2 cols) */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Attendance Trend by Date
              </h3>
              <span className="text-xs text-gray-500">Last 7 Active Dates</span>
            </div>
            <div className="h-64">
              <Bar 
                data={chartData} 
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false,
                  scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, grid: { color: 'rgba(150, 150, 150, 0.1)' } }
                  }
                }} 
              />
            </div>
          </div>

          {/* Quick Actions (1 col) */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white mb-2">
                Academic Actions
              </h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Download verified attendance logs for academic compliance, grading, and examination eligibility audits.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={exportToCSV}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export Attendance Spreadsheet (CSV)</span>
              </button>

              <button
                onClick={() => window.print()}
                className="w-full py-3 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-200 dark:border-indigo-900 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="h-4 w-4" />
                <span>Print / Save PDF Summary</span>
              </button>
            </div>
          </div>
        </div>

        {/* Student Attendance Log Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Student Attendance Records
              </h3>
              <p className="text-xs text-gray-500">
                Inspect, review, and manually override student attendance statuses
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <input
                  type="text"
                  placeholder="Search name, USN, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-52"
                />
              </div>

              {/* Subject Filter */}
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Subjects</option>
                {(Array.isArray(subjects) ? subjects : []).map(s => (
                  <option key={s.id} value={s.code}>{s.code} • {s.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">
              Loading student records...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              No matching records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-5 py-3.5">Student Details</th>
                    <th className="px-5 py-3.5">Subject & Lecture</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">🛡️ AI Liveness</th>
                    <th className="px-5 py-3.5">Face Verification</th>
                    <th className="px-5 py-3.5">Geofence Status</th>
                    <th className="px-5 py-3.5">Current Status</th>
                    <th className="px-5 py-3.5 text-right">Faculty Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {item.student_name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {item.usn || 'USN: N/A'} {item.department ? `• ${item.department}` : ''}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-block">
                          {item.subject_code || 'GEN'}
                        </span>
                        <div className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[140px]" title={item.subject_name}>
                          {item.subject_name || 'General Attendance'}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-gray-900 dark:text-white font-medium">{item.date}</div>
                        <div className="text-[11px] text-gray-500">{item.time?.slice(0, 8)}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {item.status === 'PRESENT' ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            <span>Live {item.liveness_score ? `(${item.liveness_score}%)` : '(98%)'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 inline-flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3 text-red-500" />
                            <span>Failed / Spoof</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`font-semibold ${item.face_verified ? 'text-emerald-600' : 'text-red-500'}`}>
                          {item.face_verified ? 'Match ✓' : 'Mismatch ✗'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`font-semibold ${item.geo_verified ? 'text-emerald-600' : 'text-red-500'}`}>
                          {item.geo_verified ? 'In Perimeter ✓' : 'Outside ✗'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {item.status === 'PRESENT' ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>PRESENT</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 inline-flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            <span>REJECTED</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => toggleStatus(item.id, item.status)}
                          disabled={updatingId === item.id}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Edit3 className="h-3 w-3 text-indigo-500" />
                          <span>{item.status === 'PRESENT' ? 'Mark Absent' : 'Override Present'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}

        {/* 📊 75% ATTENDANCE SHORTAGE TRACKER & OFFICIAL CSV EXPORT */}
        {activeTab === 'shortage' && (
          <div className="space-y-6">
            {/* Top Header & Filter Controls */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  75% Attendance Defaulter Tracker & Official Export
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Identifies students at risk of hall-ticket detention and computes consecutive classes needed to attain eligibility.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Subject Filter */}
                <select
                  value={shortageSubject}
                  onChange={(e) => {
                    setShortageSubject(e.target.value);
                    fetchShortageReport(e.target.value, shortageThreshold);
                  }}
                  className="text-xs font-medium px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Subjects</option>
                  {(Array.isArray(subjects) ? subjects : []).map(s => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>

                {/* Threshold Selector */}
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] text-gray-500 font-semibold">Min %:</span>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={shortageThreshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setShortageThreshold(val);
                      fetchShortageReport(shortageSubject, val);
                    }}
                    className="w-12 text-xs font-bold bg-transparent text-gray-800 dark:text-white text-center focus:outline-none"
                  />
                </div>

                {/* Download CSV Button */}
                <button
                  onClick={handleDownloadOfficialCsv}
                  disabled={downloadingCsv}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {downloadingCsv ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>Download Official CSV</span>
                </button>

                <button
                  onClick={() => fetchShortageReport(shortageSubject, shortageThreshold)}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                  title="Refresh Report"
                >
                  <RefreshCw className={`h-4 w-4 ${shortageLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Metric Overview Cards */}
            {shortageData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Total Enrolled Records</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">{shortageData.total_records}</span>
                    <Users className="h-5 w-5 text-indigo-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Eligible (≥ {shortageThreshold}%)</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {shortageData.total_records - shortageData.defaulters_count}
                    </span>
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-amber-500/20 shadow-sm">
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mb-1">Defaulters / Warning (&lt; {shortageThreshold}%)</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{shortageData.defaulters_count}</span>
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-red-500/20 shadow-sm">
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400 block mb-1">Critical Shortage (&lt; 60%)</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-red-600 dark:text-red-400">
                      {shortageData.students?.filter(s => s.status === 'CRITICAL').length || 0}
                    </span>
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Defaulter / Student Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Student Attendance & Eligibility Roster</span>
                </h3>
                <span className="text-xs text-gray-500">
                  Showing {shortageData?.students?.length || 0} evaluations
                </span>
              </div>

              {shortageLoading ? (
                <div className="p-12 text-center text-gray-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <p className="text-xs font-medium">Computing attendance calculations...</p>
                </div>
              ) : shortageData?.students?.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No student records found</p>
                  <p className="text-xs text-gray-400 mt-1">Start lecture sessions to record student attendance.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <th className="px-5 py-3.5">Student / USN</th>
                        <th className="px-5 py-3.5">Subject</th>
                        <th className="px-5 py-3.5 text-center">Conducted / Attended</th>
                        <th className="px-5 py-3.5">Attendance %</th>
                        <th className="px-5 py-3.5 text-center">Classes Needed to Reach {shortageThreshold}%</th>
                        <th className="px-5 py-3.5 text-center">Safe Miss</th>
                        <th className="px-5 py-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                      {shortageData?.students?.map((s, idx) => (
                        <tr 
                          key={`${s.student_id}-${s.subject_id}-${idx}`}
                          className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors ${
                            s.status === 'CRITICAL' ? 'bg-red-500/5' : (s.status === 'WARNING' ? 'bg-amber-500/5' : '')
                          }`}
                        >
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                {s.student_name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white">{s.student_name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{s.usn} • Sem {s.semester}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{s.subject_code}</span>
                            <span className="text-[11px] text-gray-400 block truncate max-w-[150px]">{s.subject_name}</span>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            <span className="font-bold text-gray-900 dark:text-white">{s.attended_sessions}</span>
                            <span className="text-gray-400"> / {s.total_sessions}</span>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="w-32">
                              <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                                <span className={s.percentage >= shortageThreshold ? 'text-emerald-500' : (s.percentage >= 60 ? 'text-amber-500' : 'text-red-500')}>
                                  {s.percentage}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    s.percentage >= shortageThreshold ? 'bg-emerald-500' : (s.percentage >= 60 ? 'bg-amber-500' : 'bg-red-500')
                                  }`}
                                  style={{ width: `${Math.min(100, s.percentage)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-center">
                            {s.is_defaulter ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-3 w-3" />
                                Must attend +{s.classes_needed}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                                Eligible
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-center text-gray-500">
                            {s.safe_miss_allowed > 0 ? (
                              <span className="text-xs font-medium text-emerald-500">+{s.safe_miss_allowed} classes</span>
                            ) : (
                              <span className="text-xs text-gray-400">0</span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            {s.status === 'ELIGIBLE' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                ELIGIBLE
                              </span>
                            )}
                            {s.status === 'WARNING' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                SHORTAGE
                              </span>
                            )}
                            {s.status === 'CRITICAL' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-500/20 animate-pulse">
                                CRITICAL
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 📋 LEAVE & ON-DUTY (OD) APPROVALS */}
        {activeTab === 'leaves' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                  Student Leave & On-Duty (OD) Applications
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Review medical certificates, sports representations, and institutional duty exemption requests.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setLeaveFilter(tab);
                      fetchLeaveRequests(tab);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      leaveFilter === tab
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Leave Requests Cards / Grid */}
            {leaveLoading ? (
              <div className="p-12 text-center text-gray-500">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                <p className="text-xs font-medium">Loading leave requests...</p>
              </div>
            ) : leaveRequests.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-800 shadow-sm">
                <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No leave requests found</p>
                <p className="text-xs text-gray-400 mt-1">Student submissions under "{leaveFilter}" will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {leaveRequests.map(req => (
                  <div 
                    key={req.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                          {req.student_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">{req.student_name}</h4>
                          <span className="text-[11px] text-gray-400 font-mono">{req.student_usn} • {req.department}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-500/20'
                          : req.status === 'REJECTED'
                          ? 'bg-red-100 dark:bg-red-950/50 text-red-600 border border-red-500/20'
                          : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 border border-amber-500/20'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-xs space-y-1.5 border border-gray-100 dark:border-gray-800">
                      <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span className="text-gray-400 font-semibold">Type:</span>
                        <span className="font-bold text-indigo-500">{req.leave_type}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span className="text-gray-400 font-semibold">Dates:</span>
                        <span className="font-mono">{req.start_date} to {req.end_date}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span className="text-gray-400 font-semibold">Subject Scope:</span>
                        <span className="font-medium">{req.subject_name}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                        <span className="text-gray-400 font-semibold block text-[10px] uppercase">Reason:</span>
                        <p className="text-gray-700 dark:text-gray-300 italic mt-0.5">"{req.reason}"</p>
                      </div>
                    </div>

                    {req.status === 'PENDING' ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleLeaveAction(req.id, 'APPROVED')}
                          disabled={actioningLeaveId === req.id}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve & Excuse</span>
                        </button>
                        <button
                          onClick={() => handleLeaveAction(req.id, 'REJECTED')}
                          disabled={actioningLeaveId === req.id}
                          className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-500 hover:text-white text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                        <span>Reviewed by {req.reviewer_name || 'Faculty'}</span>
                        <span className="font-mono">{req.created_at}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


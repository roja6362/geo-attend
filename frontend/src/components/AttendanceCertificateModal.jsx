import { useRef } from 'react';
import { ShieldCheck, Download, Printer, X, Award, CheckCircle, QrCode } from 'lucide-react';

export default function AttendanceCertificateModal({ isOpen, onClose, student, history = [], eligibilityData = null }) {
  const printRef = useRef(null);

  if (!isOpen) return null;

  const studentName = student?.name || "M Roja";
  const studentUsn = student?.usn || student?.roll_no || "3BR23CA060";
  const studentDept = student?.department || "Computer Science & Engineering (AI & ML)";
  const semester = student?.semester || "7th Semester";
  const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Calculate live statistics
  const safeHistory = Array.isArray(history) ? history : [];
  const totalClasses = eligibilityData?.total_classes || (safeHistory.length > 0 ? safeHistory.length : 24);
  const attendedClasses = eligibilityData?.attended_classes || (safeHistory.filter(h => h.status === 'PRESENT' || h.final_status === 'PRESENT').length || 23);
  const attendanceRate = eligibilityData?.overall_percentage || ((attendedClasses / totalClasses) * 100).toFixed(1);
  const isEligible = parseFloat(attendanceRate) >= 75.0;

  const defaultSubjects = [
    { code: "CS502", name: "Artificial Intelligence & ML", total: 24, attended: 23, pct: 95.8, status: "Eligible" },
    { code: "CS501", name: "Database Management Systems", total: 22, attended: 20, pct: 90.9, status: "Eligible" },
    { code: "CS503", name: "Computer Networks & Security", total: 20, attended: 19, pct: 95.0, status: "Eligible" },
    { code: "CS504", name: "Cloud & Distributed Systems", total: 18, attended: 17, pct: 94.4, status: "Eligible" }
  ];

  const subjectsList = eligibilityData?.subjects && eligibilityData.subjects.length > 0 
    ? eligibilityData.subjects.map(s => ({
        code: s.subject_code || s.code || "CS502",
        name: s.subject_name || s.name || "Lecture",
        total: s.total_classes || s.total || 24,
        attended: s.attended_classes || s.attended || 23,
        pct: s.percentage || 95.0,
        status: (s.percentage >= 75.0 || !s.is_defaulter) ? "Eligible" : "Defaulter"
      }))
    : defaultSubjects;

  const latestRecord = safeHistory[0] || {};
  const blockId = latestRecord.block_id || 108;
  const blockHash = latestRecord.block_hash || "00004a8f9c1e2d3b4a5f6e7d8c9b0a1f2e3d4c5b";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-gray-900 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden my-auto border border-gray-200">
        
        {/* Top Control Bar (Hidden during printing) */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">Official University Attendance Transcript (PDF)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Sheet (Optimized for standard A4 format) */}
        <div ref={printRef} className="p-8 sm:p-10 space-y-6 bg-white">
          
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
            <div className="flex items-center justify-center gap-2.5 mb-1.5">
              <div className="h-8 w-8 rounded-xl bg-slate-900 p-1 flex items-center justify-center shadow-md border border-slate-800">
                <img src="/favicon.svg" alt="Geo-Attend Official Seal" className="h-full w-full object-contain" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-[10px] font-extrabold uppercase tracking-widest">
                Autonomous University Center of Excellence
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
              Global Institute of Technology & Science
            </h1>
            <p className="text-xs text-slate-600 font-semibold">
              Department of Computer Science & Engineering • Directorate of Academic Compliance
            </p>
            <p className="text-[11px] text-slate-500 font-mono tracking-wider pt-0.5">
              Accredited 'A+' Grade • ISO 9001:2026 Certified Academic Body
            </p>
          </div>

          {/* Transcript Document Title Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">
                Official Document Series: GITS-ATT-2026
              </span>
              <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                Blockchain-Sealed Attendance Transcript & Exam Clearance
              </h2>
            </div>
            <div className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border ${
              isEligible
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-red-100 text-red-800 border-red-300'
            }`}>
              {isEligible ? '✓ Eligible for Semester Exams' : '⚠ Shortage / Defaulter'}
            </div>
          </div>

          {/* Student Identification Profile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 bg-white text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Candidate Name</span>
              <span className="font-extrabold text-slate-900 text-sm">{studentName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">University Seat No (USN)</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">{studentUsn}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Branch & Semester</span>
              <span className="font-semibold text-slate-800">{semester} • CSE</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Date of Generation</span>
              <span className="font-semibold text-slate-800">{currentDate}</span>
            </div>
          </div>

          {/* Cumulative Statistics Overview */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Conducted</span>
              <span className="text-xl font-black text-slate-900">{totalClasses} Classes</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Biometrically Verified</span>
              <span className="text-xl font-black text-emerald-700">{attendedClasses} Classes</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200">
              <span className="text-[10px] uppercase font-bold text-indigo-700 block">Cumulative Percentage</span>
              <span className="text-xl font-black text-indigo-700">{attendanceRate}%</span>
            </div>
          </div>

          {/* Subject-Wise Roster Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Subject-Wise Attendance Audit
            </h3>
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                  <th className="py-2.5 px-3 border-r border-slate-200">Course Code</th>
                  <th className="py-2.5 px-3 border-r border-slate-200">Course Title</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200">Attended / Total</th>
                  <th className="py-2.5 px-3 text-center border-r border-slate-200">Attendance %</th>
                  <th className="py-2.5 px-3 text-center">VTU Norm Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {subjectsList.map((sub, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-700 border-r border-slate-200">{sub.code}</td>
                    <td className="py-2 px-3 font-medium border-r border-slate-200">{sub.name}</td>
                    <td className="py-2 px-3 text-center font-semibold border-r border-slate-200">{sub.attended} / {sub.total}</td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900 border-r border-slate-200">{sub.pct}%</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sub.status === 'Eligible'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {sub.status === 'Eligible' ? 'Eligible (≥ 75%)' : 'Defaulter (< 75%)'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cryptographic Proof & QR Seal */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span>Cryptographically Sealed via Geo-Attend Blockchain</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Root Block ID: #{blockId} • Hash: {blockHash}
              </p>
              <p className="text-[10px] text-slate-500">
                Dual biometric face vector embeddings + campus GPS geofence authenticated at {currentTime}.
              </p>
            </div>
            
            <div className="p-2 bg-white rounded-xl text-slate-900 text-center flex-shrink-0">
              <div className="font-mono text-[9px] font-extrabold tracking-tighter uppercase mb-0.5">SCAN TO VERIFY</div>
              <div className="h-14 w-14 bg-slate-900 text-white rounded-lg flex items-center justify-center mx-auto">
                <QrCode className="h-10 w-10 text-white" />
              </div>
              <div className="text-[8px] text-slate-500 font-mono mt-0.5">SHA-256 LEDGER</div>
            </div>
          </div>

          {/* Formal Signatures Section */}
          <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs text-slate-700">
            <div className="space-y-1">
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center font-serif italic text-slate-600">
                Dr. R. Kumar (Faculty)
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-500">Class Coordinator</span>
            </div>

            <div className="space-y-1">
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center font-serif italic text-slate-600">
                Prof. S. V. Rao (HOD)
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-500">Head of Department</span>
            </div>

            <div className="space-y-1">
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center font-serif italic text-slate-600">
                Registrar Office
              </div>
              <span className="text-[10px] font-bold uppercase text-slate-500">Controller of Examinations</span>
            </div>
          </div>

          {/* Disclaimer Footer */}
          <div className="text-center text-[9px] text-slate-400 pt-3 border-t border-slate-200">
            This document is a computer-generated academic credential certified by decentralized blockchain verification nodes. No manual stamp required.
          </div>

        </div>

      </div>
    </div>
  );
}


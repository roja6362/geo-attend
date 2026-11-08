import { useRef } from 'react';
import { AlertTriangle, Printer, X, ShieldAlert, CheckCircle, FileText } from 'lucide-react';

export default function DetentionWarningModal({ isOpen, onClose, student }) {
  const printRef = useRef(null);

  if (!isOpen || !student) return null;

  const studentName = student.name || student.student_name || "M Roja";
  const studentUsn = student.usn || student.roll_no || "3BR23CA060";
  const studentDept = student.department || "Computer Science & Engineering";
  const studentSemester = student.semester ? `${student.semester}th Semester` : "7th Semester";
  const overallPct = student.overall_percentage || student.percentage || 68.4;
  const noticeRef = `BITM/ACAD/WARN/${new Date().getFullYear()}/${(studentUsn || '001').replace(/[^a-zA-Z0-9]/g, '')}`;
  const currentDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Subjects with attendance shortage (<75%)
  const subjects = student.subjects && student.subjects.length > 0 ? student.subjects : [
    { code: "CS502", name: "Artificial Intelligence & ML", total: 24, attended: 16, pct: 66.7, needed: 8 },
    { code: "CS501", name: "Database Management Systems", total: 22, attended: 15, pct: 68.2, needed: 6 },
    { code: "CS504", name: "Cloud & Distributed Systems", total: 18, attended: 12, pct: 66.7, needed: 6 }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-gray-900 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto border border-gray-200">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="print:hidden bg-slate-900 text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span className="font-bold text-sm tracking-wide">Official University Detention Warning Notice (PDF)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
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

        {/* Formal Institutional Legal Document (Optimized for standard A4 single page print) */}
        <div ref={printRef} className="p-8 sm:p-10 space-y-6 bg-white text-gray-900">
          
          {/* Institutional Header */}
          <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-xl bg-slate-900 p-0.5 flex items-center justify-center shadow-md">
                <img src="/app_logo.png" alt="Geo-Attend Seal" className="h-full w-full object-cover rounded-lg" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                Autonomous Institute • Affiliated to VTU, Belagavi
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
              Ballari Institute of Technology and Management
            </h1>
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Directorate of Academic Compliance & Semester Examinations
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Jnana Gangotri Campus, Ballari, Karnataka • Accredited Grade 'A+'
            </p>
          </div>

          {/* Reference Meta Banner */}
          <div className="flex justify-between items-center text-xs font-mono border-b border-gray-200 pb-3">
            <div>
              <span className="text-gray-500">Notice Ref: </span>
              <strong className="text-slate-900">{noticeRef}</strong>
            </div>
            <div>
              <span className="text-gray-500">Date Issued: </span>
              <strong className="text-slate-900">{currentDate}</strong>
            </div>
          </div>

          {/* Formal Warning Subject Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-500/40 text-amber-950 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <h3 className="font-black text-sm uppercase tracking-wide">
                Notice of Attendance Shortage & Detention Risk Warning
              </h3>
            </div>
            <p className="text-xs text-amber-900">
              Pursuant to Regulation 14.2 of University Academic Governance, candidates must maintain a minimum of <strong>75.0% cumulative presence</strong> to qualify for the Semester End Examinations.
            </p>
          </div>

          {/* Candidate Profile Details */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-gray-500 block">Student Candidate:</span>
              <strong className="text-slate-900 text-sm">{studentName}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">University Roll / USN:</span>
              <strong className="text-slate-900 font-mono text-sm">{studentUsn}</strong>
            </div>
            <div>
              <span className="text-gray-500 block">Academic Department:</span>
              <span className="font-semibold text-slate-800">{studentDept}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Current Attendance Aggregate:</span>
              <strong className="text-amber-600 font-mono text-base">{overallPct}% (Shortage Detected)</strong>
            </div>
          </div>

          {/* Subject Shortage Breakdown Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Course-Wise Shortage Audit & Mandatory Recovery
            </h4>
            <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Course Code & Title</th>
                  <th className="p-2.5 text-center">Attended / Total</th>
                  <th className="p-2.5 text-center">Current %</th>
                  <th className="p-2.5 text-right text-amber-700">Recovery Classes Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((s, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="p-2.5 font-medium">
                      <span className="font-mono font-bold text-indigo-600 mr-1.5">{s.code}</span>
                      <span>{s.name}</span>
                    </td>
                    <td className="p-2.5 text-center font-mono">{s.attended} / {s.total}</td>
                    <td className="p-2.5 text-center font-bold text-amber-600 font-mono">{s.pct}%</td>
                    <td className="p-2.5 text-right font-bold text-amber-700">+{s.needed || 6} mandatory</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legal Advisory Note */}
          <div className="text-[11px] text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
            <p>
              <strong>Corrective Action Required:</strong> The candidate is hereby strictly advised to attend all upcoming scheduled lectures without unexcused absence. Failure to recover aggregate attendance to 75.0% prior to final hall ticket issuance will result in mandatory course detention.
            </p>
          </div>

          {/* Institutional Signature Blocks */}
          <div className="pt-8 flex justify-between items-end border-t border-slate-200">
            <div className="text-center space-y-1">
              <div className="h-10 flex items-center justify-center font-serif text-slate-600 italic">
                Dr. H. N. Rao, Ph.D.
              </div>
              <div className="w-36 border-t border-slate-400"></div>
              <span className="text-[10px] font-bold uppercase text-slate-600 block">Faculty In-Charge</span>
            </div>

            <div className="text-center space-y-1">
              <div className="h-10 flex items-center justify-center font-serif text-slate-800 font-bold italic">
                Prof. V. K. Sharma
              </div>
              <div className="w-44 border-t border-slate-900"></div>
              <span className="text-[10px] font-bold uppercase text-slate-900 block">Dean of Academic Affairs</span>
              <span className="text-[9px] text-slate-500 font-mono block">Digitally Signed & Sealed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


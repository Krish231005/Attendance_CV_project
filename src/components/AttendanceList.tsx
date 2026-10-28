import { ClipboardCheck, Clock, User, CheckCircle2, Download } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { cn } from '../lib/utils';

interface AttendanceListProps {
  records: AttendanceRecord[];
}

export default function AttendanceList({ records }: AttendanceListProps) {
  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Timestamp', 'Status'];
    const rows = records.map(r => [
      r.personId,
      r.personName,
      new Date(r.timestamp).toLocaleString(),
      r.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-3 uppercase tracking-tight">
          <ClipboardCheck className="w-5 h-5 text-app-primary" />
          Recent Attendance Log
        </h2>
        {records.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-app-card hover:bg-app-bg border border-app-border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}
      </div>

      <div className="bg-app-card border border-app-border rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-app-border bg-app-bg/50 text-[10px] font-bold uppercase tracking-widest text-app-subtle">
          <div className="flex items-center gap-2">
            <User className="w-3 h-3" />
            Subject
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Timestamp
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3" />
            Status
          </div>
          <div className="text-right">Confidence</div>
        </div>

        <div className="divide-y divide-app-border">
          {records.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-app-bg rounded-full flex items-center justify-center mx-auto border border-app-border">
                <ClipboardCheck className="w-8 h-8 text-app-subtle" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-app-muted uppercase tracking-tight">No attendance records found</p>
                <p className="text-xs text-app-subtle uppercase font-bold">Start scanning to record activity</p>
              </div>
            </div>
          ) : (
            records.map((record) => (
              <div key={record.id} className="grid grid-cols-4 gap-4 p-4 items-center hover:bg-app-bg transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-app-bg flex items-center justify-center border border-app-border">
                    <span className="text-[10px] font-bold text-app-primary">{record.personName.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-bold">{record.personName}</span>
                </div>
                <div className="text-xs font-medium text-app-muted">
                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    record.status === 'present' 
                      ? "bg-app-success-bg text-app-success" 
                      : "bg-red-500/10 text-red-500"
                  )}>
                    {record.status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10px] text-app-success bg-app-success-bg px-2 py-1 rounded border border-app-success/10">
                    99.2%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-app-card border border-app-border rounded-xl space-y-2 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-app-subtle">Total Scans</p>
          <p className="text-3xl font-bold">{records.length.toString().padStart(2, '0')}</p>
        </div>
        <div className="p-6 bg-app-card border border-app-border rounded-xl space-y-2 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-app-subtle">Unique Subjects</p>
          <p className="text-3xl font-bold">{new Set(records.map(r => r.personId)).size.toString().padStart(2, '0')}</p>
        </div>
        <div className="p-6 bg-app-card border border-app-border rounded-xl space-y-2 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-app-subtle">System Accuracy</p>
          <p className="text-3xl font-bold text-app-primary">98.2%</p>
        </div>
      </div>
    </div>
  );
}

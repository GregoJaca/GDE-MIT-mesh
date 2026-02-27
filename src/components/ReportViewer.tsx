import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportPdf {
  title: string;
  date: string;
  provider: string;
  pdfUrl: string;
}

// Map each appointment to a PDF document served from /public/reports/
// For the hackathon we reuse the same PDF — in production each would be unique
export const mockReportPdfs: Record<string, ReportPdf> = {
  'APP-001': {
    title: 'Annual Physical — Clinical Report',
    date: '2023-10-14',
    provider: 'Dr. Amelia Brooks',
    pdfUrl: '/reports/tetelsor.pdf',
  },
  'APP-002': {
    title: 'Lab Results Review — Lipid Panel & Metabolic',
    date: '2023-11-05',
    provider: 'Dr. Amelia Brooks',
    pdfUrl: '/reports/tetelsor.pdf',
  },
  'APP-003': {
    title: 'Dermatology Consult — Lesion Evaluation',
    date: '2024-02-28',
    provider: 'Dr. James Liu',
    pdfUrl: '/reports/tetelsor.pdf',
  },
  'APP-004': {
    title: 'Orthopedic Evaluation — Right Knee',
    date: '2024-01-15',
    provider: 'Dr. Helena Vasquez',
    pdfUrl: '/reports/tetelsor.pdf',
  },
  'APP-005': {
    title: 'Neurology — Migraine Follow-up',
    date: '2024-02-10',
    provider: 'Dr. Raj Patel',
    pdfUrl: '/reports/tetelsor.pdf',
  },
};

export function getReportForAppointment(appointmentId: string): ReportPdf | null {
  return mockReportPdfs[appointmentId] || null;
}

interface ReportViewerProps {
  appointmentId: string;
}

export default function ReportViewer({ appointmentId }: ReportViewerProps) {
  const report = getReportForAppointment(appointmentId);
  const [key, setKey] = useState(0);

  // Force iframe refresh when switching appointments
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [appointmentId]);

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base font-medium">No reports available</p>
        <p className="text-sm mt-1">Reports will appear here once generated.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* PDF Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-md shrink-0">
            <FileText className="w-4 h-4 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-plum dark:text-brand-lime truncate">
              {report.title}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {report.provider} • {new Date(report.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs gap-1.5 border-slate-200 dark:border-slate-700"
            onClick={() => window.open(report.pdfUrl, '_blank')}
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs gap-1.5 border-slate-200 dark:border-slate-700"
            asChild
          >
            <a href={report.pdfUrl} download>
              <Download className="w-3 h-3" />
              Download
            </a>
          </Button>
        </div>
      </div>

      {/* PDF Iframe */}
      <div className="flex-1 bg-slate-200 dark:bg-slate-950 relative">
        <iframe
          key={key}
          src={report.pdfUrl}
          className="w-full h-full border-0 absolute inset-0"
          title={report.title}
        />
      </div>
    </div>
  );
}

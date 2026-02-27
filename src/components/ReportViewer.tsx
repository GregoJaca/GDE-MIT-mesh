import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, FileCode, ChevronRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getGeneratedPdf } from '@/lib/pdf-store';
import { getGeneratedMd } from '@/lib/md-store';
import ReactMarkdown from 'react-markdown';
import { appointments } from '@/lib/mock-data';
import { APP_CONFIG } from '@/config/constants';

interface ReportPdf {
  title: string;
  date: string;
  provider: string;
  pdfUrl: string;
}

export const mockReportPdfs: Record<string, ReportPdf> = {
  'APP-001': {
    title: 'Annual Physical — Clinical Report',
    date: '2023-10-14',
    provider: 'Dr. Amelia Brooks',
    pdfUrl: APP_CONFIG.DEFAULT_PDF_URL,
  },
  'APP-002': {
    title: 'Lab Results Review — Lipid Panel & Metabolic',
    date: '2023-11-05',
    provider: 'Dr. Amelia Brooks',
    pdfUrl: APP_CONFIG.DEFAULT_PDF_URL,
  },
  'APP-003': {
    title: 'Dermatology Consult — Lesion Evaluation',
    date: '2024-02-28',
    provider: 'Dr. James Liu',
    pdfUrl: APP_CONFIG.DEFAULT_PDF_URL,
  },
  'APP-004': {
    title: 'Orthopedic Evaluation — Right Knee',
    date: '2024-01-15',
    provider: 'Dr. Helena Vasquez',
    pdfUrl: APP_CONFIG.DEFAULT_PDF_URL,
  },
  'APP-005': {
    title: 'Neurology — Migraine Follow-up',
    date: '2024-02-10',
    provider: 'Dr. Raj Patel',
    pdfUrl: APP_CONFIG.DEFAULT_PDF_URL,
  },
};

export function getReportForAppointment(appointmentId: string): ReportPdf | null {
  return mockReportPdfs[appointmentId] || null;
}

interface ReportViewerProps {
  appointmentId: string;
  pdfVersion?: number;
  mdVersion?: number;
}

export default function ReportViewer({ appointmentId, pdfVersion, mdVersion }: ReportViewerProps) {
  const report = getReportForAppointment(appointmentId);
  const appointmentDoc = appointments.find(a => a.id === appointmentId);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'pdf' | 'md'>('pdf');

  useEffect(() => {
    setIsOpen(false);
  }, [appointmentId]);

  const generatedUrl = getGeneratedPdf(appointmentId);
  const activePdfUrl = generatedUrl || report?.pdfUrl || '';
  const hasGenerated = !!generatedUrl;

  const generatedMd = getGeneratedMd(appointmentId);
  const hasGeneratedMd = !!generatedMd;
  void mdVersion;

  const totalReports = (hasGenerated ? 1 : 0) + (hasGeneratedMd ? 1 : 0) + (report ? 1 : 0);

  if (!report && !hasGenerated && !hasGeneratedMd) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-base font-semibold text-slate-500 dark:text-slate-400">No reports yet</p>
        <p className="text-sm mt-1 text-slate-400 dark:text-slate-500 text-center max-w-xs">Generate a report from Clinical Notes to see it here.</p>
      </div>
    );
  }

  const title = hasGenerated 
    ? `${report?.title || 'Clinical Notes'} (Generated)` 
    : (report?.title || 'Report');
  const subtitle = report 
    ? `${report.provider} • ${new Date(report.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` 
    : '';

  const iframeKey = `${appointmentId}-${pdfVersion ?? 0}`;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Section header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Documents</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{totalReports} report{totalReports !== 1 ? 's' : ''} available</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest font-bold">
            <Shield className="w-3 h-3" />
            Encrypted
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="px-6 pb-6 space-y-3">

        {/* Generated PDF Card */}
        {hasGenerated && (
          <button
            onClick={() => { setViewMode('pdf'); setIsOpen(true); }}
            className="w-full text-left group"
          >
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-950/60 dark:to-cyan-950/40 border border-sky-200 dark:border-sky-800 hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-lg hover:shadow-sky-100 dark:hover:shadow-sky-950/30 transition-all duration-200 hover:-translate-y-px">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">PDF Report</h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-sky-500 text-white px-1.5 py-0.5 rounded shrink-0">New</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-sky-400 dark:text-sky-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>
        )}

        {/* Generated Markdown Card */}
        {hasGeneratedMd && (
          <button
            onClick={() => { setViewMode('md'); setIsOpen(true); }}
            className="w-full text-left group"
          >
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/60 dark:to-purple-950/40 border border-violet-200 dark:border-violet-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg hover:shadow-violet-100 dark:hover:shadow-violet-950/30 transition-all duration-200 hover:-translate-y-px">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/25 shrink-0">
                <FileCode className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white truncate">Markdown Report</h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-500 text-white px-1.5 py-0.5 rounded shrink-0">New</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-violet-400 dark:text-violet-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </button>
        )}

        {/* Original Report Card */}
        {report && (
          <button
            onClick={() => {
              if (!hasGenerated) { setViewMode('pdf'); setIsOpen(true); }
              else window.open(report.pdfUrl, '_blank');
            }}
            className="w-full text-left group"
          >
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-px ${
              hasGenerated || hasGeneratedMd
                ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                : 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/60 dark:to-emerald-950/40 border-teal-200 dark:border-teal-800 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-lg hover:shadow-teal-100 dark:hover:shadow-teal-950/30'
            }`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                hasGenerated || hasGeneratedMd
                  ? 'bg-slate-200 dark:bg-slate-700'
                  : 'bg-gradient-to-br from-teal-500 to-emerald-500 shadow-md shadow-teal-500/25'
              }`}>
                <FileText className={`w-5 h-5 ${hasGenerated || hasGeneratedMd ? 'text-slate-400 dark:text-slate-500' : 'text-white'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold truncate ${hasGenerated || hasGeneratedMd ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                    {report.title}
                  </h3>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                    hasGenerated || hasGeneratedMd
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                      : 'bg-teal-500 text-white'
                  }`}>
                    Original
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{subtitle}</p>
              </div>
              <ChevronRight className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0 ${
                hasGenerated || hasGeneratedMd ? 'text-slate-300 dark:text-slate-600' : 'text-teal-400 dark:text-teal-500'
              }`} />
            </div>
          </button>
        )}
      </div>

      {/* Viewer Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
            <DialogTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pr-6">
              <span className="flex items-center gap-2 text-slate-800 dark:text-white truncate text-base">
                {viewMode === 'pdf' ? <FileText className="w-4 h-4 text-sky-500 shrink-0" /> : <FileCode className="w-4 h-4 text-violet-500 shrink-0" />}
                {title}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {hasGenerated && hasGeneratedMd && (
                  <div className="relative flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                    <div className={`absolute top-0.5 bottom-0.5 rounded-md shadow-sm transition-all duration-300 ease-in-out ${
                      viewMode === 'pdf'
                        ? 'left-0.5 w-[calc(50%-2px)] bg-sky-500'
                        : 'left-[calc(50%+2px)] w-[calc(50%-4px)] bg-violet-500'
                    }`} />
                    <button 
                      onClick={() => setViewMode('pdf')}
                      className={`relative z-10 px-3 py-1 text-xs font-bold rounded-md transition-colors duration-200 ${viewMode === 'pdf' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      PDF
                    </button>
                    <button 
                      onClick={() => setViewMode('md')}
                      className={`relative z-10 px-3 py-1 text-xs font-bold rounded-md transition-colors duration-200 ${viewMode === 'md' ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Markdown
                    </button>
                  </div>
                )}
                
                {viewMode === 'pdf' ? (
                  <>
                    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => window.open(activePdfUrl, '_blank')}>
                      <ExternalLink className="w-3 h-3" /> New Tab
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" asChild>
                      <a href={activePdfUrl} download><Download className="w-3 h-3" /> Download</a>
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => {
                    const blob = new Blob([generatedMd || appointmentDoc?.report || ''], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Clinical_Notes_${appointmentId}.md`;
                    a.click();
                  }}>
                    <Download className="w-3 h-3" /> Download .md
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-auto">
            {viewMode === 'pdf' ? (
              <iframe
                key={iframeKey}
                src={`${activePdfUrl}#toolbar=0`}
                className="w-full h-full border-0 absolute inset-0 bg-white"
                title={title}
              />
            ) : (
              <div className="w-full min-h-full p-8 sm:p-12">
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <article className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-headings:text-slate-800 dark:prose-headings:text-white prose-a:text-violet-500">
                    <ReactMarkdown>
                      {generatedMd || appointmentDoc?.report || '*No markdown content available.*'}
                    </ReactMarkdown>
                  </article>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

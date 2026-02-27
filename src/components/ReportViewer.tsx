import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, Eye, FileCode } from 'lucide-react';
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

// Map each appointment to a PDF document served from /public/reports/
// For the hackathon we reuse the same PDF — in production each would be unique
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

  // Close the popup if it was open when switching appointments
  useEffect(() => {
    setIsOpen(false);
  }, [appointmentId]);

  // Check if there's a doctor-generated PDF for this appointment
  const generatedUrl = getGeneratedPdf(appointmentId);
  // Use generated PDF if available, otherwise fall back to the static mock
  const activePdfUrl = generatedUrl || report?.pdfUrl || '';
  const hasGenerated = !!generatedUrl;

  // Check for generated markdown report
  const generatedMd = getGeneratedMd(appointmentId);
  const hasGeneratedMd = !!generatedMd;
  // Use mdVersion to force re-render
  void mdVersion;

  if (!report && !hasGenerated && !hasGeneratedMd) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-base font-medium">No reports available</p>
        <p className="text-sm mt-1">Reports will appear here once generated.</p>
      </div>
    );
  }

  const title = hasGenerated 
    ? `${report?.title || 'Clinical Notes'} (Generated)` 
    : (report?.title || 'Report');
  const subtitle = report 
    ? `${report.provider} • ${new Date(report.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` 
    : '';

  // Use pdfVersion as a key suffix to force iframe reload
  const iframeKey = `${appointmentId}-${pdfVersion ?? 0}`;

  return (
    <div className="flex flex-col h-full items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 relative">
      {/* Document Cards */}
      <div className="w-full max-w-lg mx-auto space-y-4">
        {/* Generated notes PDF card (if exists) */}
        {hasGenerated && (
          <div 
            className="group cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-brand-teal/30 dark:border-brand-teal/40 shadow-sm hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1 group-hover:border-brand-teal">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-brand-teal/10 rounded-xl flex items-center justify-center text-brand-teal shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-brand-plum dark:text-brand-lime truncate">Clinical Notes Report</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded-full shrink-0">Generated</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                </div>
                <Button size="sm" className="bg-brand-teal hover:bg-brand-teal/90 text-white gap-1.5 rounded-lg shrink-0">
                  <Eye className="w-3.5 h-3.5" />
                  View
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Generated Markdown card (if exists) */}
        {hasGeneratedMd && (
          <div 
            className="group cursor-pointer"
            onClick={() => { setViewMode('md'); setIsOpen(true); }}
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-emerald-300/40 dark:border-emerald-600/40 shadow-sm hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1 group-hover:border-emerald-400">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <FileCode className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-brand-plum dark:text-brand-lime truncate">Markdown Report</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0">Generated</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                </div>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 rounded-lg shrink-0">
                  <Eye className="w-3.5 h-3.5" />
                  View
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Original/static report card */}
        {report && (
          <div 
            className="group cursor-pointer"
            onClick={() => {
              if (!hasGenerated) setIsOpen(true);
              else window.open(report.pdfUrl, '_blank');
            }}
          >
            <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1 ${hasGenerated ? 'border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600' : 'border-slate-200 dark:border-slate-700 group-hover:border-brand-teal/50'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 ${hasGenerated ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' : 'bg-brand-teal/10 text-brand-teal'}`}>
                  <FileText className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-bold truncate ${hasGenerated ? 'text-slate-600 dark:text-slate-300' : 'text-brand-plum dark:text-brand-lime'}`}>{report.title}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full shrink-0">Original</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                </div>
                <Button size="sm" variant={hasGenerated ? 'outline' : 'default'} className={hasGenerated ? 'gap-1.5 rounded-lg shrink-0' : 'bg-brand-teal hover:bg-brand-teal/90 text-white gap-1.5 rounded-lg shrink-0'}>
                  <Eye className="w-3.5 h-3.5" />
                  {hasGenerated ? 'Open' : 'View'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold pt-2">Encrypted Clinical Records</p>
      </div>

      {/* PDF Viewer Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0">
            <DialogTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pr-6">
              <span className="flex items-center gap-2 text-brand-plum dark:text-brand-lime truncate">
                {viewMode === 'pdf' ? <FileText className="w-5 h-5 text-brand-teal shrink-0" /> : <FileCode className="w-5 h-5 text-brand-teal shrink-0" />}
                {title}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {hasGenerated && (
                  <div className="flex bg-slate-200/50 dark:bg-slate-800 rounded-lg p-0.5 mr-2 border border-slate-200 dark:border-slate-700">
                    <button 
                      onClick={() => setViewMode('pdf')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'pdf' ? 'bg-white dark:bg-slate-700 text-brand-teal shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      PDF View
                    </button>
                    <button 
                      onClick={() => setViewMode('md')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'md' ? 'bg-white dark:bg-slate-700 text-brand-teal shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      Markdown View
                    </button>
                  </div>
                )}
                
                {viewMode === 'pdf' ? (
                  <>
                    <Button size="sm" variant="outline" className="gap-2 h-8 text-xs border-slate-200 dark:border-slate-700" onClick={() => window.open(activePdfUrl, '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 h-8 text-xs border-slate-200 dark:border-slate-700" asChild>
                      <a href={activePdfUrl} download><Download className="w-3.5 h-3.5" /> Download PDF</a>
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="gap-2 h-8 text-xs border-slate-200 dark:border-slate-700" onClick={() => {
                    const blob = new Blob([generatedMd || appointmentDoc?.report || ''], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Clinical_Notes_${appointmentId}.md`;
                    a.click();
                  }}>
                    <Download className="w-3.5 h-3.5" /> Download .MD
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-200 dark:bg-slate-950 relative overflow-auto">
            {viewMode === 'pdf' ? (
              <iframe
                key={iframeKey}
                src={`${activePdfUrl}#toolbar=0`}
                className="w-full h-full border-0 absolute inset-0 bg-white"
                title={title}
              />
            ) : (
              <div className="w-full min-h-full bg-slate-50 dark:bg-slate-900 p-8 sm:p-12">
                <div className="max-w-3xl mx-auto bg-white dark:bg-slate-950 p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <article className="prose prose-slate dark:prose-invert lg:prose-lg max-w-none prose-headings:text-brand-plum dark:prose-headings:text-brand-lime prose-a:text-brand-teal">
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

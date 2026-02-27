import { useState } from 'react';
import { Bot, Calendar, Stethoscope, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ReportViewer from '@/components/ReportViewer';

type TabId = 'report' | 'ai';

export default function PatientDashboard() {
  const { selectedAppointment, selectedCase } = useAppointmentContext();
  const [activeTab, setActiveTab] = useState<TabId>('report');
  
  // Simulated files state for the AI to still have context, since files uploaded by doctor would be linked to the appointment
  const files: File[] = []; 

  if (!selectedAppointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
        <Calendar className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No Appointment Selected</p>
        <p className="text-sm">Select an appointment from the sidebar to view details</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'report', label: 'Report', icon: FileText },
    { id: 'ai', label: 'AI Assistant', icon: Bot },
  ];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Appointment Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 shrink-0 transition-colors">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {selectedCase && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-brand-plum/5 to-brand-teal/5 dark:from-brand-plum/10 dark:to-brand-teal/10 text-brand-plum dark:text-brand-lime px-2.5 py-1 rounded-lg text-xs font-semibold border border-brand-plum/15 dark:border-brand-lime/20">
                <span className="text-sm">{selectedCase.icon}</span>
                {selectedCase.title}
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold text-brand-plum dark:text-brand-lime flex items-center gap-3">
            {selectedAppointment.topic}
            <span className="text-xs font-semibold px-2 py-1 bg-brand-lime/20 text-brand-teal rounded-full border border-brand-lime/50">
              {selectedAppointment.status}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(selectedAppointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-brand-mint/10 text-brand-teal px-3 py-1.5 rounded-lg text-sm font-medium border border-brand-teal/20">
          <Stethoscope className="w-4 h-4" />
          Provider: {selectedAppointment.doctorId}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 p-1 shrink-0 transition-colors">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-teal/10 text-brand-teal shadow-sm'
                  : 'text-brand-slate dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-brand-plum dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-colors">
        
        {/* REPORT TAB */}
        {activeTab === 'report' && (
          <ReportViewer appointmentId={selectedAppointment.id} />
        )}

        {/* AI ASSISTANT TAB */}
        {activeTab === 'ai' && (
          <div className="p-8 overflow-auto h-full">
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible defaultValue="ai-assistant" className="w-full bg-brand-slate/5 dark:bg-slate-800 rounded-xl border border-brand-slate/20 dark:border-slate-700">
                <AccordionItem value="ai-assistant" className="border-none">
                  <AccordionTrigger className="px-6 hover:no-underline hover:bg-brand-slate/10 rounded-t-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-plum/10 dark:bg-brand-plum/20 rounded-lg text-brand-plum dark:text-brand-lime">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="text-left font-medium">
                        <span className="block text-brand-plum dark:text-brand-lime">AI Assistant</span>
                        <span className="text-xs text-brand-slate dark:text-slate-400 font-normal">Ask questions or analyze the uploaded documents</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6 pt-2">
                    {files.length > 0 ? (
                      <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-brand-teal/30 rounded-xl bg-brand-teal/5 dark:bg-brand-teal/10 mt-2">
                        <CheckCircle2 className="w-12 h-12 text-brand-teal mb-4" />
                        <h3 className="text-base font-semibold text-brand-plum dark:text-brand-lime">Documents Ready for Analysis</h3>
                        <p className="text-sm text-brand-slate dark:text-slate-400 mt-2 mb-6 max-w-md">Our AI is ready to analyze your {files.length} uploaded document(s) and summarize them for your provider.</p>
                        <Button className="w-full max-w-sm bg-brand-teal hover:bg-brand-teal/90 shadow-sm text-white">Start Auto-Analysis</Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 mt-2">
                        <AlertCircle className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
                        <p className="text-base font-medium text-slate-700 dark:text-slate-300">No context available</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Upload documents in the "Upload Files" tab first, then come back here to analyze them.</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

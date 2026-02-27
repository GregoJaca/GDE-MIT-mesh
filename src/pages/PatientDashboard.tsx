import { useState } from 'react';
import { Bot, Calendar, Stethoscope, MessageSquare, ChevronDown, Sparkles, Send } from 'lucide-react';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import ReportViewer from '@/components/ReportViewer';
import ReactMarkdown from 'react-markdown';

export default function PatientDashboard() {
  const { selectedAppointment, selectedCase } = useAppointmentContext();
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentMessage, setAgentMessage] = useState('');

  if (!selectedAppointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
        <Calendar className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No Appointment Selected</p>
        <p className="text-sm">Select an appointment from the sidebar to view details</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Appointment Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 shrink-0 transition-colors">
        <div>
          {selectedCase && (
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 bg-brand-plum/8 dark:bg-brand-plum/15 text-brand-plum dark:text-brand-lime px-2.5 py-1 rounded-lg text-xs font-semibold border border-brand-plum/15 dark:border-brand-lime/20">
                <span className="text-sm">{selectedCase.icon}</span>
                {selectedCase.title}
              </div>
            </div>
          )}
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
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

      {/* Main Content — Reports (Tab Content style) */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {/* Layman Summary Card */}
            {selectedAppointment.patientSummary && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-brand-mint shadow-sm shadow-brand-mint/20 mb-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="p-2 bg-brand-mint/20 rounded-lg text-brand-teal">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-bold text-brand-plum dark:text-brand-lime">Provider's Summary for You</h2>
                </div>
                <article className="prose prose-slate dark:prose-invert max-w-none text-brand-slate prose-headings:text-brand-plum prose-headings:font-bold prose-strong:text-brand-teal">
                  <ReactMarkdown>{selectedAppointment.patientSummary}</ReactMarkdown>
                </article>
              </div>
            )}

            <div className="flex items-center gap-4 mb-4 mt-8">
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Full Clinical Record</h3>
              <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-800"></div>
            </div>
            <div className="rounded-xl overflow-hidden min-h-[400px]">
              <ReportViewer appointmentId={selectedAppointment.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible AI Agent Panel */}
      <div className={`shrink-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${agentOpen
        ? 'border-violet-200 dark:border-violet-800'
        : 'border-slate-200/60 dark:border-slate-800'
        }`}>
        {/* Toggle header */}
        <button
          onClick={() => setAgentOpen(!agentOpen)}
          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${agentOpen
            ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20'
            : 'bg-slate-100 dark:bg-slate-800'
            }`}>
            {agentOpen
              ? <Sparkles className="w-4 h-4 text-white" />
              : <Bot className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            }
          </div>
          <div className="flex-1 text-left">
            <span className={`text-sm font-bold ${agentOpen ? 'text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400'}`}>
              AI Assistant
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-2">
              Ask questions about your appointment
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${agentOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Expanded content */}
        <div className={`transition-all duration-300 ease-in-out ${agentOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="px-5 pb-4 border-t border-slate-100 dark:border-slate-800">
            {/* Chat area */}
            <div className="mt-3 mb-3 h-48 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-4">
              {/* Welcome message */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1">MediCore AI</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Hello! I can help you understand your medical records and appointment details. Feel free to ask me anything about your {selectedAppointment.topic.toLowerCase()}.
                  </p>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={agentMessage}
                  onChange={(e) => setAgentMessage(e.target.value)}
                  placeholder="Ask about your appointment..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-600 text-slate-700 dark:text-slate-300 placeholder-slate-400 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && agentMessage.trim()) {
                      setAgentMessage('');
                    }
                  }}
                />
              </div>
              <button
                className={`p-2.5 rounded-lg transition-all duration-200 ${agentMessage.trim()
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20 hover:shadow-lg'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                disabled={!agentMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

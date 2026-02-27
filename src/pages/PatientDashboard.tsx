import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, AlertCircle, Bot, CheckCircle2, Calendar, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppointmentContext } from '@/layouts/DashboardLayout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function PatientDashboard() {
  const { selectedAppointment } = useAppointmentContext();
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (!selectedAppointment) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Calendar className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No Appointment Selected</p>
        <p className="text-sm">Select an appointment from the sidebar to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            {selectedAppointment.topic}
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
              {selectedAppointment.status}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date(selectedAppointment.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-100">
          <Stethoscope className="w-4 h-4" />
          Provider: {selectedAppointment.doctorId}
        </div>
      </div>

      {/* Summary */}
      <div className="prose prose-slate max-w-none">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Summary</h3>
        <div className="text-slate-700 leading-relaxed bg-slate-50 rounded-xl border border-slate-100 p-6">
          Your provider noted: &quot;Patient presented for routine checkup...&quot;
          See provider dashboard for full notes or ask the AI assistant to summarize your latest labs.
        </div>
      </div>

      {/* Upload Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-blue-500" />
          Upload Documents
        </h3>
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
        >
          <input {...getInputProps()} />
          <div className={`p-3 rounded-full mb-3 transition-colors ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500'}`}>
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            {isDragActive ? "Drop files here..." : "Click or drag files to add to this appointment"}
          </p>
          <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, DICOM</p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {files.map((file, i) => (
              <div key={i} className="flex items-center p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                <File className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Section (Collapsible) */}
      <Accordion type="single" collapsible className="w-full bg-indigo-50/30 rounded-xl border border-indigo-100">
        <AccordionItem value="ai-assistant" className="border-none">
          <AccordionTrigger className="px-6 hover:no-underline hover:bg-indigo-50/50 rounded-t-xl transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <Bot className="w-5 h-5" />
              </div>
              <div className="text-left font-medium">
                <span className="block text-slate-800">AI Assistant Available</span>
                <span className="text-xs text-slate-500 font-normal">Ask questions or analyze the uploaded documents</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6 pt-2">
            {files.length > 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-indigo-200 rounded-xl bg-indigo-50/80 mt-2">
                <CheckCircle2 className="w-10 h-10 text-indigo-500 mb-4" />
                <h3 className="text-base font-semibold text-indigo-900">Documents Ready for Analysis</h3>
                <p className="text-sm text-indigo-700/80 mt-2 mb-6 max-w-md">Our AI is ready to analyze your newly uploaded documents and summarize them for your provider.</p>
                <Button className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-700 shadow-sm">Start Auto-Analysis</Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-xl bg-white mt-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-700">No context available</p>
                <p className="text-xs text-slate-500 mt-2">Upload a document to utilize the AI assistant.</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

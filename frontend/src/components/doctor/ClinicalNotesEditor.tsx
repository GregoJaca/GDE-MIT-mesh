import { FileText, FileCode, FileDown } from 'lucide-react';
import type { SaveFormat } from '@/types';

interface ClinicalNotesEditorProps {
    topic: string;
    doctorId: string;
    date: string;
    notes: string;
    saveFormat: SaveFormat;
    onNotesChange: (value: string) => void;
    onSaveFormatChange: (format: SaveFormat) => void;
    onGenerate: () => void;
    onSaveDraft: () => void;
}

export default function ClinicalNotesEditor({
    notes,
    saveFormat,
    onNotesChange,
    onSaveFormatChange,
    onGenerate,
    onSaveDraft,
}: ClinicalNotesEditorProps) {
    return (
        <div className="flex flex-col">
            <h3 className="text-lg font-bold text-brand-plum dark:text-brand-lime border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
                Clinical Report Notes
            </h3>
            <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Type your clinical notes here, or record audio to have AI auto-transcribe it..."
                className="w-full text-brand-slate dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700 p-6 font-serif text-lg min-h-[350px] resize-y focus:outline-none focus:ring-2 focus:ring-brand-teal transition-all"
            />

            {/* Format toggle and save actions */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-5 mt-6">
                <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner">
                    <div
                        className={`absolute top-1 bottom-1 rounded-lg bg-white dark:bg-slate-700 shadow-md transition-all duration-300 ease-in-out ${saveFormat === 'markdown'
                                ? 'left-1 w-[calc(50%-4px)]'
                                : 'left-[calc(50%+2px)] w-[calc(50%-4px)]'
                            }`}
                    />
                    <button
                        onClick={() => onSaveFormatChange('markdown')}
                        className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 min-w-[120px] justify-center ${saveFormat === 'markdown'
                                ? 'text-brand-plum dark:text-brand-lime'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        <FileCode className="w-4 h-4" /> Markdown
                    </button>
                    <button
                        onClick={() => onSaveFormatChange('pdf')}
                        className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300 min-w-[120px] justify-center ${saveFormat === 'pdf'
                                ? 'text-brand-plum dark:text-brand-lime'
                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        <FileText className="w-4 h-4" /> PDF
                    </button>
                </div>

                <button
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 hover:shadow-md active:scale-[0.98]"
                    onClick={onGenerate}
                >
                    <FileDown className="w-4 h-4" />
                    {saveFormat === 'pdf' ? 'Generate PDF & Save' : 'Generate Markdown & Save'}
                </button>

                <button
                    className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-brand-slate/5 text-brand-slate dark:text-slate-300 font-medium rounded-lg shadow-sm transition-colors"
                    onClick={onSaveDraft}
                >
                    Save Draft
                </button>
            </div>
        </div>
    );
}

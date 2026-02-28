import React from 'react';
import { FileEdit, Info, CheckCircle2 } from 'lucide-react';
import type { ClinicalDraftJson, ClinicalFinding, MedicationAction } from '@/types';
import EesztMarkdown from '@/components/shared/EesztMarkdown';

interface DraftReviewFormProps {
    draftData: ClinicalDraftJson;
    patientSummaryMd: string;
    onUpdateDraft: (data: ClinicalDraftJson) => void;
    onApprove: () => void;
    isSubmitting: boolean;
}

export default function DraftReviewForm({
    draftData,
    patientSummaryMd,
    onUpdateDraft,
    onApprove,
    isSubmitting
}: DraftReviewFormProps) {
    const handleUpdateFinding = (category: 'chief_complaints' | 'assessments', index: number, value: string) => {
        const newData = { ...draftData };
        newData[category][index] = { ...newData[category][index], finding: value };
        onUpdateDraft(newData);
    };

    const handleUpdateAction = (index: number, value: string) => {
        const newData = { ...draftData };
        newData.actionables[index] = { ...newData.actionables[index], description: value };
        onUpdateDraft(newData);
    };

    // Simple tooltip renderer to prove Zero-Hallucinations (Hover to see exact quote)
    const AuditTooltip = ({ quote, context }: { quote?: string, context?: string }) => {
        if (!quote) return null;
        return (
            <div className="group relative flex items-center justify-center ml-2 cursor-help text-slate-400 hover:text-brand-teal transition-colors">
                <Info className="w-4 h-4" />
                <div className="absolute bottom-full mb-2 hidden group-hover:block w-72 bg-slate-800 text-white text-xs rounded-xl p-3 shadow-xl z-50 animate-in fade-in zoom-in duration-200">
                    <p className="font-semibold text-brand-lime mb-1">Audit Trail (Zero-Hallucination)</p>
                    <p className="mb-2"><span className="text-slate-400">Exact Quote:</span> "{quote}"</p>
                    {context && <p className="text-slate-300 italic">Context: "{context}"</p>}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45" />
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-6 border border-brand-teal/20 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-brand-teal/10 rounded-lg">
                    <FileEdit className="w-5 h-5 text-brand-teal" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">Human-in-the-Loop Review</h3>
                    <p className="text-sm text-slate-500">Edit the AI-extracted clinical entities before emitting the final EMR.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                {/* Left Column: Editable JSON Draft */}
                <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-6 custom-scrollbar">
                    {/* Chief Complaints */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">Chief Complaints</h4>
                        {draftData.chief_complaints.length === 0 ? (
                            <p className="text-sm text-slate-500 italic px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">None detected.</p>
                        ) : (
                            draftData.chief_complaints.map((item, idx) => (
                                <div key={idx} className="flex flex-col bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand-teal/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 uppercase">{item.condition_status}</span>
                                        <AuditTooltip quote={item.exact_quote} context={item.contextual_quote} />
                                    </div>
                                    <input
                                        type="text"
                                        value={item.finding}
                                        onChange={(e) => handleUpdateFinding('chief_complaints', idx, e.target.value)}
                                        className="w-full bg-transparent border-none text-slate-700 dark:text-slate-200 focus:outline-none p-1 text-sm font-medium"
                                    />
                                </div>
                            ))
                        )}
                    </div>

                    {/* Assessments */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">Assessments</h4>
                        {draftData.assessments.length === 0 ? (
                            <p className="text-sm text-slate-500 italic px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">None detected.</p>
                        ) : (
                            draftData.assessments.map((item, idx) => (
                                <div key={idx} className="flex flex-col bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand-teal/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 uppercase">{item.condition_status}</span>
                                        <AuditTooltip quote={item.exact_quote} context={item.contextual_quote} />
                                    </div>
                                    <input
                                        type="text"
                                        value={item.finding}
                                        onChange={(e) => handleUpdateFinding('assessments', idx, e.target.value)}
                                        className="w-full bg-transparent border-none text-slate-700 dark:text-slate-200 focus:outline-none p-1 text-sm font-medium"
                                    />
                                    {item.system_reference_id && (
                                        <p className="text-xs text-brand-plum mt-2 opacity-70">↳ References Doc: {item.system_reference_id}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Actionables */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">Action Plan</h4>
                        {draftData.actionables.length === 0 ? (
                            <p className="text-sm text-slate-500 italic px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">None detected.</p>
                        ) : (
                            draftData.actionables.map((item, idx) => (
                                <div key={idx} className="flex flex-col bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-brand-teal/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex gap-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-plum/10 text-brand-plum uppercase">{item.action_type}</span>
                                        </div>
                                        <AuditTooltip quote={item.exact_quote} context={item.contextual_quote} />
                                    </div>
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => handleUpdateAction(idx, e.target.value)}
                                        className="w-full bg-transparent border-none text-slate-700 dark:text-slate-200 focus:outline-none p-1 text-sm font-medium"
                                    />
                                    {item.system_reference_id && (
                                        <p className="text-xs text-brand-plum mt-2 opacity-70">↳ Assigned to: {item.system_reference_id}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Layman Summary Preview & Actions */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex-1 overflow-hidden flex flex-col">
                        <h4 className="font-semibold text-sm text-brand-teal uppercase tracking-wider mb-4 flex items-center gap-2">
                            Patient Summary Preview
                        </h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-serif pb-4 mt-2">
                            <article className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                                <EesztMarkdown content={patientSummaryMd} />
                            </article>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                        <button
                            onClick={onApprove}
                            disabled={isSubmitting}
                            className="w-full py-4 bg-brand-plum hover:bg-brand-plum/90 text-white font-bold rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5" />
                            )}
                            Approve & Generate EMR
                        </button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(148, 163, 184, 0.3);
                    border-radius: 20px;
                }
            `}} />
        </div>
    );
}

import { useState } from 'react';
import { Bot, ChevronDown, Sparkles, MessageSquare, Send } from 'lucide-react';

interface AiAssistantPanelProps {
    appointmentTopic: string;
}

export default function AiAssistantPanel({ appointmentTopic }: AiAssistantPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (!message.trim()) return;
        // TODO: wire to AI assistant API
        setMessage('');
    };

    return (
        <div
            className={`shrink-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${isOpen ? 'border-violet-200 dark:border-violet-800' : 'border-slate-200/60 dark:border-slate-800'
                }`}
        >
            <button
                id="ai-assistant-toggle"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${isOpen
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}
                >
                    {isOpen
                        ? <Sparkles className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                </div>
                <div className="flex-1 text-left">
                    <span className={`text-sm font-bold ${isOpen ? 'text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        AI Assistant
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-2">
                        Ask questions about your appointment
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="mt-3 mb-3 h-48 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1">MediCore AI</p>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Hello! I can help you understand your medical records and appointment details. Feel free to ask me
                                    anything about your {appointmentTopic.toLowerCase()}.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                id="ai-assistant-input"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Ask about your appointment..."
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-600 text-slate-700 dark:text-slate-300 placeholder-slate-400 transition-all"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSend();
                                }}
                            />
                        </div>
                        <button
                            id="ai-assistant-send"
                            onClick={handleSend}
                            disabled={!message.trim()}
                            className={`p-2.5 rounded-lg transition-all duration-200 ${message.trim()
                                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/20 hover:shadow-lg'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                }`}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

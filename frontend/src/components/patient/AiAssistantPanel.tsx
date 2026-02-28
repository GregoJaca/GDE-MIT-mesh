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
            className={`shrink-0 bg-white rounded-lg border transition-all duration-300 overflow-hidden ${isOpen ? 'border-zinc-900 shadow-sm' : 'border-zinc-200'
                }`}
        >
            <button
                id="ai-assistant-toggle"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
            >
                <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-200 ${isOpen
                            ? 'bg-zinc-900 text-white'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                >
                    {isOpen
                        ? <Sparkles className="w-4 h-4" />
                        : <Bot className="w-4 h-4" />}
                </div>
                <div className="flex-1 text-left">
                    <span className={`text-sm font-semibold ${isOpen ? 'text-zinc-900' : 'text-zinc-700'}`}>
                        AI Assistant
                    </span>
                    <span className="text-xs text-zinc-400 ml-2">
                        Ask questions about your appointment
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-4 border-t border-zinc-100">
                    <div className="mt-4 mb-4 h-48 overflow-auto rounded-lg bg-zinc-50 border border-zinc-100 p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-md bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-zinc-900 mb-1 tracking-tight">MESH AI</p>
                                <p className="text-sm text-zinc-600 leading-relaxed">
                                    Hello! I can help you understand your medical records and appointment details. Feel free to ask me
                                    anything about your {appointmentTopic.toLowerCase()}.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input
                                id="ai-assistant-input"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Ask about your appointment..."
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 placeholder-zinc-400 transition-all"
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
                                    ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
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

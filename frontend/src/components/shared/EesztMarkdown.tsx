import ReactMarkdown from 'react-markdown';
import { ExternalLink, Stethoscope, FileText, Link } from 'lucide-react';

interface EesztMarkdownProps {
    content: string;
}

export default function EesztMarkdown({ content }: EesztMarkdownProps) {
    // Transform occurrences of NotebookLM style [[ID]] into custom markdown links
    const preprocessEesztLinks = (text: string) => {
        // Look for literal [[DOC-something]] or [[D-something]] and convert to markdown link
        // This ensures react-markdown will parse it via the `a` component override
        return text.replace(/\[\[([A-Z0-9-]+)\]\]/g, '[$1](cit://$1)');
    };

    const processedContent = preprocessEesztLinks(content);

    return (
        <ReactMarkdown
            components={{
                a: ({ node, ...props }) => {
                    const href = props.href || '';

                    // Render NotebookLM Style Citation Pills
                    if (href.startsWith('cit://')) {
                        const id = href.replace('cit://', '');
                        const isDoctor = id.startsWith('D-');

                        return (
                            <sup className="inline-flex mx-0.5 align-middle select-none">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        alert(`Citation Integration: Showing source for ${id}`);
                                    }}
                                    className="inline-flex items-center justify-center h-[18px] px-1.5 
                                               bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 
                                               rounded-md text-[9px] font-mono font-bold text-zinc-500 hover:text-zinc-900 
                                               transition-all cursor-pointer group shadow-sm"
                                    title={`View Source: ${id}`}
                                >
                                    {isDoctor ? (
                                        <Stethoscope className="w-2.5 h-2.5 mr-1 text-zinc-400 group-hover:text-zinc-700" />
                                    ) : (
                                        <FileText className="w-2.5 h-2.5 mr-1 text-zinc-400 group-hover:text-zinc-700" />
                                    )}
                                    {id}
                                </button>
                            </sup>
                        );
                    }

                    // Legacy general link parsing (just in case)
                    if (href.startsWith('eeszt://')) {
                        return (
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert(`EESZT Portal Integration: Opening record ${href.replace('eeszt://', '')}`);
                                }}
                                className="inline-flex items-center gap-1 font-semibold text-zinc-900 hover:text-zinc-500 transition-colors underline decoration-zinc-900/30 hover:decoration-zinc-500"
                            >
                                <ExternalLink className="w-3 h-3" />
                                {props.children}
                            </a>
                        );
                    }

                    return <a {...props} className="text-zinc-900 underline hover:text-zinc-500 transition-colors font-medium" />;
                }
            }}
        >
            {processedContent}
        </ReactMarkdown>
    );
}

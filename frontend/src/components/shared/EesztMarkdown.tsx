import ReactMarkdown from 'react-markdown';
import { ExternalLink } from 'lucide-react';

interface EesztMarkdownProps {
    content: string;
}

export default function EesztMarkdown({ content }: EesztMarkdownProps) {
    // Transform occurrences of [DOC-...] into actual markdown links
    const preprocessEesztLinks = (text: string) => {
        // Look for literal [DOC-something] and convert to markdown link
        return text.replace(/\[(DOC-[A-Z0-9-]+)\]/g, '[View $1 in EESZT Portal](eeszt://$1)');
    };

    const processedContent = preprocessEesztLinks(content);

    return (
        <ReactMarkdown
            components={{
                a: ({ node, ...props }) => {
                    const href = props.href || '';
                    if (href.startsWith('eeszt://')) {
                        return (
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    alert(`EESZT Portal Integration: Opening record ${href.replace('eeszt://', '')}`);
                                }}
                                className="inline-flex items-center gap-1 font-semibold text-brand-teal hover:text-brand-lime transition-colors underline decoration-brand-teal/30 hover:decoration-brand-lime"
                            >
                                <ExternalLink className="w-3 h-3" />
                                {props.children}
                            </a>
                        );
                    }
                    return <a {...props} className="text-brand-plum underline hover:text-brand-teal transition-colors" />;
                }
            }}
        >
            {processedContent}
        </ReactMarkdown>
    );
}

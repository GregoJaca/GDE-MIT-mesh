import { UploadCloud, File } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useCallback } from 'react';
import { APP_CONFIG } from '@/config/app.config';

export default function FileUploader() {
    const [files, setFiles] = useState<File[]>([]);
    const [viewingFile, setViewingFile] = useState<{ file: File; url: string } | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles((prev) => [...prev, ...acceptedFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: APP_CONFIG.UPLOAD.SUPPORTED_DOCUMENT_TYPES,
    });

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-brand-plum dark:text-brand-lime border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-brand-teal" />
                    Upload Documents
                </h3>
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group
            ${isDragActive
                            ? 'border-brand-teal bg-brand-teal/5'
                            : 'border-slate-200 dark:border-slate-700 hover:border-brand-teal/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className={`p-4 rounded-full mb-4 transition-colors ${isDragActive ? 'bg-brand-mint/20 text-brand-teal' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-brand-teal'}`}>
                        <UploadCloud className="w-8 h-8" />
                    </div>
                    <p className="text-base font-medium text-slate-700 dark:text-slate-200">
                        {isDragActive ? 'Drop PDF files here...' : 'Click or drag PDF files to add to this appointment'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">PDF documents only</p>
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Uploaded PDF Files ({files.length})
                    </p>
                    {files.map((file, i) => (
                        <div
                            key={i}
                            onClick={() => setViewingFile({ file, url: URL.createObjectURL(file) })}
                            className="flex items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:border-brand-teal/50 hover:shadow-md cursor-pointer transition-all"
                        >
                            <File className="w-5 h-5 text-brand-teal mr-3 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <Button variant="ghost" size="sm" className="text-brand-teal hover:bg-brand-teal/10 hover:text-brand-teal">
                                View
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
                        <DialogTitle className="text-brand-plum dark:text-brand-lime flex items-center gap-2">
                            <File className="w-4 h-4 text-brand-teal" />
                            {viewingFile?.file.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden relative bg-slate-100 dark:bg-slate-900 w-full">
                        {viewingFile && (
                            <iframe
                                src={`${viewingFile.url}#toolbar=0`}
                                className="w-full h-full border-0 absolute inset-0"
                                title="Document Preview"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

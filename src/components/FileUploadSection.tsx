import React, { useState, useRef } from 'react';
import { TaskAttachment, User } from '../types';
import { 
  fileToDataUrl, 
  formatFileSize, 
  triggerFileDownload 
} from '../services/attachmentService';
import { 
  Paperclip, 
  UploadCloud, 
  File, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  Eye, 
  X,
  FileArchive
} from 'lucide-react';

interface FileUploadSectionProps {
  attachments: TaskAttachment[];
  onChange: (attachments: TaskAttachment[]) => void;
  currentUser: User;
  readOnly?: boolean;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  attachments,
  onChange,
  currentUser,
  readOnly = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    try {
      const newAttachments: TaskAttachment[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await fileToDataUrl(file);
        
        newAttachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser.name,
        });
      }

      onChange([...attachments, ...newAttachments]);
    } catch (err) {
      console.error('Error processing uploaded file', err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
  };

  const getFileIcon = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-sky-600" />;
    }
    if (type.includes('pdf') || ext === 'pdf') {
      return <FileText className="w-4 h-4 text-rose-600" />;
    }
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv') || ['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
      return <FileArchive className="w-4 h-4 text-amber-600" />;
    }
    return <File className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-slate-500" />
          <span>Attachments &amp; Deliverables ({attachments.length})</span>
        </label>
        <span className="text-[11px] text-slate-500">
          Upload reports, evidence, specs, or documents
        </span>
      </div>

      {/* Upload Drop Zone */}
      {!readOnly && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-[#0e5773] bg-[#0e5773]/5'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFiles(e.target.files)}
            multiple
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center gap-1">
            <UploadCloud className={`w-6 h-6 ${isDragging ? 'text-[#0e5773]' : 'text-slate-400'}`} />
            <div className="text-xs text-slate-700 font-medium">
              <span className="text-[#0e5773] font-semibold hover:underline">Click to upload</span> or drag and drop files here
            </div>
            <div className="text-[10px] text-slate-500">
              PDFs, spreadsheets, images, documents, and archives up to 25MB
            </div>
            {isProcessing && (
              <span className="text-xs text-[#0e5773] font-medium mt-1 animate-pulse">
                Processing file...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {attachments.map((att) => {
            const isImage = att.type.startsWith('image/');

            return (
              <div
                key={att.id}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="p-1.5 rounded bg-slate-100 shrink-0">
                    {getFileIcon(att.type, att.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate" title={att.name}>
                      {att.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                      <span>{formatFileSize(att.size)}</span>
                      <span>&middot;</span>
                      <span>{att.uploadedBy}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isImage && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(att.dataUrl)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                      title="Preview Image"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => triggerFileDownload(att)}
                    className="p-1.5 text-slate-500 hover:text-[#0e5773] hover:bg-slate-100 rounded transition-colors"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemove(att.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Remove Attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-lg bg-white p-2">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img 
              src={previewImage} 
              alt="Attachment Preview" 
              className="max-h-[80vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

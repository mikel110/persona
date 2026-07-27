'use client';

import { useRef, useState } from 'react';
import { extractText } from '@/lib/pdfExtractor';

interface FileUploadProps {
  onExtracted: (text: string, fileName: string) => void;
  concepts: string[];
  isExtracting: boolean;
  uploadedFileName: string;
  disabled?: boolean;
}

export default function FileUpload({
  onExtracted,
  concepts,
  isExtracting,
  uploadedFileName,
  disabled,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const text = await extractText(file);
      if (!text.trim()) {
        setError('File appears to be empty or could not be read.');
        return;
      }
      onExtracted(text, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const hasFile = !!uploadedFileName && !isExtracting;

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
      <div
        id="file-upload-zone"
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-xl
          transition-all duration-300 ease-out
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/[0.07]'}
          ${isDragging ? 'scale-[1.02]' : ''}
        `}
        style={{
          background: isDragging
            ? 'rgba(124, 58, 237, 0.15)'
            : hasFile
            ? 'rgba(34, 197, 94, 0.08)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${
            isDragging
              ? 'rgba(124, 58, 237, 0.5)'
              : hasFile
              ? 'rgba(34, 197, 94, 0.3)'
              : 'rgba(255,255,255,0.08)'
          }`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <span className="text-lg flex-shrink-0">
          {isExtracting ? '⏳' : hasFile ? '✅' : '📎'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: hasFile ? '#86efac' : 'rgba(255,255,255,0.7)' }}>
            {isExtracting
              ? 'Extracting concepts...'
              : hasFile
              ? uploadedFileName
              : 'Upload study material'}
          </p>
          {hasFile && concepts.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {concepts.length} concepts found
            </p>
          )}
          {!hasFile && !isExtracting && (
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              .txt or .pdf · drag & drop or click
            </p>
          )}
        </div>
        {hasFile && (
          <button
            id="clear-file-btn"
            onClick={(e) => {
              e.stopPropagation();
              onExtracted('', '');
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="text-xs px-2 py-1 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Concept pills */}
      {hasFile && concepts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center w-full">
          {concepts.map((c, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{
                background: 'rgba(124, 58, 237, 0.15)',
                border: '1px solid rgba(124, 58, 237, 0.3)',
                color: '#a78bfa',
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".txt,.pdf"
        onChange={handleChange}
        className="hidden"
        aria-label="Upload study material"
        disabled={disabled}
      />
    </div>
  );
}

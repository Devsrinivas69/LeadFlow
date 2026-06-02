'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  fileName?: string;
  fileSize?: number;
  error?: string | null;
  onClear: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DropZone({
  onFileAccepted,
  fileName,
  fileSize,
  error,
  onClear,
}: DropZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        'text/csv': ['.csv'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
          '.xlsx',
        ],
        'application/vnd.ms-excel': ['.xls'],
      },
      maxSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 1,
      multiple: false,
    });

  const rejectionMessage =
    fileRejections.length > 0
      ? fileRejections[0].errors[0]?.code === 'file-too-large'
        ? 'File is too large. Maximum size is 10MB.'
        : 'Only CSV and Excel files are accepted'
      : null;

  if (fileName) {
    return (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{fileName}</p>
            <p className="text-sm text-slate-500">
              {fileSize ? formatFileSize(fileSize) : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="h-8 w-8 text-slate-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4"
          >
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50/70'
            : 'border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30'
        }`}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
            isDragActive ? 'bg-indigo-200' : 'bg-slate-200'
          } transition-colors duration-300`}
        >
          <Upload
            className={`h-7 w-7 ${
              isDragActive ? 'text-indigo-700' : 'text-slate-500'
            } transition-colors`}
          />
        </motion.div>

        <p className="mt-4 text-base font-medium text-slate-700">
          {isDragActive
            ? 'Drop your file here...'
            : 'Drag & drop your file here'}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          or click to browse your files
        </p>
        <p className="mt-3 text-xs text-slate-400">
          Supports CSV, XLSX, XLS • Max 10MB
        </p>

        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 rounded-xl border-2 border-indigo-500 bg-indigo-50/30 pointer-events-none"
          />
        )}
      </div>

      {(rejectionMessage || error) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-4"
        >
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            {rejectionMessage || error}
          </p>
        </motion.div>
      )}
    </div>
  );
}

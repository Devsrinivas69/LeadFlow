'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { DropZone } from '@/components/upload/DropZone';
import { ColumnMapper } from '@/components/upload/ColumnMapper';
import { PreviewTable } from '@/components/upload/PreviewTable';
import { DistributionSummary } from '@/components/upload/DistributionSummary';
import { UploadResults } from '@/components/upload/UploadResults';
import { useUpload } from '@/hooks/useUpload';

const STEPS = ['Upload File', 'Map Columns', 'Preview Data', 'Confirm', 'Results'];
const STEP_KEYS = ['dropzone', 'mapping', 'preview', 'confirm', 'results'];

export default function UploadPage() {
  const {
    step,
    setStep,
    fileName,
    fileSize,
    rows,
    validRows,
    uploading,
    uploadResult,
    parseError,
    mappingResult,
    parseFile,
    confirmMapping,
    uploadRows,
    reset,
  } = useUpload();

  const handleUpload = async (batchLabel?: string) => {
    const result = await uploadRows(batchLabel);
    if (result.success) {
      toast.success(result.message || 'Leads distributed successfully!');
    } else {
      toast.error(result.message || 'Upload failed');
    }
  };

  const currentIndex = STEP_KEYS.indexOf(step);

  return (
    <PageContainer
      title="Upload Leads"
      description="Upload a CSV or Excel file to distribute leads across your sales agents."
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STEPS.map((label, i) => {
          const isActive = i === currentIndex;
          const isCompleted = i < currentIndex;

          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-8 ${
                    isCompleted ? 'bg-indigo-500' : 'bg-slate-200'
                  }`}
                />
              )}
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : isCompleted
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span
                  className={`text-sm hidden sm:inline ${
                    isActive ? 'font-medium text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        {step === 'dropzone' && (
          <DropZone
            onFileAccepted={parseFile}
            fileName={fileName}
            fileSize={fileSize}
            error={parseError}
            onClear={reset}
          />
        )}

        {step === 'mapping' && mappingResult && (
          <ColumnMapper
            fileName={fileName}
            mappingResult={mappingResult}
            onConfirm={(overriddenMap) => confirmMapping(overriddenMap)}
            onCancel={reset}
          />
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <PreviewTable rows={rows} maxRows={10} />

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={validRows.length === 0}
              >
                {validRows.length > 0
                  ? `Proceed with ${validRows.length} valid rows`
                  : 'No valid rows'}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <DistributionSummary
            validRowCount={validRows.length}
            onConfirm={handleUpload}
            onBack={() => setStep('preview')}
            uploading={uploading}
          />
        )}

        {step === 'results' && uploadResult && (
          <UploadResults result={uploadResult} onReset={reset} />
        )}
      </div>
    </PageContainer>
  );
}

'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { mapHeaders, CANONICAL_LABELS } from '@/lib/columnMapping';
import type { CanonicalField, MappingResult } from '@/lib/columnMapping';
import type {
  UploadStep,
  ValidatedRow,
  UploadResponse,
  ApiResponse,
} from '@/types';

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/;

interface RawRow {
  [key: string]: string;
}

export function useUpload() {
  const [step, setStep] = useState<UploadStep>('dropzone');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Raw data held until column mapping is confirmed
  const [pendingRawRows, setPendingRawRows] = useState<RawRow[]>([]);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);

  const validRows = rows.filter((r) => r.isValid);
  const invalidRows = rows.filter((r) => !r.isValid);

  // ─── Row validation ─────────────────────────────────────────────────────────
  const validateRow = (
    row: { firstName?: string; phone?: string; notes?: string },
    index: number
  ): ValidatedRow => {
    const errors: string[] = [];
    const firstName = (row.firstName || '').trim();
    const phone = (row.phone || '').trim();
    const notes = (row.notes || '').trim();

    if (!firstName) errors.push('First name is required');
    if (!phone) {
      errors.push('Phone number is required');
    } else if (!PHONE_REGEX.test(phone)) {
      errors.push('Invalid phone number format');
    }

    return {
      firstName,
      phone,
      notes: notes || undefined,
      rowIndex: index,
      isValid: errors.length === 0,
      errors,
    };
  };

  // ─── Convert raw rows using a confirmed header map ──────────────────────────
  const applyMapping = useCallback(
    (rawRows: RawRow[], headerMap: Map<string, CanonicalField>) => {
      const validated = rawRows.map((raw, index) => {
        const mapped: { firstName?: string; phone?: string; notes?: string } = {};
        for (const [originalHeader, field] of headerMap.entries()) {
          if (field === 'firstName') mapped.firstName = raw[originalHeader];
          if (field === 'phone') mapped.phone = raw[originalHeader];
          if (field === 'notes') mapped.notes = raw[originalHeader];
        }
        return validateRow(mapped, index);
      });

      setRows(validated);
      setParseError(null);
      setStep('preview');
    },
    []
  );

  // ─── Called after user confirms mapping in the UI ───────────────────────────
  const confirmMapping = useCallback(
    (overriddenMap?: Map<string, CanonicalField>) => {
      if (!mappingResult || pendingRawRows.length === 0) return;
      const headerMap = overriddenMap ?? mappingResult.headerMap;
      applyMapping(pendingRawRows, headerMap);
      // Clear pending state
      setPendingRawRows([]);
      setMappingResult(null);
    },
    [mappingResult, pendingRawRows, applyMapping]
  );

  // ─── Core parse handler ─────────────────────────────────────────────────────
  const processRows = useCallback(
    (rawRows: RawRow[], headers: string[]) => {
      if (rawRows.length === 0) {
        setParseError('The file appears to be empty.');
        return;
      }

      const result = mapHeaders(headers);

      if (!result.isComplete) {
        // Tell the user which fields we couldn't auto-detect
        const missingLabels = result.missing
          .map((f) => CANONICAL_LABELS[f])
          .join(', ');
        setParseError(
          `Unable to identify required columns automatically: ${missingLabels}. ` +
            `Please map the columns below or rename them in your file.`
        );
        // Still show the mapping UI so they can fix it manually
        setPendingRawRows(rawRows);
        setMappingResult(result);
        setStep('mapping' as UploadStep);
        return;
      }

      if (result.needsConfirmation) {
        // Synonym / fuzzy match — ask user to confirm before processing
        setPendingRawRows(rawRows);
        setMappingResult(result);
        setStep('mapping' as UploadStep);
        return;
      }

      // Exact / normalized match — proceed silently
      applyMapping(rawRows, result.headerMap);
    },
    [applyMapping]
  );

  // ─── File parsing ───────────────────────────────────────────────────────────
  const parseFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      setFileSize(file.size);
      setParseError(null);

      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        Papa.parse<RawRow>(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h: string) => h.trim(),
          complete: (results) => {
            if (results.errors.length > 0 && results.data.length === 0) {
              setParseError('Failed to parse CSV file. Please check the format.');
              return;
            }
            const headers = results.meta.fields || [];
            processRows(results.data, headers);
          },
          error: () => {
            setParseError('Failed to parse CSV file.');
          },
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const jsonData = XLSX.utils.sheet_to_json<RawRow>(worksheet, {
              defval: '',
            });

            if (jsonData.length === 0) {
              setParseError('The file appears to be empty.');
              return;
            }

            const headers = Object.keys(jsonData[0]);
            processRows(jsonData, headers);
          } catch {
            setParseError('Failed to parse Excel file. Please check the format.');
          }
        };
        reader.onerror = () => {
          setParseError('Failed to read file.');
        };
        reader.readAsArrayBuffer(file);
      } else {
        setParseError('Only CSV and Excel files are accepted');
      }
    },
    [processRows]
  );

  // ─── Upload ─────────────────────────────────────────────────────────────────
  const uploadRows = useCallback(
    async (batchLabel?: string): Promise<ApiResponse<UploadResponse>> => {
      setUploading(true);
      try {
        const payload = {
          rows: validRows.map((r) => ({
            firstName: r.firstName,
            phone: r.phone,
            notes: r.notes,
            rowIndex: r.rowIndex,
          })),
          batchLabel,
        };

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data: ApiResponse<UploadResponse> = await res.json();

        if (data.success && data.data) {
          setUploadResult(data.data);
          setStep('results');
        }

        return data;
      } catch {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: 'Failed to upload. Please check your connection.',
        };
      } finally {
        setUploading(false);
      }
    },
    [validRows]
  );

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStep('dropzone');
    setFileName('');
    setFileSize(0);
    setRows([]);
    setUploadResult(null);
    setParseError(null);
    setUploading(false);
    setPendingRawRows([]);
    setMappingResult(null);
  }, []);

  return {
    step,
    setStep,
    fileName,
    fileSize,
    rows,
    validRows,
    invalidRows,
    uploading,
    uploadResult,
    parseError,
    mappingResult,
    parseFile,
    confirmMapping,
    uploadRows,
    reset,
  };
}

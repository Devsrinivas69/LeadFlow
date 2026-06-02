'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MappingResult, CanonicalField } from '@/lib/columnMapping';
import { CANONICAL_LABELS } from '@/lib/columnMapping';

interface ColumnMapperProps {
  fileName: string;
  mappingResult: MappingResult;
  onConfirm: (overriddenMap?: Map<string, CanonicalField>) => void;
  onCancel: () => void;
}

const FIELD_DESCRIPTIONS: Record<CanonicalField, string> = {
  firstName: "The lead's name",
  phone: 'Mobile / phone number',
  notes: 'Additional info or remarks',
};

const METHOD_LABELS: Record<string, { label: string; color: string }> = {
  exact: { label: 'Exact match', color: 'text-green-600' },
  normalized: { label: 'Auto-detected', color: 'text-green-600' },
  synonym: { label: 'Smart match', color: 'text-blue-600' },
  fuzzy: { label: 'Fuzzy match', color: 'text-amber-600' },
  none: { label: 'Not mapped', color: 'text-red-500' },
};

const REQUIRED_FIELDS: CanonicalField[] = ['firstName', 'phone', 'notes'];

export function ColumnMapper({
  fileName,
  mappingResult,
  onConfirm,
  onCancel,
}: ColumnMapperProps) {
  // Local override map: fieldName → chosen original header (or '' = not assigned)
  const [overrides, setOverrides] = useState<Record<CanonicalField, string>>(() => {
    const init: Record<CanonicalField, string> = { firstName: '', phone: '', notes: '' };
    for (const [header, field] of mappingResult.headerMap) {
      init[field] = header;
    }
    return init;
  });

  // Collect all original headers for the dropdowns
  const allHeaders = mappingResult.matches.map((m) => m.originalHeader);

  const handleChange = (field: CanonicalField, header: string) => {
    setOverrides((prev) => ({ ...prev, [field]: header }));
  };

  const handleConfirm = () => {
    // Build the confirmed header map from user's selections
    const confirmedMap = new Map<string, CanonicalField>();
    for (const [field, header] of Object.entries(overrides) as [CanonicalField, string][]) {
      if (header) confirmedMap.set(header, field);
    }
    onConfirm(confirmedMap);
  };

  const allMapped = REQUIRED_FIELDS.every((f) => overrides[f]);

  const isAutoDetected =
    mappingResult.missing.length === 0 && mappingResult.needsConfirmation;
  const hasMissing = mappingResult.missing.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header banner */}
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 ${
          hasMissing
            ? 'border-amber-200 bg-amber-50'
            : 'border-blue-200 bg-blue-50'
        }`}
      >
        {hasMissing ? (
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        ) : (
          <HelpCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        )}
        <div>
          <p className={`font-medium text-sm ${hasMissing ? 'text-amber-800' : 'text-blue-800'}`}>
            {hasMissing
              ? 'Some columns could not be detected automatically'
              : 'We detected similar columns — please confirm the mapping'}
          </p>
          <p className={`text-xs mt-0.5 ${hasMissing ? 'text-amber-700' : 'text-blue-700'}`}>
            File: <span className="font-medium">{fileName}</span>
            {isAutoDetected &&
              ' — The detected mapping is shown below. Adjust any incorrect assignments then click Confirm.'}
          </p>
        </div>
      </div>

      {/* Mapping table */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Column Mapping
        </p>

        {REQUIRED_FIELDS.map((field) => {
          const matchForCurrentOverride = mappingResult.matches.find(
            (m) => m.originalHeader === overrides[field]
          );
          const method = matchForCurrentOverride?.method ?? 'none';
          const methodInfo = METHOD_LABELS[method];

          return (
            <div
              key={field}
              className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              {/* Target field info */}
              <div className="w-36 shrink-0">
                <p className="text-sm font-semibold text-slate-800">
                  {CANONICAL_LABELS[field]}
                </p>
                <p className="text-xs text-slate-400">{FIELD_DESCRIPTIONS[field]}</p>
              </div>

              <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />

              {/* Column selector */}
              <div className="flex-1">
                <select
                  value={overrides[field]}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">— select a column —</option>
                  {allHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Match confidence badge */}
              <div className="w-28 text-right shrink-0">
                {overrides[field] ? (
                  <span className={`text-xs font-medium ${methodInfo.color}`}>
                    {methodInfo.label}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-red-500">Required</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unmapped columns info */}
      {mappingResult.matches.some((m) => !m.field) && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs text-slate-500 font-medium mb-1">
            Other columns (will be ignored):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mappingResult.matches
              .filter((m) => !m.field)
              .map((m) => (
                <span
                  key={m.originalHeader}
                  className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs text-slate-600"
                >
                  {m.originalHeader}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!allMapped}>
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {allMapped ? 'Confirm Mapping & Continue' : 'Assign all required columns first'}
        </Button>
      </div>
    </motion.div>
  );
}

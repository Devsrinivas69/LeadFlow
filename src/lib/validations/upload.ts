import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{6,14}$/;

// Sanitize a value to prevent CSV injection
function sanitizeValue(value: string): string {
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  let sanitized = value.trim();
  if (dangerousPrefixes.some((p) => sanitized.startsWith(p))) {
    sanitized = "'" + sanitized;
  }
  return sanitized;
}

export const uploadRowSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .transform((v) => v.trim()),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Invalid phone number format'),
  notes: z
    .string()
    .optional()
    .transform((v) => (v ? sanitizeValue(v) : undefined)),
  // Store all extra columns that don't map to the 3 canonical fields
  extraColumns: z
    .record(z.string(), z.string())
    .optional()
    .transform((rec) => {
      if (!rec) return undefined;
      // Sanitize every extra column value
      return Object.fromEntries(
        Object.entries(rec).map(([k, v]) => [k, sanitizeValue(v)])
      );
    }),
  rowIndex: z.number().int().nonnegative(),
});

export const uploadRequestSchema = z.object({
  rows: z
    .array(uploadRowSchema)
    .min(1, 'At least one valid row is required')
    .max(10000, 'Maximum 10,000 rows per upload'),
  batchLabel: z
    .string()
    .max(100, 'Batch label must be at most 100 characters')
    .optional()
    .transform((v) => (v ? v.trim() : undefined)),
});

export type UploadRowInput = z.infer<typeof uploadRowSchema>;
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

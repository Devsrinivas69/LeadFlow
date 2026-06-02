/**
 * Intelligent column mapping for CSV/XLSX uploads.
 *
 * Strategy (applied in order):
 *   1. Exact match against canonical names
 *   2. Normalized match (lowercase, strip spaces/punctuation/underscores/hyphens)
 *   3. Synonym match (broad dictionary of common alternatives)
 *   4. Fuzzy match (Dice-coefficient similarity ≥ 0.5)
 */

// ─── Canonical field names ────────────────────────────────────────────────────
export type CanonicalField = 'firstName' | 'phone' | 'notes';

export const CANONICAL_LABELS: Record<CanonicalField, string> = {
  firstName: 'FirstName',
  phone: 'Phone',
  notes: 'Notes',
};

// ─── Synonym dictionary ───────────────────────────────────────────────────────
const SYNONYMS: Record<CanonicalField, string[]> = {
  firstName: [
    'firstname',
    'first_name',
    'first name',
    'name',
    'fullname',
    'full name',
    'full_name',
    'studentname',
    'student name',
    'student_name',
    'candidatename',
    'candidate name',
    'candidate_name',
    'leadname',
    'lead name',
    'lead_name',
    'customername',
    'customer name',
    'customer_name',
    'clientname',
    'client name',
    'client_name',
    'contactname',
    'contact name',
    'contact_name',
    'person',
    'personname',
    'person name',
  ],
  phone: [
    'phone',
    'phonenumber',
    'phone number',
    'phone_number',
    'mobile',
    'mobilenumber',
    'mobile number',
    'mobile_number',
    'mobilephone',
    'cellphone',
    'cell',
    'cellnumber',
    'cell number',
    'contactnumber',
    'contact number',
    'contact_number',
    'tel',
    'telephone',
    'telephonenumber',
    'telephone number',
    'studentphone',
    'student phone',
    'student phone no',
    'studentphoneno',
    'studentmobile',
    'student mobile',
    'parentphone',
    'parents phone',
    'parents phone no',
    'parentsmobile',
    'whatsapp',
    'whatsappnumber',
    'whatsapp number',
  ],
  notes: [
    'notes',
    'note',
    'remark',
    'remarks',
    'comment',
    'comments',
    'description',
    'desc',
    'message',
    'messages',
    'info',
    'information',
    'additional',
    'additionalinfo',
    'additional info',
    'details',
    'otherinfo',
    'other info',
    'observation',
    'observations',
    'feedback',
    'school',
    'currentschool',
    'current school',
    'presentschool',
    'present school',
    'presentstudyingschool',
    'present studying school',
    'studyingat',
    'studying at',
    'qualification',
    'background',
    'source',
    'leadsource',
    'lead source',
    'interest',
    'product',
    'requirement',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip everything except alphanumeric characters, for matching. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-.,/#!$%^&*;:{}=`~()'"]+/g, '');
}

/**
 * Dice-coefficient similarity between two strings (bigram overlap).
 * Returns a value in [0, 1]. 1 = identical.
 */
function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
  }

  let intersect = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigrams.get(bg) ?? 0;
    if (count > 0) {
      intersect++;
      bigrams.set(bg, count - 1);
    }
  }

  return (2 * intersect) / (a.length + b.length - 2);
}

// ─── Core mapping logic ───────────────────────────────────────────────────────

export interface ColumnMatch {
  /** The original header string from the uploaded file. */
  originalHeader: string;
  /** The canonical field it maps to, or null if unrecognised. */
  field: CanonicalField | null;
  /** How the match was established. */
  method: 'exact' | 'normalized' | 'synonym' | 'fuzzy' | 'none';
  /** Similarity score (0–1). 1 for exact/synonym, lower for fuzzy. */
  confidence: number;
}

const FUZZY_THRESHOLD = 0.5;

/** Map a single header string to a canonical field. */
export function mapHeader(header: string): ColumnMatch {
  const normHeader = normalize(header);

  for (const [field, synonyms] of Object.entries(SYNONYMS) as [CanonicalField, string[]][]) {
    // 1. Exact match (case-insensitive, trimmed)
    if (header.trim().toLowerCase() === CANONICAL_LABELS[field].toLowerCase()) {
      return { originalHeader: header, field, method: 'exact', confidence: 1 };
    }

    // 2. Normalized match
    if (normHeader === normalize(CANONICAL_LABELS[field])) {
      return { originalHeader: header, field, method: 'normalized', confidence: 1 };
    }

    // 3. Synonym match
    if (synonyms.includes(normHeader)) {
      return { originalHeader: header, field, method: 'synonym', confidence: 1 };
    }
  }

  // 4. Fuzzy match — find best scoring canonical or synonym
  let bestField: CanonicalField | null = null;
  let bestScore = 0;

  for (const [field, synonyms] of Object.entries(SYNONYMS) as [CanonicalField, string[]][]) {
    const candidates = [normalize(CANONICAL_LABELS[field]), ...synonyms];
    for (const candidate of candidates) {
      const score = diceSimilarity(normHeader, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestField = field;
      }
    }
  }

  if (bestScore >= FUZZY_THRESHOLD && bestField) {
    return {
      originalHeader: header,
      field: bestField,
      method: 'fuzzy',
      confidence: bestScore,
    };
  }

  return { originalHeader: header, field: null, method: 'none', confidence: 0 };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface MappingResult {
  /** The resolved map from original header → canonical field name. */
  headerMap: Map<string, CanonicalField>;
  /** Detailed match info for each header (used by the UI). */
  matches: ColumnMatch[];
  /** Canonical fields that could not be matched to any column. */
  missing: CanonicalField[];
  /** Whether all required fields were found automatically. */
  isComplete: boolean;
  /** Whether any match relied on fuzzy/synonym detection (inform user). */
  needsConfirmation: boolean;
}

const REQUIRED_FIELDS: CanonicalField[] = ['firstName', 'phone', 'notes'];

/**
 * Run intelligent mapping across a full set of headers.
 * Resolves conflicts by keeping the highest-confidence match per field.
 */
export function mapHeaders(headers: string[]): MappingResult {
  const rawMatches = headers.map(mapHeader);

  // Deduplicate: if multiple headers map to the same field, keep highest confidence
  const bestPerField = new Map<CanonicalField, ColumnMatch>();
  for (const match of rawMatches) {
    if (!match.field) continue;
    const existing = bestPerField.get(match.field);
    if (!existing || match.confidence > existing.confidence) {
      bestPerField.set(match.field, match);
    }
  }

  const headerMap = new Map<string, CanonicalField>();
  for (const [field, match] of bestPerField) {
    headerMap.set(match.originalHeader, field);
  }

  const missing = REQUIRED_FIELDS.filter((f) => !bestPerField.has(f));
  const isComplete = missing.length === 0;

  // Requires confirmation if anything was fuzzy-matched or synonym-matched
  const needsConfirmation = Array.from(bestPerField.values()).some(
    (m) => m.method === 'fuzzy' || m.method === 'synonym'
  );

  return { headerMap, matches: rawMatches, missing, isComplete, needsConfirmation };
}

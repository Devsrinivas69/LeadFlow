import type { Types } from 'mongoose';

// ─── User ────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'agent';

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  mobileNumber: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<IUser, 'password'>;

// ─── Distributed List ────────────────────────────────────────────────────────
export interface IDistributedList {
  _id: Types.ObjectId;
  agentId: Types.ObjectId;
  uploadBatchId: string;
  batchLabel?: string;
  firstName: string;
  phone: string;
  notes?: string;
  extraColumns?: Record<string, string>;
  rowIndex: number;
  uploadedAt: Date;
}

// ─── API Response ────────────────────────────────────────────────────────────
export type ApiResponse<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// ─── JWT ─────────────────────────────────────────────────────────────────────
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SafeUser;
}

// ─── Agent ───────────────────────────────────────────────────────────────────
export interface CreateAgentRequest {
  name: string;
  email: string;
  password: string;
  mobileNumber: string;
}

export interface UpdateAgentRequest {
  name?: string;
  email?: string;
  mobileNumber?: string;
  isActive?: boolean;
}

// ─── Upload ──────────────────────────────────────────────────────────────────
export interface ParsedRow {
  firstName: string;
  phone: string;
  notes?: string;
  extraColumns?: Record<string, string>;
  rowIndex: number;
}

export interface ValidatedRow extends ParsedRow {
  isValid: boolean;
  errors: string[];
}

export interface UploadRequest {
  rows: ParsedRow[];
  batchLabel?: string;
}

export interface AgentDistribution {
  agentId: string;
  name: string;
  count: number;
}

export interface UploadResponse {
  batchId: string;
  totalSaved: number;
  distribution: AgentDistribution[];
}

// ─── Batch History ───────────────────────────────────────────────────────────
export interface BatchSummary {
  uploadBatchId: string;
  batchLabel?: string;
  uploadedAt: Date;
  totalRows: number;
  agents: AgentDistribution[];
}

export interface BatchDetail {
  uploadBatchId: string;
  batchLabel?: string;
  uploadedAt: Date;
  totalRows: number;
  agents: Array<{
    agentId: string;
    name: string;
    count: number;
    leads: Array<{
      firstName: string;
      phone: string;
      notes?: string;
      extraColumns?: Record<string, string>;
      rowIndex: number;
    }>;
  }>;
}

// ─── Client State ────────────────────────────────────────────────────────────
export type UploadStep = 'dropzone' | 'mapping' | 'preview' | 'confirm' | 'results';

export interface AuthContextType {
  user: SafeUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

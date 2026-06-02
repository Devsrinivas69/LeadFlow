import mongoose, { Schema, Model, type Document } from 'mongoose';
import type { IDistributedList } from '@/types';

export interface IDistributedListDocument
  extends Omit<IDistributedList, '_id'>,
    Document {}

const distributedListSchema = new Schema<IDistributedListDocument>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Agent ID is required'],
      index: true,
    },
    uploadBatchId: {
      type: String,
      required: [true, 'Upload batch ID is required'],
      index: true,
    },
    batchLabel: {
      type: String,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    // Stores all extra columns from the uploaded file that don't map to
    // the 3 canonical fields. Uses Mixed so any key-value shape is accepted.
    extraColumns: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    rowIndex: {
      type: Number,
      required: [true, 'Row index is required'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: {
      transform(_doc: any, ret: Record<string, any>) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes for query patterns
distributedListSchema.index({ agentId: 1, uploadedAt: -1 });
distributedListSchema.index({ agentId: 1, uploadBatchId: 1 });

const DistributedList: Model<IDistributedListDocument> =
  mongoose.models.DistributedList ||
  mongoose.model<IDistributedListDocument>(
    'DistributedList',
    distributedListSchema
  );

export default DistributedList;

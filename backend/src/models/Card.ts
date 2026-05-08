import mongoose, { Schema, Document } from 'mongoose';

export interface ILabel {
  text: string;
  color: string;
}

export interface IComment {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ICard extends Document {
  _id: mongoose.Types.ObjectId;
  boardId: mongoose.Types.ObjectId;
  columnId: string;
  title: string;
  description: string;
  labels: ILabel[];
  assignees: mongoose.Types.ObjectId[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date | null;
  comments: IComment[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const cardSchema = new Schema<ICard>(
  {
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    columnId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    labels: [
      {
        text: { type: String, required: true },
        color: { type: String, required: true },
      },
    ],
    assignees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    comments: [
      {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

cardSchema.index({ boardId: 1, columnId: 1, order: 1 });

export default mongoose.model<ICard>('Card', cardSchema);

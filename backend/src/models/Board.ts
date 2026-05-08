import mongoose, { Schema, Document } from 'mongoose';

export interface IColumn {
  _id: string;
  title: string;
  order: number;
}

export interface IBoard extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  columns: IColumn[];
  createdAt: Date;
  updatedAt: Date;
}

const boardSchema = new Schema<IBoard>(
  {
    title: {
      type: String,
      required: [true, 'Título é obrigatório'],
      trim: true,
      maxlength: 100,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    columns: [
      {
        _id: { type: String, required: true },
        title: { type: String, required: true },
        order: { type: Number, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IBoard>('Board', boardSchema);

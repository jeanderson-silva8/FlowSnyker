import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    // MONGODB_URI já validada no boot (fail-fast em server.ts)
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    logger.info('MongoDB connected', { host: conn.connection.host });
  } catch (error) {
    logger.error('MongoDB connection failed', { error: (error as Error).message });
    process.exit(1);
  }
};

export default connectDB;

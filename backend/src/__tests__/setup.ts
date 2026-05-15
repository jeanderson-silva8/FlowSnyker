import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Definir variáveis de ambiente ANTES de importar server.ts
  process.env.JWT_SECRET = 'test-secret-key-for-vitest-only';
  process.env.MONGODB_URI = 'will-be-overridden';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.NODE_ENV = 'test';
  process.env.RESEND_API_KEY = 'test-key';

  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);
});

afterEach(async () => {
  // Limpar TODAS as collections entre testes
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Board from '../models/Board';
import Card from '../models/Card';
import User from '../models/User';

// ─── Helper: cria app express SEM rate limiter ───────────────────
async function getApp() {
  const express = (await import('express')).default;
  const cookieParser = (await import('cookie-parser')).default;
  const cors = (await import('cors')).default;

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Auth routes (sem rate limiter)
  const { validate } = await import('../middleware/validate');
  const auth = (await import('../middleware/auth')).default;
  const { register, login } = await import('../controllers/auth.controller');
  const { z } = await import('zod');

  const passwordPolicy = z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/);
  const registerSchema = z.object({ name: z.string().min(2).max(50), email: z.string().email(), password: passwordPolicy });
  const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

  const authRouter = (await import('express')).Router();
  authRouter.post('/register', validate(registerSchema), register);
  authRouter.post('/login', validate(loginSchema), login);
  app.use('/api/auth', authRouter);

  // Board + Card routes (completas com auth)
  const boardRoutes = (await import('../routes/board.routes')).default;
  const cardRoutes = (await import('../routes/card.routes')).default;
  app.use('/api/boards', boardRoutes);
  app.use('/api/cards', cardRoutes);

  const { errorHandler } = await import('../middleware/errorHandler');
  app.use(errorHandler);

  return app;
}

async function req(app: any) {
  const supertest = (await import('supertest')).default;
  return supertest(app);
}

// Helper: registra e retorna token + userId
async function createUser(app: any, email: string) {
  const agent = await req(app);
  const res = await agent.post('/api/auth/register').send({
    name: 'Test User',
    email,
    password: 'TestPass1',
  });
  return {
    accessToken: res.body.accessToken as string,
    userId: res.body.user?._id as string,
  };
}

describe('Authorization — Board Access (Items 1, 6)', () => {
  let app: any;

  beforeEach(async () => {
    app = await getApp();
  });

  it('deve criar board e retornar 201', async () => {
    const { accessToken } = await createUser(app, 'owner@test.com');
    const agent = await req(app);

    const res = await agent
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Meu Board' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Meu Board');
    expect(res.body.columns).toBeDefined();
    expect(res.body.columns.length).toBeGreaterThan(0);
  });

  it('deve bloquear acesso a board de outro usuário → 403', async () => {
    const owner = await createUser(app, 'owner1@test.com');
    const stranger = await createUser(app, 'stranger1@test.com');
    const agent = await req(app);

    // Owner cria board
    const boardRes = await agent
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Owner Board' });

    const boardId = boardRes.body._id;

    // Stranger tenta acessar
    const res = await agent
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${stranger.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('deve permitir acesso após convite → 200', async () => {
    const owner = await createUser(app, 'owner2@test.com');
    const member = await createUser(app, 'member2@test.com');
    const agent = await req(app);

    // Owner cria board
    const boardRes = await agent
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Shared Board' });

    const boardId = boardRes.body._id;

    // Owner convida member
    await agent
      .post(`/api/boards/${boardId}/invite`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ email: 'member2@test.com' });

    // Member acessa board
    const res = await agent
      .get(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${member.accessToken}`);

    expect(res.status).toBe(200);
  });

  it('não-membro não pode convidar (Item 6) → 403', async () => {
    const owner = await createUser(app, 'owner3@test.com');
    const stranger = await createUser(app, 'stranger3@test.com');
    await createUser(app, 'invited3@test.com');
    const agent = await req(app);

    const boardRes = await agent
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Private Board' });

    const boardId = boardRes.body._id;

    // Stranger tenta convidar → 403
    const res = await agent
      .post(`/api/boards/${boardId}/invite`)
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({ email: 'invited3@test.com' });

    expect(res.status).toBe(403);
  });

  it('apenas owner pode deletar board → 403 para membro', async () => {
    const owner = await createUser(app, 'delowner@test.com');
    const member = await createUser(app, 'delmember@test.com');
    const agent = await req(app);

    const boardRes = await agent
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'To Delete' });

    const boardId = boardRes.body._id;

    // Convidar member
    await agent
      .post(`/api/boards/${boardId}/invite`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ email: 'delmember@test.com' });

    // Member tenta deletar → 403 (não é owner)
    const res = await agent
      .delete(`/api/boards/${boardId}`)
      .set('Authorization', `Bearer ${member.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('deve retornar 401 sem token de autenticação', async () => {
    const agent = await req(app);
    const res = await agent.get('/api/boards');

    expect(res.status).toBe(401);
  });
});

describe('Authorization — Card Access (Item 1)', () => {
  let app: any;

  beforeEach(async () => {
    app = await getApp();
  });

  it('deve criar card no board como membro', async () => {
    const { accessToken } = await createUser(app, 'cardowner@test.com');
    const agent = await req(app);

    // Criar board
    const boardRes = await agent
      .post('/api/boards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Card Board' });

    expect(boardRes.body.columns).toBeDefined();
    const columnId = boardRes.body.columns[0]._id;
    const boardId = boardRes.body._id;

    // Criar card
    const res = await agent
      .post('/api/cards')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        boardId,
        columnId,
        title: 'Test Card',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Card');
  });

  it('não-membro não pode criar card no board → 403', async () => {
    const owner = await createUser(app, 'cardowner2@test.com');
    const stranger = await createUser(app, 'cardstranger@test.com');
    const agent = await req(app);

    const boardRes = await agent
      .post('/api/boards')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ title: 'Private Card Board' });

    const columnId = boardRes.body.columns[0]._id;
    const boardId = boardRes.body._id;

    const res = await agent
      .post('/api/cards')
      .set('Authorization', `Bearer ${stranger.accessToken}`)
      .send({
        boardId,
        columnId,
        title: 'Hack Card',
      });

    expect(res.status).toBe(403);
  });
});

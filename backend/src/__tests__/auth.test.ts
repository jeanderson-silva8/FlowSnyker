import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { hash as argon2Hash } from '@node-rs/argon2';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';

// ─── Helper: cria app express SEM rate limiter (para testes) ─────
async function getApp() {
  const express = (await import('express')).default;
  const cookieParser = (await import('cookie-parser')).default;
  const cors = (await import('cors')).default;

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Importar rotas SEM rate limiter — construímos a rota manualmente
  const { validate } = await import('../middleware/validate');
  const auth = (await import('../middleware/auth')).default;
  const { register, login, refresh, getMe, logout } = await import('../controllers/auth.controller');
  const { z } = await import('zod');

  const passwordPolicy = z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Senha fraca');

  const registerSchema = z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: passwordPolicy,
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  const router = (await import('express')).Router();
  router.post('/register', validate(registerSchema), register);
  router.post('/login', validate(loginSchema), login);
  router.post('/refresh', refresh);
  router.get('/me', auth, getMe);
  router.post('/logout', logout);

  app.use('/api/auth', router);

  const { errorHandler } = await import('../middleware/errorHandler');
  app.use(errorHandler);

  return app;
}

async function req(app: any) {
  const supertest = (await import('supertest')).default;
  return supertest(app);
}

describe('Auth — Registro e Login', () => {
  let app: any;

  beforeEach(async () => {
    app = await getApp();
  });

  it('deve registrar um novo usuário com sucesso', async () => {
    const agent = await req(app);
    const res = await agent.post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'TestPass1',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.password).toBeUndefined(); // Nunca expor hash
  });

  it('deve rejeitar registro com email duplicado', async () => {
    const agent = await req(app);
    await agent.post('/api/auth/register').send({
      name: 'First User',
      email: 'dup@example.com',
      password: 'TestPass1',
    });

    const res = await agent.post('/api/auth/register').send({
      name: 'Second User',
      email: 'dup@example.com',
      password: 'TestPass2',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('email');
  });

  it('deve rejeitar registro com senha fraca (Item 19)', async () => {
    const agent = await req(app);
    const res = await agent.post('/api/auth/register').send({
      name: 'Weak Pass',
      email: 'weak@example.com',
      password: '12345', // Muito curta, sem maiúscula
    });

    expect(res.status).toBe(400);
  });

  it('deve fazer login com credenciais corretas', async () => {
    const agent = await req(app);
    await agent.post('/api/auth/register').send({
      name: 'Login User',
      email: 'login@example.com',
      password: 'LoginPass1',
    });

    const res = await agent.post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'LoginPass1',
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('deve rejeitar login com senha errada', async () => {
    const agent = await req(app);
    await agent.post('/api/auth/register').send({
      name: 'Wrong Pass',
      email: 'wrong@example.com',
      password: 'CorrectPass1',
    });

    const res = await agent.post('/api/auth/login').send({
      email: 'wrong@example.com',
      password: 'WrongPass1',
    });

    expect(res.status).toBe(401);
  });

  it('deve bloquear conta após 5 tentativas falhas (lockout)', async () => {
    const agent = await req(app);
    await agent.post('/api/auth/register').send({
      name: 'Lockout User',
      email: 'lockout@example.com',
      password: 'LockoutPass1',
    });

    // 5 tentativas erradas
    for (let i = 0; i < 5; i++) {
      await agent.post('/api/auth/login').send({
        email: 'lockout@example.com',
        password: 'WrongPass1',
      });
    }

    // 6ª tentativa → conta bloqueada
    const res = await agent.post('/api/auth/login').send({
      email: 'lockout@example.com',
      password: 'LockoutPass1', // Senha correta, mas conta bloqueada
    });

    expect(res.status).toBe(423);
    expect(res.body.error).toContain('bloqueada');
  });

  it('deve retornar 401 ao acessar /me sem token', async () => {
    const agent = await req(app);
    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('deve acessar /me com token válido', async () => {
    const agent = await req(app);
    const regRes = await agent.post('/api/auth/register').send({
      name: 'Me User',
      email: 'me@example.com',
      password: 'MeUserPass1',
    });

    const token = regRes.body.accessToken;
    expect(token).toBeDefined();

    const res = await agent
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@example.com');
  });
});

describe('Auth — Refresh Token Rotation', () => {
  let app: any;

  beforeEach(async () => {
    app = await getApp();
  });

  it('deve emitir novo access token via refresh', async () => {
    const agent = await req(app);
    const regRes = await agent.post('/api/auth/register').send({
      name: 'Refresh User',
      email: 'refresh@example.com',
      password: 'RefreshPass1',
    });

    // Pegar o cookie de refresh
    const setCookieHeader = regRes.headers['set-cookie'];
    expect(setCookieHeader).toBeDefined();

    // Extrair o cookie string
    const cookieStr = Array.isArray(setCookieHeader)
      ? setCookieHeader.find((c: string) => c.startsWith('refreshToken='))
      : setCookieHeader;

    expect(cookieStr).toBeDefined();

    const res = await agent
      .post('/api/auth/refresh')
      .set('Cookie', cookieStr!);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('deve rejeitar refresh sem cookie', async () => {
    const agent = await req(app);
    const res = await agent.post('/api/auth/refresh');

    expect(res.status).toBe(401);
  });
});

describe('Auth — Argon2id (Item 13)', () => {
  let app: any;

  beforeEach(async () => {
    app = await getApp();
  });

  it('deve hashear senha com Argon2id no registro', async () => {
    const agent = await req(app);
    await agent.post('/api/auth/register').send({
      name: 'Argon2 User',
      email: 'argon2@example.com',
      password: 'Argon2Pass1',
    });

    // Buscar no banco COM select('+password')
    const user = await User.findOne({ email: 'argon2@example.com' }).select('+password');
    expect(user).not.toBeNull();
    expect(user!.password).toMatch(/^\$argon2/);
  });

  it('deve fazer login com hash Argon2id', async () => {
    const agent = await req(app);
    await agent.post('/api/auth/register').send({
      name: 'Argon2 Login',
      email: 'argon2login@example.com',
      password: 'Argon2Pass1',
    });

    const res = await agent.post('/api/auth/login').send({
      email: 'argon2login@example.com',
      password: 'Argon2Pass1',
    });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });
});

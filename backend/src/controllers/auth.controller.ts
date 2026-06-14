import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { hash as argon2Hash, verify as argon2Verify } from '@node-rs/argon2';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import User from '../models/User';
import RefreshToken from '../models/RefreshToken';
import { AuthRequest } from '../middleware/auth';
import { seedDemoBoard } from '../seeds/demoBoard';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { sendPasswordResetEmail } from '../utils/email';

const ACCESS_TTL = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const REFRESH_TTL_DAYS = parseInt(process.env.JWT_REFRESH_TTL_DAYS || '7', 10);
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

const generateAccessToken = (userId: string): string =>
  jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TTL,
    algorithm: 'HS256',
    issuer: 'flowsnyker',
    audience: 'flowsnyker-app',
  });

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

// FIX #4: Comparação tempo-constante para tokens — previne timing attacks
const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

const issueRefreshToken = async (userId: string, family?: string): Promise<string> => {
  const raw = crypto.randomBytes(48).toString('hex');
  const tokenFamily = family || crypto.randomUUID();
  await RefreshToken.create({
    userId,
    tokenHash: hashToken(raw),
    family: tokenFamily,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return `${tokenFamily}.${raw}`;
};

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: REFRESH_TTL_MS,
    path: '/api/auth',
  });
};

const userPayload = (user: { _id: unknown; name: string; email: string; avatar: string }) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      res.status(400).json({ error: 'Este email já está em uso' });
      return;
    }

    const hashedPassword = await argon2Hash(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=6C5CE7&textColor=ffffff`,
    });

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = await issueRefreshToken(user._id.toString());
    setRefreshCookie(res, refreshToken);

    await seedDemoBoard(user._id);

    res.status(201).json({ user: userPayload(user), accessToken });
  } catch (error) {
    logger.error('Register failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockedUntil');
    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      res.status(423).json({
        error: `Conta bloqueada por excesso de tentativas. Tente novamente em ${minutesLeft} min.`,
      });
      return;
    }

    // Item 13: Argon2id com fallback transparente para bcrypt
    // Hashes bcrypt começam com '$2a$' ou '$2b$', Argon2 com '$argon2'
    const isBcryptHash = user.password.startsWith('$2');
    let isMatch: boolean;

    if (isBcryptHash) {
      isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        // Migração transparente: re-hash com Argon2id
        const newHash = await argon2Hash(password);
        await User.updateOne({ _id: user._id }, { $set: { password: newHash } });
        logger.info('Password migrated to Argon2id', { userId: user._id.toString() });
      }
    } else {
      isMatch = await argon2Verify(user.password, password);
    }
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const update: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        update.lockedUntil = new Date(Date.now() + LOCKOUT_MS);
        update.failedLoginAttempts = 0;
        logger.warn('Account locked', { userId: user._id.toString() });
      }
      await User.updateOne({ _id: user._id }, { $set: update });
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    // Success: reset counters
    await User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lockedUntil: null } }
    );

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = await issueRefreshToken(user._id.toString());
    setRefreshCookie(res, refreshToken);

    res.json({ user: userPayload(user), accessToken });
  } catch (error) {
    logger.error('Login failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = req.cookies?.refreshToken;
    if (!raw || typeof raw !== 'string' || !raw.includes('.')) {
      res.status(401).json({ error: 'Refresh token ausente' });
      return;
    }

    const [family, secret] = raw.split('.');
    const stored = await RefreshToken.findOne({ tokenHash: hashToken(secret) });

    if (!stored || !safeEqual(stored.family, family)) {
      res.status(401).json({ error: 'Refresh token inválido' });
      return;
    }

    if (stored.expiresAt < new Date()) {
      res.status(401).json({ error: 'Refresh token expirado' });
      return;
    }

    // Reuse detection: if this token was already revoked, the whole family is compromised
    if (stored.revokedAt) {
      logger.warn('Refresh token reuse detected — revoking entire family', {
        userId: stored.userId.toString(),
        family,
      });
      await RefreshToken.updateMany(
        { family, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
      res.clearCookie('refreshToken', { path: '/api/auth' });
      res.status(401).json({ error: 'Sessão comprometida — faça login novamente' });
      return;
    }

    const user = await User.findById(stored.userId);
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }

    // Issue new tokens, mark old refresh as revoked + replacedBy
    const newRefresh = await issueRefreshToken(user._id.toString(), family);
    stored.revokedAt = new Date();
    stored.replacedBy = newRefresh.split('.')[1];
    await stored.save();

    const accessToken = generateAccessToken(user._id.toString());
    setRefreshCookie(res, newRefresh);

    res.json({ accessToken, user: userPayload(user) });
  } catch (error) {
    logger.error('Refresh failed', { error: (error as Error).message });
    res.status(401).json({ error: 'Refresh token inválido' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    res.json({ user: userPayload(user) });
  } catch (error) {
    logger.error('GetMe failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = req.cookies?.refreshToken;
    if (raw && typeof raw === 'string' && raw.includes('.')) {
      const [, secret] = raw.split('.');
      await RefreshToken.updateOne(
        { tokenHash: hashToken(secret), revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logout realizado com sucesso' });
  } catch {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logout realizado com sucesso' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.json({ message: 'Se o email estiver cadastrado, você receberá um link de recuperação.' });
      return;
    }

    // Criar o token JWT descartável assinado com a senha atual (se mudar a senha, o link expira!)
    const secret = process.env.JWT_SECRET! + user.password;
    const resetToken = jwt.sign({ id: user._id.toString() }, secret, { expiresIn: '15m' });

    // Construir a URL de reset
    const clientUrl = process.env.CLIENT_URL?.split(',')[0]?.trim() || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password/${user._id}/${resetToken}`;

    // 📧 Enviar email de recuperação via Gmail SMTP
    await sendPasswordResetEmail({
      to: email,
      resetUrl,
      userName: user.name,
    });

    res.json({ message: 'Se o email estiver cadastrado, você receberá um link de recuperação.' });
  } catch (error) {
    logger.error('ForgotPassword failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, token } = req.params;
    const { password } = req.body;
    const tokenStr = Array.isArray(token) ? token[0] : token;
    const idStr = Array.isArray(id) ? id[0] : id;

    if (!idStr || !tokenStr || !password) {
      res.status(400).json({ error: 'ID, token e nova senha são obrigatórios' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      res.status(400).json({ error: 'Link de recuperação inválido.' });
      return;
    }

    if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      res.status(400).json({ error: 'Senha deve ter pelo menos 8 caracteres, com 1 maiúscula, 1 minúscula e 1 número' });
      return;
    }

    const user = await User.findById(idStr).select('+password');
    if (!user) {
      res.status(400).json({ error: 'Link inválido ou usuário não encontrado.' });
      return;
    }

    // A assinatura do token é baseada na senha atual
    const secret = process.env.JWT_SECRET! + user.password;
    
    try {
      jwt.verify(tokenStr, secret, { algorithms: ['HS256'] });
    } catch (err) {
      res.status(400).json({ error: 'Token expirado ou inválido. Solicite um novo link de recuperação.' });
      return;
    }

    // Atualizar a senha
    const hashedPassword = await argon2Hash(password);
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }
    );

    logger.info('Password reset successful', { userId: user._id.toString() });
    res.json({ message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' });
  } catch (error) {
    logger.error('ResetPassword failed', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};


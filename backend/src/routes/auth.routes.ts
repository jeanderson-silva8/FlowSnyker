import { Router } from 'express';
import { z } from 'zod';
import { register, login, refresh, getMe, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';
import auth from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

const passwordPolicy = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Senha deve conter pelo menos 1 maiúscula, 1 minúscula e 1 número'
  );

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50),
  email: z.string().email('Email inválido'),
  password: passwordPolicy,
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const resetPasswordSchema = z.object({
  password: passwordPolicy,
});


// ─── Item 18: CSRF middleware para /refresh ──────────────────────
// Valida que o header Origin bate com CLIENT_URL.
// Requests sem Origin (curl, Postman) são permitidos em dev.
const csrfCheck = (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction): void => {
  const origin = req.headers.origin;
  if (!origin) {
    // Requests server-side (sem Origin) — permitir em dev, bloquear em prod
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({ error: 'Origin header obrigatório' });
      return;
    }
    next();
    return;
  }

  const allowedOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (!allowedOrigins.includes(origin)) {
    res.status(403).json({ error: 'Origin não autorizada' });
    return;
  }

  next();
};

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', csrfCheck, refresh);
router.get('/me', auth, getMe);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:id/:token', authLimiter, validate(resetPasswordSchema), resetPassword);

export default router;


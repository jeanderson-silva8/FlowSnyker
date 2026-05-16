import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

const auth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    // FIX #2: Allowlist de algoritmos + issuer/audience — previne algorithm confusion
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
      issuer: 'flowsnyker',
      audience: 'flowsnyker-app',
    }) as { userId: string };

    // Validação adicional do payload
    if (!decoded.userId || typeof decoded.userId !== 'string') {
      res.status(401).json({ error: 'Token payload inválido' });
      return;
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

export default auth;

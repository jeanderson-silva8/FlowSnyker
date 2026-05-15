import { Response, NextFunction } from 'express';
import Board from '../models/Board';
import { AuthRequest } from './auth';
import { logger } from '../utils/logger';

/**
 * Middleware centralizado de autorização por board.
 *
 * Verifica se o usuário autenticado é membro do board referenciado
 * na requisição. O boardId pode vir de diferentes fontes:
 *   - req.params.id       (rotas de board: GET/PUT/DELETE /boards/:id)
 *   - req.params.boardId  (rotas aninhadas futuras)
 *   - req.body.boardId    (criação de card: POST /cards)
 *
 * @param source - de onde extrair o boardId ('params.id' | 'params.boardId' | 'body.boardId')
 */
export const requireBoardAccess = (
  source: 'params.id' | 'params.boardId' | 'body.boardId' = 'params.id'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      let boardId: string | undefined;

      switch (source) {
        case 'params.id':
          boardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
          break;
        case 'params.boardId':
          boardId = Array.isArray(req.params.boardId) ? req.params.boardId[0] : req.params.boardId;
          break;
        case 'body.boardId':
          boardId = req.body?.boardId;
          break;
      }

      if (!boardId || !/^[a-f0-9]{24}$/.test(boardId)) {
        res.status(400).json({ error: 'Board ID inválido' });
        return;
      }

      const board = await Board.findById(boardId).select('members').lean();

      if (!board) {
        res.status(404).json({ error: 'Board não encontrado' });
        return;
      }

      const isMember = board.members.some(
        (m) => m.toString() === req.userId
      );

      if (!isMember) {
        logger.warn('Board access denied', {
          userId: req.userId,
          boardId,
          source,
        });
        res.status(403).json({ error: 'Acesso negado a este board' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Board access check failed', { error: (error as Error).message });
      res.status(500).json({ error: 'Erro ao verificar acesso ao board' });
    }
  };
};

/**
 * Verifica se o usuário é o OWNER do board (para operações destrutivas).
 */
export const requireBoardOwner = (
  source: 'params.id' | 'params.boardId' = 'params.id'
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const paramVal = source === 'params.id' ? req.params.id : req.params.boardId;
      const boardId = Array.isArray(paramVal) ? paramVal[0] : paramVal;

      if (!boardId || !/^[a-f0-9]{24}$/.test(boardId)) {
        res.status(400).json({ error: 'Board ID inválido' });
        return;
      }

      const board = await Board.findById(boardId).select('owner').lean();

      if (!board) {
        res.status(404).json({ error: 'Board não encontrado' });
        return;
      }

      if (board.owner.toString() !== req.userId) {
        res.status(403).json({ error: 'Apenas o dono pode realizar esta ação' });
        return;
      }

      next();
    } catch (error) {
      logger.error('Board owner check failed', { error: (error as Error).message });
      res.status(500).json({ error: 'Erro ao verificar propriedade do board' });
    }
  };
};

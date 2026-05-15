import { Response } from 'express';
import Card from '../models/Card';
import Board from '../models/Board';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * Verifica se o usuário é membro do board ao qual o card pertence.
 * Usado nos endpoints que recebem cardId via params (update, move, delete).
 */
const assertCardAccess = async (cardId: string, userId: string): Promise<{ allowed: boolean; card: any; status: number; error?: string }> => {
  if (!/^[a-f0-9]{24}$/.test(cardId)) {
    return { allowed: false, card: null, status: 400, error: 'Card ID inválido' };
  }

  const card = await Card.findById(cardId);
  if (!card) {
    return { allowed: false, card: null, status: 404, error: 'Card não encontrado' };
  }

  const board = await Board.findById(card.boardId).select('members').lean();
  if (!board) {
    return { allowed: false, card: null, status: 404, error: 'Board não encontrado' };
  }

  const isMember = board.members.some((m) => m.toString() === userId);
  if (!isMember) {
    logger.warn('Card access denied', { userId, cardId, boardId: card.boardId.toString() });
    return { allowed: false, card: null, status: 403, error: 'Acesso negado a este board' };
  }

  return { allowed: true, card, status: 200 };
};

export const createCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { boardId, columnId, title, description, labels, priority } = req.body;

    // Autorização já verificada pelo middleware requireBoardAccess('body.boardId')

    const board = await Board.findById(boardId);
    if (!board) {
      res.status(404).json({ error: 'Board não encontrado' });
      return;
    }

    const maxOrder = await Card.findOne({ boardId, columnId })
      .sort({ order: -1 })
      .select('order');

    const card = await Card.create({
      boardId,
      columnId,
      title,
      description: description || '',
      labels: labels || [],
      priority: priority || 'medium',
      order: maxOrder ? maxOrder.order + 1 : 0,
    });

    const populated = await Card.findById(card._id).populate('assignees', 'name email avatar');
    res.status(201).json(populated);
  } catch (error) {
    logger.error('Create card error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao criar card' });
  }
};

export const updateCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const access = await assertCardAccess(cardId, req.userId!);
    if (!access.allowed) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const { title, description, labels, priority, dueDate, assignees } = req.body;
    const card = await Card.findByIdAndUpdate(
      cardId,
      { title, description, labels, priority, dueDate, assignees },
      { new: true, runValidators: true }
    ).populate('assignees', 'name email avatar');

    if (!card) {
      res.status(404).json({ error: 'Card não encontrado' });
      return;
    }

    res.json(card);
  } catch (error) {
    logger.error('Update card error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao atualizar card' });
  }
};

export const moveCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const access = await assertCardAccess(cardId, req.userId!);
    if (!access.allowed) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const { columnId, order } = req.body;
    const card = await Card.findByIdAndUpdate(
      cardId,
      { columnId, order },
      { new: true }
    ).populate('assignees', 'name email avatar');

    if (!card) {
      res.status(404).json({ error: 'Card não encontrado' });
      return;
    }

    res.json(card);
  } catch (error) {
    logger.error('Move card error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao mover card' });
  }
};

export const deleteCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const access = await assertCardAccess(cardId, req.userId!);
    if (!access.allowed) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const card = await Card.findByIdAndDelete(cardId);
    if (!card) {
      res.status(404).json({ error: 'Card não encontrado' });
      return;
    }

    res.json({ message: 'Card deletado com sucesso' });
  } catch (error) {
    logger.error('Delete card error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao deletar card' });
  }
};

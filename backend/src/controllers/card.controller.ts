import { Response } from 'express';
import Card from '../models/Card';
import Board from '../models/Board';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors';

/**
 * Verifica se o usuário é membro do board ao qual o card pertence.
 * Usado nos endpoints que recebem cardId via params (update, move, delete).
 */
const assertCardAccess = async (cardId: string, userId: string) => {
  if (!/^[a-f0-9]{24}$/.test(cardId)) {
    throw new BadRequestError('Card ID inválido');
  }

  const card = await Card.findById(cardId);
  if (!card) {
    throw new NotFoundError('Card não encontrado');
  }

  const board = await Board.findById(card.boardId).select('members').lean();
  if (!board) {
    throw new NotFoundError('Board não encontrado');
  }

  const isMember = board.members.some((m) => m.toString() === userId);
  if (!isMember) {
    logger.warn('Card access denied', { userId, cardId, boardId: card.boardId.toString() });
    throw new ForbiddenError('Acesso negado a este board');
  }

  return card;
};

// FIX #5: Controllers usam throw + asyncHandler — sem try/catch repetido

export const createCard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { boardId, columnId, title, description, labels, priority } = req.body;

  // Autorização já verificada pelo middleware requireBoardAccess('body.boardId')

  const board = await Board.findById(boardId);
  if (!board) {
    throw new NotFoundError('Board não encontrado');
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
});

export const updateCard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await assertCardAccess(cardId, req.userId!);

  const { title, description, labels, priority, dueDate, assignees } = req.body;
  const card = await Card.findByIdAndUpdate(
    cardId,
    { title, description, labels, priority, dueDate, assignees },
    { new: true, runValidators: true }
  ).populate('assignees', 'name email avatar');

  if (!card) {
    throw new NotFoundError('Card não encontrado');
  }

  res.json(card);
});

export const moveCard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await assertCardAccess(cardId, req.userId!);

  const { columnId, order } = req.body;
  const card = await Card.findByIdAndUpdate(
    cardId,
    { columnId, order },
    { new: true }
  ).populate('assignees', 'name email avatar');

  if (!card) {
    throw new NotFoundError('Card não encontrado');
  }

  res.json(card);
});

export const deleteCard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const cardId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await assertCardAccess(cardId, req.userId!);

  const card = await Card.findByIdAndDelete(cardId);
  if (!card) {
    throw new NotFoundError('Card não encontrado');
  }

  res.json({ message: 'Card deletado com sucesso' });
});

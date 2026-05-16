import { Response } from 'express';
import mongoose from 'mongoose';
import Board from '../models/Board';
import Card from '../models/Card';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { NotFoundError, BadRequestError } from '../utils/errors';

// FIX #5: Controllers usam throw + asyncHandler — sem try/catch repetido

export const createBoard = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title } = req.body;

  const board = await Board.create({
    title,
    owner: req.userId,
    members: [req.userId],
    columns: [
      { _id: new mongoose.Types.ObjectId().toString(), title: '📋 Tarefas', order: 0 },
      { _id: new mongoose.Types.ObjectId().toString(), title: '🔨 Em Progresso', order: 1 },
      { _id: new mongoose.Types.ObjectId().toString(), title: '👀 Revisão', order: 2 },
      { _id: new mongoose.Types.ObjectId().toString(), title: '✅ Concluído', order: 3 },
    ],
  });

  const populated = await Board.findById(board._id)
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar');

  res.status(201).json(populated);
});

export const getBoards = asyncHandler(async (req: AuthRequest, res: Response) => {
  const boards = await Board.find({ members: req.userId })
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar')
    .sort({ updatedAt: -1 });

  // Item 15: Resolver N+1 — uma única aggregate ao invés de N countDocuments
  const boardIds = boards.map((b) => b._id);
  const cardCounts = await Card.aggregate([
    { $match: { boardId: { $in: boardIds } } },
    { $group: { _id: '$boardId', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(
    cardCounts.map((c) => [c._id.toString(), c.count as number])
  );

  const boardsWithCounts = boards.map((board) => ({
    ...board.toObject(),
    cardCount: countMap.get(board._id.toString()) || 0,
  }));

  res.json(boardsWithCounts);
});

export const getBoard = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Autorização já verificada pelo middleware requireBoardAccess('params.id')
  const board = await Board.findById(req.params.id)
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar');

  if (!board) {
    throw new NotFoundError('Board não encontrado');
  }

  const cards = await Card.find({ boardId: board._id })
    .populate('assignees', 'name email avatar')
    .sort({ order: 1 });

  res.json({ board, cards });
});

export const updateBoard = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Autorização de owner já verificada pelo middleware requireBoardOwner('params.id')
  const board = await Board.findById(req.params.id);
  if (!board) {
    throw new NotFoundError('Board não encontrado');
  }

  const { title, columns } = req.body;
  if (title) board.title = title;
  if (columns) board.columns = columns;
  await board.save();

  res.json(board);
});

export const deleteBoard = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Autorização de owner já verificada pelo middleware requireBoardOwner('params.id')
  const board = await Board.findById(req.params.id);
  if (!board) {
    throw new NotFoundError('Board não encontrado');
  }

  await Card.deleteMany({ boardId: board._id });
  await Board.findByIdAndDelete(board._id);

  res.json({ message: 'Board deletado com sucesso' });
});

export const inviteMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  // Item 6: Autorização já verificada pelo middleware requireBoardAccess('params.id')
  const { email } = req.body;
  const board = await Board.findById(req.params.id);

  if (!board) {
    throw new NotFoundError('Board não encontrado');
  }

  const User = mongoose.model('User');
  const userToInvite = await User.findOne({ email });
  if (!userToInvite) {
    throw new NotFoundError('Usuário não encontrado com este email');
  }

  const alreadyMember = board.members.some(
    (m) => m.toString() === userToInvite._id.toString()
  );
  if (alreadyMember) {
    throw new BadRequestError('Usuário já é membro deste board');
  }

  board.members.push(userToInvite._id as mongoose.Types.ObjectId);
  await board.save();

  const populated = await Board.findById(board._id)
    .populate('owner', 'name email avatar')
    .populate('members', 'name email avatar');

  res.json(populated);
});

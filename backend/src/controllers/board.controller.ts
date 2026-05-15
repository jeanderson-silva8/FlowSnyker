import { Response } from 'express';
import mongoose from 'mongoose';
import Board from '../models/Board';
import Card from '../models/Card';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const createBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    logger.error('Create board error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao criar board' });
  }
};

export const getBoards = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error) {
    logger.error('Get boards error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao buscar boards' });
  }
};

export const getBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Autorização já verificada pelo middleware requireBoardAccess('params.id')
    const board = await Board.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!board) {
      res.status(404).json({ error: 'Board não encontrado' });
      return;
    }

    const cards = await Card.find({ boardId: board._id })
      .populate('assignees', 'name email avatar')
      .sort({ order: 1 });

    res.json({ board, cards });
  } catch (error) {
    logger.error('Get board error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao buscar board' });
  }
};

export const updateBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Autorização de owner já verificada pelo middleware requireBoardOwner('params.id')
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404).json({ error: 'Board não encontrado' });
      return;
    }

    const { title, columns } = req.body;
    if (title) board.title = title;
    if (columns) board.columns = columns;
    await board.save();

    res.json(board);
  } catch (error) {
    logger.error('Update board error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao atualizar board' });
  }
};

export const deleteBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Autorização de owner já verificada pelo middleware requireBoardOwner('params.id')
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404).json({ error: 'Board não encontrado' });
      return;
    }

    await Card.deleteMany({ boardId: board._id });
    await Board.findByIdAndDelete(board._id);

    res.json({ message: 'Board deletado com sucesso' });
  } catch (error) {
    logger.error('Delete board error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao deletar board' });
  }
};

export const inviteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Item 6: Autorização já verificada pelo middleware requireBoardAccess('params.id')
    // Apenas membros existentes podem convidar novos membros.
    const { email } = req.body;
    const board = await Board.findById(req.params.id);

    if (!board) {
      res.status(404).json({ error: 'Board não encontrado' });
      return;
    }

    const User = mongoose.model('User');
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) {
      res.status(404).json({ error: 'Usuário não encontrado com este email' });
      return;
    }

    const alreadyMember = board.members.some(
      (m) => m.toString() === userToInvite._id.toString()
    );
    if (alreadyMember) {
      res.status(400).json({ error: 'Usuário já é membro deste board' });
      return;
    }

    board.members.push(userToInvite._id as mongoose.Types.ObjectId);
    await board.save();

    const populated = await Board.findById(board._id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    res.json(populated);
  } catch (error) {
    logger.error('Invite member error', { error: (error as Error).message });
    res.status(500).json({ error: 'Erro ao convidar membro' });
  }
};

import { Response } from 'express';
import mongoose from 'mongoose';
import Board from '../models/Board';
import Card from '../models/Card';
import { AuthRequest } from '../middleware/auth';

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
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Erro ao criar board' });
  }
};

export const getBoards = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const boards = await Board.find({ members: req.userId })
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ updatedAt: -1 });

    // Get card counts for each board
    const boardsWithCounts = await Promise.all(
      boards.map(async (board) => {
        const cardCount = await Card.countDocuments({ boardId: board._id });
        return { ...board.toObject(), cardCount };
      })
    );

    res.json(boardsWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar boards' });
  }
};

export const getBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const board = await Board.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!board) {
      res.status(404).json({ error: 'Board não encontrado' });
      return;
    }

    const isMember = board.members.some(
      (m: any) => m._id.toString() === req.userId
    );
    if (!isMember) {
      res.status(403).json({ error: 'Acesso negado a este board' });
      return;
    }

    const cards = await Card.find({ boardId: board._id })
      .populate('assignees', 'name email avatar')
      .sort({ order: 1 });

    res.json({ board, cards });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar board' });
  }
};

export const updateBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404).json({ error: 'Board não encontrado' });
      return;
    }

    if (board.owner.toString() !== req.userId) {
      res.status(403).json({ error: 'Apenas o dono pode editar o board' });
      return;
    }

    const { title, columns } = req.body;
    if (title) board.title = title;
    if (columns) board.columns = columns;
    await board.save();

    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar board' });
  }
};

export const deleteBoard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      res.status(404).json({ error: 'Board não encontrado' });
      return;
    }

    if (board.owner.toString() !== req.userId) {
      res.status(403).json({ error: 'Apenas o dono pode deletar o board' });
      return;
    }

    await Card.deleteMany({ boardId: board._id });
    await Board.findByIdAndDelete(board._id);

    res.json({ message: 'Board deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar board' });
  }
};

export const inviteMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
    res.status(500).json({ error: 'Erro ao convidar membro' });
  }
};

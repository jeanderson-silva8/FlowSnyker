import { Response } from 'express';
import Card from '../models/Card';
import Board from '../models/Board';
import { AuthRequest } from '../middleware/auth';

export const createCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { boardId, columnId, title, description, labels, priority } = req.body;

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
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Erro ao criar card' });
  }
};

export const updateCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, labels, priority, dueDate, assignees } = req.body;
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      { title, description, labels, priority, dueDate, assignees },
      { new: true, runValidators: true }
    ).populate('assignees', 'name email avatar');

    if (!card) {
      res.status(404).json({ error: 'Card não encontrado' });
      return;
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar card' });
  }
};

export const moveCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { columnId, order } = req.body;
    const card = await Card.findByIdAndUpdate(
      req.params.id,
      { columnId, order },
      { new: true }
    ).populate('assignees', 'name email avatar');

    if (!card) {
      res.status(404).json({ error: 'Card não encontrado' });
      return;
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao mover card' });
  }
};

export const deleteCard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const card = await Card.findByIdAndDelete(req.params.id);
    if (!card) {
      res.status(404).json({ error: 'Card não encontrado' });
      return;
    }

    res.json({ message: 'Card deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar card' });
  }
};

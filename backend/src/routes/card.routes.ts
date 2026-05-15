import { Router } from 'express';
import { z } from 'zod';
import { createCard, updateCard, moveCard, deleteCard } from '../controllers/card.controller';
import auth from '../middleware/auth';
import { validate } from '../middleware/validate';
import { requireBoardAccess } from '../middleware/boardAccess';

const router = Router();

// Regex para validar ObjectId do MongoDB
const objectId = z.string().regex(/^[a-f0-9]{24}$/, 'ID inválido');

const createCardSchema = z.object({
  boardId: objectId,
  columnId: z.string().min(1),
  title: z.string().min(1, 'Título é obrigatório').max(200),
  description: z.string().max(2000).optional(),
  labels: z.array(z.object({ text: z.string().max(50), color: z.string().max(20) })).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  labels: z.array(z.object({ text: z.string().max(50), color: z.string().max(20) })).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignees: z.array(objectId).optional(),
});

const moveCardSchema = z.object({
  columnId: z.string().min(1),
  order: z.number().int().min(0),
});

router.use(auth);
router.post('/', validate(createCardSchema), requireBoardAccess('body.boardId'), createCard);
router.put('/:id', validate(updateCardSchema), updateCard);
router.patch('/:id/move', validate(moveCardSchema), moveCard);
router.delete('/:id', deleteCard);

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { createBoard, getBoards, getBoard, updateBoard, deleteBoard, inviteMember } from '../controllers/board.controller';
import auth from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createBoardSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(100),
});

const updateBoardSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  columns: z
    .array(
      z.object({
        _id: z.string().min(1),
        title: z.string().min(1).max(100),
        order: z.number().int().min(0),
      })
    )
    .optional(),
});

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
});

router.use(auth);
router.post('/', validate(createBoardSchema), createBoard);
router.get('/', getBoards);
router.get('/:id', getBoard);
router.put('/:id', validate(updateBoardSchema), updateBoard);
router.delete('/:id', deleteBoard);
router.post('/:id/invite', validate(inviteSchema), inviteMember);

export default router;

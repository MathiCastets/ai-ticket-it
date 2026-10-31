import { Router } from 'express';
import { eventoController } from '../controllers/EventoController.js';

const router = Router();

router.get('/', eventoController.getAll);
router.get('/:id', eventoController.getById);
router.post('/', eventoController.create);
router.post('/:id/resenias', eventoController.addReview);

export default router;

import { Router } from 'express';
import { eventoController } from '../controllers/EventoController.js';
import { receiveEventImages } from '../middlewares/eventImageUpload.js';
import { authHandler } from '../middlewares/authHandler.js';

const router = Router();

router.get('/', eventoController.getAll);
router.get('/:id', eventoController.getById);
router.post('/', authHandler, receiveEventImages, eventoController.create);
router.put('/:id', authHandler, receiveEventImages, eventoController.update);

export default router;

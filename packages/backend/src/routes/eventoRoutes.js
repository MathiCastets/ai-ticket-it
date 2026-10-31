import { Router } from 'express';
import { eventoController } from '../controllers/EventoController.js';
import { receiveEventImages } from '../middlewares/eventImageUpload.js';

const router = Router();

router.get('/', eventoController.getAll);
router.get('/:id', eventoController.getById);
router.post('/', receiveEventImages, eventoController.create);
router.post('/:id/resenias', eventoController.addReview);

export default router;

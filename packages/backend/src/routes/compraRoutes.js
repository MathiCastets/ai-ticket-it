import { Router } from 'express';
import { compraController } from '../controllers/CompraController.js';

const router = Router();

router.get('/', compraController.getAll);
router.post('/', compraController.create);
router.get('/:id', compraController.getById);
router.post('/:id/cancelar', compraController.cancel);
router.post('/:id/acreditar', compraController.markUsed);
router.post('/:id/calificar', compraController.rate);
router.get('/:id/mensajes', compraController.getMessages);
router.post('/:id/mensajes', compraController.sendMessage);
router.put('/:id/mensajes/leidos', compraController.markMessagesRead);

export default router;

import { Router } from 'express';
import { compraController } from '../controllers/CompraController.js';
import { authHandler } from '../middlewares/authHandler.js';

const router = Router();

// Todas las rutas de compras son privadas y requieren autenticación mediante X-User-Id
router.use(authHandler);

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

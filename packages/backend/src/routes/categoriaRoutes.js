import { Router } from 'express';
import { categoriaController } from '../controllers/CategoriaController.js';

const router = Router();

router.get('/', categoriaController.getAll);

export default router;

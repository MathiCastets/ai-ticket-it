import { Router } from 'express';
import { categoriaRepository } from '../repositories/inMemory/CategoriaRepository.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const categorias = await categoriaRepository.findAll();
    res.status(200).json({ data: categorias });
  } catch (error) {
    next(error);
  }
});

export default router;

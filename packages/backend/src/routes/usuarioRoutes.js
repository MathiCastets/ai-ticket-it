import { Router } from 'express';
import { usuarioController } from '../controllers/UsuarioController.js';

const router = Router();

router.get('/:id/favoritos', usuarioController.getFavorites);
router.put('/:id/favoritos/:eventoId', usuarioController.addFavorite);
router.delete('/:id/favoritos/:eventoId', usuarioController.removeFavorite);

export default router;

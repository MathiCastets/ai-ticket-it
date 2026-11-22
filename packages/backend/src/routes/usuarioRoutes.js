import { Router } from 'express';
import { usuarioController } from '../controllers/UsuarioController.js';
import { authHandler } from '../middlewares/authHandler.js';

const router = Router();

// Rutas públicas
router.get('/', usuarioController.getAll);
router.get('/:id/resenias', usuarioController.getReviews);

// Rutas de favoritos: requieren autenticación + ser el propio usuario
const soloPropioPerfil = (req, res, next) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No puedes gestionar favoritos de otro usuario' } });
  }
  return next();
};

router.get('/:id/favoritos', authHandler, soloPropioPerfil, usuarioController.getFavorites);
router.put('/:id/favoritos/:eventoId', authHandler, soloPropioPerfil, usuarioController.addFavorite);
router.delete('/:id/favoritos/:eventoId', authHandler, soloPropioPerfil, usuarioController.removeFavorite);

export default router;

import { Router } from 'express';
import eventoRoutes from './eventoRoutes.js';
import compraRoutes from './compraRoutes.js';
import categoriaRoutes from './categoriaRoutes.js';
import usuarioRoutes from './usuarioRoutes.js';

const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

apiRouter.use('/eventos', eventoRoutes);
apiRouter.use('/compras', compraRoutes);
apiRouter.use('/categorias', categoriaRoutes);
apiRouter.use('/usuarios', usuarioRoutes);

export default apiRouter;

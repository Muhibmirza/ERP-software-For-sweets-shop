import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  cancelProductionOrder,
  completeProductionOrder,
  createProductionOrder,
  deleteProductionOrder,
  getProductionOrder,
  getProductionOrders,
  getTodayProduction,
  updateProductionOrder,
  startProductionOrder
} from '../controllers/production.controller';

const router = Router();
router.use(authenticate);

router.get('/today', getTodayProduction);
router.get('/', getProductionOrders);
router.get('/:id', getProductionOrder);
router.post('/', authorize('ADMIN', 'PRODUCTION_MANAGER'), createProductionOrder);
router.put('/:id', authorize('ADMIN'), updateProductionOrder);
router.delete('/:id', authorize('ADMIN'), deleteProductionOrder);
router.patch('/:id/start', authorize('ADMIN', 'PRODUCTION_MANAGER'), startProductionOrder);
router.patch('/:id/complete', authorize('ADMIN', 'PRODUCTION_MANAGER'), completeProductionOrder);
router.patch('/:id/cancel', authorize('ADMIN', 'PRODUCTION_MANAGER'), cancelProductionOrder);

export default router;

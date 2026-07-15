import { Router } from 'express';
import { getOrders, getOrder, createOrder, updateOrder, updateOrderStatus, deleteOrder, getTodaysDeliveries, getKanbanOrders } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/', getOrders);
router.get('/kanban', getKanbanOrders);
router.get('/today-deliveries', getTodaysDeliveries);
router.get('/:id', getOrder);
router.post('/', authorize('ADMIN'), createOrder);
router.put('/:id', authorize('ADMIN'), updateOrder);
router.patch('/:id/status', authorize('ADMIN', 'CASHIER'), updateOrderStatus);
router.delete('/:id', authorize('ADMIN'), deleteOrder);
export default router;

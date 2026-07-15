import { Router } from 'express';
import { getDashboardStats, getRevenueChart, getTopProducts, getRecentOrders } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/stats', getDashboardStats);
router.get('/revenue-chart', getRevenueChart);
router.get('/top-products', getTopProducts);
router.get('/recent-orders', getRecentOrders);
export default router;

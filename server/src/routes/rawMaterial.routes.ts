import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createRawMaterial,
  deleteRawMaterial,
  getRawMaterial,
  getRawMaterials,
  stockIn,
  stockOut,
  updateRawMaterial
} from '../controllers/rawMaterial.controller';

const router = Router();
router.use(authenticate);

router.get('/', getRawMaterials);
router.get('/:id', getRawMaterial);
router.post('/', authorize('ADMIN', 'PRODUCTION_MANAGER'), createRawMaterial);
router.put('/:id', authorize('ADMIN'), updateRawMaterial);
router.delete('/:id', authorize('ADMIN'), deleteRawMaterial);
router.post('/:id/stock-in', authorize('ADMIN', 'PRODUCTION_MANAGER'), stockIn);
router.post('/:id/stock-out', authorize('ADMIN', 'PRODUCTION_MANAGER'), stockOut);

export default router;

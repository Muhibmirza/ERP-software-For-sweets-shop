import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

router.get('/', async (req, res) => {
  const { tableName, userId } = req.query;
  const logs = await prisma.auditLog.findMany({
    where: {
      tableName: tableName ? String(tableName) : undefined,
      userId: userId ? String(userId) : undefined
    },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  res.json({ success: true, data: logs });
});

export default router;

import { Router } from 'express';
import { login, refreshToken, getMe, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', (_req, res) => res.json({ success: true, message: 'Logged out' }));
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);

export default router;

import { Router } from 'express';
import {
    login,
    register,
    getProfile,
    updateProfile,
    getAllUsersAdmin,
    approveUserAdmin,
    suspendUserAdmin,
    updateUserAdmin,
    resetUserPasswordAdmin,
    deleteUserAdmin,
} from '../controllers/authController';
import { getPublicUserProfile } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.get('/users/:id', getPublicUserProfile);

router.get('/admin/users', authMiddleware, adminMiddleware, getAllUsersAdmin);
router.put('/admin/users/:id', authMiddleware, adminMiddleware, updateUserAdmin);
router.put('/admin/users/:id/reset-password', authMiddleware, adminMiddleware, resetUserPasswordAdmin);
router.put('/admin/users/:id/approve', authMiddleware, adminMiddleware, approveUserAdmin);
router.put('/admin/users/:id/suspend', authMiddleware, adminMiddleware, suspendUserAdmin);
router.delete('/admin/users/:id', authMiddleware, adminMiddleware, deleteUserAdmin);

export default router;

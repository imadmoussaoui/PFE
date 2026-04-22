import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import {
    getAnnonces,
    getAnnonceById,
    createAnnonce,
    getMyAnnonces,
    updateAnnonce,
    deleteAnnonce,
    getAllAnnoncesAdmin,
    approveAnnonce,
    suspendAnnonce,
    deleteAnnonceAdmin,
    updateAnnonceAdmin,
} from '../controllers/annonceController';

const router = Router();

// Public
router.get('/', getAnnonces);

// Authenticated user routes — fixed paths before parameterized
router.get('/my', authMiddleware, getMyAnnonces);

// Admin routes — fixed prefix 'admin' before parameterized :id
router.get('/admin/all', authMiddleware, adminMiddleware, getAllAnnoncesAdmin);
router.put('/admin/:id/approve', authMiddleware, adminMiddleware, approveAnnonce);
router.put('/admin/:id/suspend', authMiddleware, adminMiddleware, suspendAnnonce);
router.put('/admin/:id/update', authMiddleware, adminMiddleware, updateAnnonceAdmin);
router.delete('/admin/:id', authMiddleware, adminMiddleware, deleteAnnonceAdmin);

// Parameterized user routes (after fixed routes)
router.get('/:id', getAnnonceById);
router.post('/', authMiddleware, createAnnonce);
router.put('/:id', authMiddleware, updateAnnonce);
router.delete('/:id', authMiddleware, deleteAnnonce);

export default router;

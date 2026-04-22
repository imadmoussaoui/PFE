import { Router } from 'express';
import {
    createOrUpdateReview,
    deleteMyAnnonceReview,
    deleteReviewAdmin,
    getAllReviewsAdmin,
    getMyAnnonceReview,
    getReviewTargets,
    getUsersReviewSummaries,
    getUserReviews,
    updateMyAnnonceReview,
    updateReviewAdmin,
    updateReviewStatusAdmin,
} from '../controllers/reviewController';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.get('/targets', authMiddleware, getReviewTargets);
router.get('/summary', getUsersReviewSummaries);
router.get('/user/:userId', getUserReviews);
router.get('/annonce/:annonceId/mine', authMiddleware, getMyAnnonceReview);
router.put('/annonce/:annonceId/mine', authMiddleware, updateMyAnnonceReview);
router.delete('/annonce/:annonceId/mine', authMiddleware, deleteMyAnnonceReview);
router.post('/', authMiddleware, createOrUpdateReview);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllReviewsAdmin);
router.put('/admin/:id', authMiddleware, adminMiddleware, updateReviewAdmin);
router.put('/admin/:id/status', authMiddleware, adminMiddleware, updateReviewStatusAdmin);
router.delete('/admin/:id', authMiddleware, adminMiddleware, deleteReviewAdmin);

export default router;

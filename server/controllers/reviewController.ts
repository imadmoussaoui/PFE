import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review';
import User from '../models/User';
import Annonce from '../models/Annonce';

const oppositeType = (userType: 'utilisateur' | 'artisan') =>
    userType === 'utilisateur' ? 'artisan' : 'utilisateur';

const canReviewTargetType = (
    reviewer: { role?: 'user' | 'admin'; userType: 'utilisateur' | 'artisan' },
    revieweeType: 'utilisateur' | 'artisan'
) => {
    if (reviewer.role === 'admin') {
        return true;
    }
    return revieweeType === oppositeType(reviewer.userType);
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/reviews/summary?userIds=id1,id2,id3
// Public: returns average rating and total reviews per user.
export const getUsersReviewSummaries = async (req: Request, res: Response) => {
    try {
        const { userIds } = req.query as { userIds?: string };
        if (!userIds) {
            return res.status(400).json({ message: 'Le parametre userIds est requis.' });
        }

        const ids = userIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean);

        if (!ids.length) {
            return res.status(400).json({ message: 'Aucun identifiant utilisateur valide.' });
        }

        const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
        if (!validIds.length) {
            return res.status(400).json({ message: 'Aucun identifiant utilisateur valide.' });
        }

        const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));

        const grouped = await Review.aggregate([
            { $match: { reviewee: { $in: objectIds }, status: 'approved' } },
            {
                $group: {
                    _id: '$reviewee',
                    total: { $sum: 1 },
                    averageRating: { $avg: '$rating' },
                },
            },
        ]);

        const summaryMap: Record<string, { total: number; averageRating: number }> = {};
        for (const id of validIds) {
            summaryMap[id] = { total: 0, averageRating: 0 };
        }

        grouped.forEach((item) => {
            const key = String(item._id);
            summaryMap[key] = {
                total: Number(item.total) || 0,
                averageRating: Number((Number(item.averageRating) || 0).toFixed(2)),
            };
        });

        return res.status(200).json({ summaries: summaryMap });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/reviews/targets
// Returns users that the connected user is allowed to review.
export const getReviewTargets = async (req: Request, res: Response) => {
    try {
        const me = await User.findById(req.userId).select('userType role moderationStatus');
        if (!me) return res.status(404).json({ message: 'Utilisateur introuvable' });

        if (me.role !== 'admin' && me.moderationStatus !== 'approved') {
            return res.status(403).json({
                message: 'Votre compte doit etre approuve pour laisser des avis.',
            });
        }

        const targetFilter: {
            _id: { $ne: typeof me._id };
            moderationStatus: 'approved';
            userType?: 'utilisateur' | 'artisan';
        } = {
            _id: { $ne: me._id },
            moderationStatus: 'approved',
        };

        if (me.role !== 'admin') {
            targetFilter.userType = oppositeType(me.userType);
        }

        const targets = await User.find(targetFilter)
            .select('nom prenom name userType profilePhoto')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            targetType: me.role === 'admin' ? 'all' : oppositeType(me.userType),
            targets,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/reviews/user/:userId
export const getUserReviews = async (req: Request, res: Response) => {
    try {
        const reviewee = await User.findById(req.params.userId).select('userType nom prenom name');
        if (!reviewee) return res.status(404).json({ message: 'Utilisateur introuvable' });

        const { page, limit, annonceId } = req.query as { page?: string; limit?: string; annonceId?: string };
        const hasPagination = page != null || limit != null;
        const parsedPage = Number(page ?? '1');
        const parsedLimit = Number(limit ?? '10');
        const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 10;

        const listFilter: {
            reviewee: typeof reviewee._id;
            status: 'approved';
            annonce?: mongoose.Types.ObjectId;
        } = {
            reviewee: reviewee._id,
            status: 'approved',
        };

        if (annonceId) {
            if (!mongoose.Types.ObjectId.isValid(annonceId)) {
                return res.status(400).json({ message: 'Identifiant annonce invalide.' });
            }

            const annonce = await Annonce.findById(annonceId).select('auteur');
            if (!annonce) {
                return res.status(404).json({ message: 'Annonce introuvable.' });
            }

            if (String(annonce.auteur) !== String(reviewee._id)) {
                return res.status(400).json({ message: 'Cette annonce ne correspond pas a cet utilisateur.' });
            }

            listFilter.annonce = new mongoose.Types.ObjectId(annonceId);
        }

        const baseQuery = Review.find(listFilter)
            .populate('reviewer', 'nom prenom name userType profilePhoto')
            .sort({ createdAt: -1 });

        const reviews = hasPagination
            ? await baseQuery
                .skip((currentPage - 1) * pageSize)
                .limit(pageSize)
            : await baseQuery;

        const listTotal = await Review.countDocuments(listFilter);
        const globalTotal = await Review.countDocuments({ reviewee: reviewee._id, status: 'approved' });

        // Aggregate over all reviews to keep accurate global stats even when paginated.
        const ratingStats = await Review.aggregate([
            { $match: { reviewee: reviewee._id, status: 'approved' } },
            {
                $group: {
                    _id: null,
                    sum: { $sum: '$rating' },
                },
            },
        ]);

        const averageRating = globalTotal
            ? Number((((ratingStats[0]?.sum as number) || 0) / globalTotal).toFixed(2))
            : 0;

        const pagination = hasPagination
            ? {
                page: currentPage,
                limit: pageSize,
                total: listTotal,
                totalPages: Math.max(1, Math.ceil(listTotal / pageSize)),
                hasNext: currentPage < Math.max(1, Math.ceil(listTotal / pageSize)),
                hasPrev: currentPage > 1,
            }
            : undefined;

        return res.status(200).json({
            reviewee,
            stats: {
                total: globalTotal,
                averageRating,
                annonceTotal: listTotal,
            },
            reviews,
            pagination,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// POST /api/reviews
// Creates or updates review from the connected user to target user.
export const createOrUpdateReview = async (req: Request, res: Response) => {
    try {
        const { annonceId, revieweeId, rating, comment } = req.body as {
            annonceId?: string;
            revieweeId?: string;
            rating?: number;
            comment?: string;
        };

        if (!annonceId || !revieweeId || rating == null) {
            return res.status(400).json({ message: 'annonceId, revieweeId et rating sont requis.' });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'La note doit etre un entier entre 1 et 5.' });
        }

        if (comment != null && typeof comment !== 'string') {
            return res.status(400).json({ message: 'Le commentaire doit etre une chaine de caracteres.' });
        }

        const normalizedComment = (comment || '').trim();
        if (normalizedComment.length > 500) {
            return res.status(400).json({ message: 'Le commentaire ne doit pas depasser 500 caracteres.' });
        }

        const reviewer = await User.findById(req.userId).select('userType role moderationStatus');
        if (!reviewer) return res.status(404).json({ message: 'Utilisateur introuvable' });

        if (reviewer.role !== 'admin' && reviewer.moderationStatus !== 'approved') {
            return res.status(403).json({
                message: 'Votre compte doit etre approuve pour laisser des avis.',
            });
        }

        const reviewee = await User.findById(revieweeId).select('userType moderationStatus');
        if (!reviewee) return res.status(404).json({ message: 'Utilisateur cible introuvable' });

        const annonce = await Annonce.findById(annonceId).select('auteur status');
        if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });

        if (String(annonce.auteur) !== String(reviewee._id)) {
            return res.status(400).json({ message: 'La cible de l avis doit etre le proprietaire de l annonce.' });
        }

        if (annonce.status !== 'approuvee') {
            return res.status(400).json({ message: 'Vous ne pouvez pas evaluer une annonce non approuvee.' });
        }

        if (reviewer._id.toString() === reviewee._id.toString()) {
            return res.status(400).json({ message: 'Vous ne pouvez pas vous auto-evaluer.' });
        }

        if (reviewee.moderationStatus !== 'approved') {
            return res.status(400).json({ message: 'Vous ne pouvez evaluer qu un compte approuve.' });
        }

        if (!canReviewTargetType(reviewer, reviewee.userType)) {
            return res.status(403).json({
                message:
                    reviewer.userType === 'utilisateur'
                        ? 'Un utilisateur peut uniquement laisser un avis a un artisan.'
                        : reviewer.userType === 'artisan'
                            ? 'Un artisan peut uniquement laisser un avis a un utilisateur.'
                            : 'Action non autorisee.',
            });
        }

        const existingForAnnonce = await Review.findOne({
            reviewer: reviewer._id,
            annonce: annonce._id,
        }).select('_id status comment rating createdAt updatedAt');

        if (existingForAnnonce) {
            existingForAnnonce.rating = rating;
            existingForAnnonce.comment = normalizedComment;
            existingForAnnonce.status = 'pending';
            await existingForAnnonce.save();

            return res.status(200).json({
                message: 'Avis modifie. Il est repasse en cours de validation.',
                review: existingForAnnonce,
            });
        }

        const saved = await Review.create({
            annonce: annonce._id,
            reviewer: reviewer._id,
            reviewee: reviewee._id,
            reviewerType: reviewer.userType,
            revieweeType: reviewee.userType,
            status: 'pending',
            rating,
            comment: normalizedComment,
        });

        return res.status(200).json({
            message: 'Avis enregistre. Il sera visible apres validation par un administrateur.',
            review: saved,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/reviews/annonce/:annonceId/mine
// Update connected user's review for this annonce and reset moderation status to pending.
export const updateMyAnnonceReview = async (req: Request, res: Response) => {
    try {
        const annonceId = Array.isArray(req.params.annonceId) ? req.params.annonceId[0] : req.params.annonceId;
        const { rating, comment } = req.body as { rating?: number; comment?: string };

        if (!mongoose.Types.ObjectId.isValid(annonceId)) {
            return res.status(400).json({ message: 'Identifiant annonce invalide.' });
        }

        if (!req.userId) {
            return res.status(401).json({ message: 'Non autorise' });
        }

        if (rating == null) {
            return res.status(400).json({ message: 'Le champ rating est requis.' });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'La note doit etre un entier entre 1 et 5.' });
        }

        if (comment != null && typeof comment !== 'string') {
            return res.status(400).json({ message: 'Le commentaire doit etre une chaine de caracteres.' });
        }

        const normalizedComment = (comment || '').trim();
        if (normalizedComment.length > 500) {
            return res.status(400).json({ message: 'Le commentaire ne doit pas depasser 500 caracteres.' });
        }

        const reviewer = await User.findById(req.userId).select('userType role moderationStatus');
        if (!reviewer) return res.status(404).json({ message: 'Utilisateur introuvable' });

        if (reviewer.role !== 'admin' && reviewer.moderationStatus !== 'approved') {
            return res.status(403).json({
                message: 'Votre compte doit etre approuve pour modifier un avis.',
            });
        }

        const annonce = await Annonce.findById(annonceId).select('auteur status');
        if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });

        if (annonce.status !== 'approuvee') {
            return res.status(400).json({ message: 'Vous ne pouvez pas modifier un avis pour une annonce non approuvee.' });
        }

        if (String(annonce.auteur) === String(reviewer._id)) {
            return res.status(400).json({ message: 'Vous ne pouvez pas vous auto-evaluer.' });
        }

        const reviewee = await User.findById(annonce.auteur).select('userType moderationStatus');
        if (!reviewee) return res.status(404).json({ message: 'Utilisateur cible introuvable' });

        if (reviewee.moderationStatus !== 'approved') {
            return res.status(400).json({ message: 'Vous ne pouvez evaluer qu un compte approuve.' });
        }

        if (!canReviewTargetType(reviewer, reviewee.userType)) {
            return res.status(403).json({
                message:
                    reviewer.userType === 'utilisateur'
                        ? 'Un utilisateur peut uniquement laisser un avis a un artisan.'
                        : reviewer.userType === 'artisan'
                            ? 'Un artisan peut uniquement laisser un avis a un utilisateur.'
                            : 'Action non autorisee.',
            });
        }

        const existingReview = await Review.findOne({
            annonce: annonce._id,
            reviewer: reviewer._id,
        });

        if (!existingReview) {
            return res.status(404).json({ message: 'Aucun avis existant pour cette annonce.' });
        }

        existingReview.rating = rating;
        existingReview.comment = normalizedComment;
        existingReview.status = 'pending';
        existingReview.reviewerType = reviewer.userType;
        existingReview.revieweeType = reviewee.userType;
        existingReview.reviewee = reviewee._id;
        await existingReview.save();

        return res.status(200).json({
            message: 'Avis modifie. Il est repasse en cours de validation.',
            review: existingReview,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// DELETE /api/reviews/annonce/:annonceId/mine
// Delete connected user's review for this annonce.
export const deleteMyAnnonceReview = async (req: Request, res: Response) => {
    try {
        const annonceId = Array.isArray(req.params.annonceId) ? req.params.annonceId[0] : req.params.annonceId;

        if (!mongoose.Types.ObjectId.isValid(annonceId)) {
            return res.status(400).json({ message: 'Identifiant annonce invalide.' });
        }

        if (!req.userId) {
            return res.status(401).json({ message: 'Non autorise' });
        }

        const deleted = await Review.findOneAndDelete({
            annonce: annonceId,
            reviewer: req.userId,
        }).select('_id');

        if (!deleted) {
            return res.status(404).json({ message: 'Aucun avis existant pour cette annonce.' });
        }

        return res.status(200).json({ message: 'Avis supprime avec succes.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/reviews/annonce/:annonceId/mine
// Returns the connected user's review for this annonce, including pending/rejected status.
export const getMyAnnonceReview = async (req: Request, res: Response) => {
    try {
        const annonceId = Array.isArray(req.params.annonceId) ? req.params.annonceId[0] : req.params.annonceId;
        if (!mongoose.Types.ObjectId.isValid(annonceId)) {
            return res.status(400).json({ message: 'Identifiant annonce invalide.' });
        }

        if (!req.userId) {
            return res.status(401).json({ message: 'Non autorise' });
        }

        const review = await Review.findOne({
            annonce: annonceId,
            reviewer: req.userId,
        })
            .select('rating comment status createdAt updatedAt reviewer reviewee annonce')
            .populate('reviewer', 'nom prenom name userType profilePhoto')
            .populate('reviewee', 'nom prenom name userType profilePhoto');

        return res.status(200).json({ review });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/reviews/admin/all
// Admin-only: returns all reviews with reviewer/reviewee profile snapshots.
export const getAllReviewsAdmin = async (req: Request, res: Response) => {
    try {
        const { revieweeType, reviewerType, rating, status, q, page, limit, sort } = req.query as {
            revieweeType?: 'utilisateur' | 'artisan';
            reviewerType?: 'utilisateur' | 'artisan';
            rating?: string;
            status?: 'pending' | 'approved' | 'rejected';
            q?: string;
            page?: string;
            limit?: string;
            sort?: 'latest' | 'oldest' | 'rating_desc' | 'rating_asc';
        };

        const filter: {
            revieweeType?: 'utilisateur' | 'artisan';
            reviewerType?: 'utilisateur' | 'artisan';
            status?: 'pending' | 'approved' | 'rejected';
            rating?: number;
        } = {};

        if (revieweeType && ['utilisateur', 'artisan'].includes(revieweeType)) {
            filter.revieweeType = revieweeType;
        }

        if (reviewerType && ['utilisateur', 'artisan'].includes(reviewerType)) {
            filter.reviewerType = reviewerType;
        }

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }

        if (rating != null && rating !== '') {
            const parsedRating = Number(rating);
            if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
                return res.status(400).json({ message: 'Le filtre rating doit etre un entier entre 1 et 5.' });
            }
            filter.rating = parsedRating;
        }

        const parsedPage = Number(page ?? '1');
        const parsedLimit = Number(limit ?? '10');
        const currentPage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
        const pageSize = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 50) : 10;
        const skip = (currentPage - 1) * pageSize;

        const sortMap: Record<string, Record<string, 1 | -1>> = {
            latest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            rating_desc: { rating: -1, createdAt: -1 },
            rating_asc: { rating: 1, createdAt: -1 },
        };
        const sortStage = sortMap[sort || 'latest'] || sortMap.latest;

        const pipeline: mongoose.PipelineStage[] = [
            { $match: filter },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reviewer',
                    foreignField: '_id',
                    as: 'reviewer',
                },
            },
            {
                $unwind: {
                    path: '$reviewer',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reviewee',
                    foreignField: '_id',
                    as: 'reviewee',
                },
            },
            {
                $unwind: {
                    path: '$reviewee',
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];

        const normalizedSearch = (q || '').trim();
        if (normalizedSearch) {
            const searchRegex = new RegExp(escapeRegex(normalizedSearch), 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { 'reviewer.nom': { $regex: searchRegex } },
                        { 'reviewer.prenom': { $regex: searchRegex } },
                        { 'reviewer.name': { $regex: searchRegex } },
                        { 'reviewee.nom': { $regex: searchRegex } },
                        { 'reviewee.prenom': { $regex: searchRegex } },
                        { 'reviewee.name': { $regex: searchRegex } },
                    ],
                },
            });
        }

        const [countResult] = await Review.aggregate([
            ...pipeline,
            { $count: 'total' },
        ]);
        const total = countResult?.total || 0;

        const reviews = await Review.aggregate([
            ...pipeline,
            { $sort: sortStage },
            { $skip: skip },
            { $limit: pageSize },
            {
                $project: {
                    _id: 1,
                    reviewerType: 1,
                    revieweeType: 1,
                    status: 1,
                    rating: 1,
                    comment: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    reviewer: {
                        _id: '$reviewer._id',
                        nom: '$reviewer.nom',
                        prenom: '$reviewer.prenom',
                        name: '$reviewer.name',
                        userType: '$reviewer.userType',
                        role: '$reviewer.role',
                    },
                    reviewee: {
                        _id: '$reviewee._id',
                        nom: '$reviewee.nom',
                        prenom: '$reviewee.prenom',
                        name: '$reviewee.name',
                        userType: '$reviewee.userType',
                        role: '$reviewee.role',
                    },
                },
            },
        ]);

        const totalPages = Math.max(1, Math.ceil(total / pageSize));

        return res.status(200).json({
            reviews,
            pagination: {
                page: currentPage,
                limit: pageSize,
                total,
                totalPages,
                hasNext: currentPage < totalPages,
                hasPrev: currentPage > 1,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/reviews/admin/:id
// Admin-only: update rating/comment of any review.
export const updateReviewAdmin = async (req: Request, res: Response) => {
    try {
        const reviewId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { rating, comment } = req.body as { rating?: number; comment?: string };

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: 'Identifiant avis invalide.' });
        }

        if (rating == null) {
            return res.status(400).json({ message: 'Le champ rating est requis.' });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'La note doit etre un entier entre 1 et 5.' });
        }

        if (comment != null && typeof comment !== 'string') {
            return res.status(400).json({ message: 'Le commentaire doit etre une chaine de caracteres.' });
        }

        const normalizedComment = (comment || '').trim();
        if (normalizedComment.length > 500) {
            return res.status(400).json({ message: 'Le commentaire ne doit pas depasser 500 caracteres.' });
        }

        const review = await Review.findByIdAndUpdate(
            reviewId,
            {
                $set: {
                    rating,
                    comment: normalizedComment,
                },
            },
            { new: true }
        )
            .populate('reviewer', 'nom prenom name userType profilePhoto role')
            .populate('reviewee', 'nom prenom name userType profilePhoto role');

        if (!review) {
            return res.status(404).json({ message: 'Avis introuvable.' });
        }

        return res.status(200).json({
            message: 'Avis mis a jour avec succes.',
            review,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/reviews/admin/:id/status
// Admin-only: approve or reject a review.
export const updateReviewStatusAdmin = async (req: Request, res: Response) => {
    try {
        const reviewId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { status } = req.body as { status?: 'approved' | 'rejected' };

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: 'Identifiant avis invalide.' });
        }

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Le statut doit etre approved ou rejected.' });
        }

        const review = await Review.findByIdAndUpdate(
            reviewId,
            { $set: { status } },
            { new: true }
        )
            .populate('reviewer', 'nom prenom name userType profilePhoto role')
            .populate('reviewee', 'nom prenom name userType profilePhoto role');

        if (!review) {
            return res.status(404).json({ message: 'Avis introuvable.' });
        }

        return res.status(200).json({
            message: status === 'approved' ? 'Avis approuve avec succes.' : 'Avis rejete avec succes.',
            review,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// DELETE /api/reviews/admin/:id
// Admin-only: delete any review.
export const deleteReviewAdmin = async (req: Request, res: Response) => {
    try {
        const reviewId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        if (!mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({ message: 'Identifiant avis invalide.' });
        }

        const deleted = await Review.findByIdAndDelete(reviewId).select('_id');
        if (!deleted) {
            return res.status(404).json({ message: 'Avis introuvable.' });
        }

        return res.status(200).json({ message: 'Avis supprime avec succes.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

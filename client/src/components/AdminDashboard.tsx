import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { resizeImage, validateImageFile } from '../utils/imageUtils';
import { MOROCCO_CITIES } from '../utils/moroccoCities';
import DEFAULT_AVATAR from '../utils/defaultAvatar';

interface Annonce {
    _id: string;
    titre: string;
    description: string;
    categories: string[];
    ville: string;
    prix?: number;
    contact?: string;
    status: 'en_attente' | 'approuvee' | 'suspendue';
    auteurNom: string;
    auteurPrenom: string;
    auteurType: 'utilisateur' | 'artisan';
    auteurPhoto?: string;
    images?: string[];
    adminNote?: string;
    createdAt: string;
}

interface Stats {
    total: number;
    en_attente: number;
    approuvee: number;
    suspendue: number;
}

interface AdminUser {
    _id: string;
    nom?: string;
    prenom?: string;
    name?: string;
    sexe?: string;
    adresse?: string;
    ville?: string;
    telephone?: string;
    email: string;
    userType: 'utilisateur' | 'artisan';
    role: 'user' | 'admin';
    moderationStatus: 'pending' | 'approved' | 'suspended';
    cni?: string;
    cnie?: string;
    profilePhoto?: string;
    createdAt: string;
}

const MAX_ANNONCE_IMAGES = 6;

interface UserStats {
    total: number;
    pending: number;
    approved: number;
    suspended: number;
}

interface ReviewProfile {
    _id: string;
    nom?: string;
    prenom?: string;
    name?: string;
    userType?: 'utilisateur' | 'artisan';
    role?: 'user' | 'admin';
}

interface AdminReviewItem {
    _id: string;
    rating: number;
    comment?: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewerType: 'utilisateur' | 'artisan';
    revieweeType: 'utilisateur' | 'artisan';
    reviewer?: ReviewProfile;
    reviewee?: ReviewProfile;
    createdAt: string;
    updatedAt: string;
}

interface ReviewPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

const STATUS_CONFIG = {
    en_attente: { label: 'En attente', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    approuvee: { label: 'Approuvée', cls: 'bg-green-50 text-green-700 border-green-200' },
    suspendue: { label: 'Suspendue', cls: 'bg-red-50 text-red-700 border-red-200' },
} as const;

type FilterStatus = '' | 'en_attente' | 'approuvee' | 'suspendue';
type UserFilterStatus = '' | 'pending' | 'approved' | 'suspended';
type ReviewUserTypeFilter = '' | 'utilisateur' | 'artisan';
type ReviewModerationStatus = '' | 'pending' | 'approved' | 'rejected';
type ReviewSort = 'latest' | 'oldest' | 'rating_desc' | 'rating_asc';

const CATEGORIES = [
    'Plomberie', 'Électricité', 'Climatisation / CVC', 'Dépannage routier',
    'Mécanique mobile', 'Serrurerie', 'Charpenterie', 'Peinture',
    'Nettoyage professionnel', 'Entretien de piscine', 'Sécurité / CCTV',
    'Transport de marchandises', 'Jardinage', 'Désinsectisation',
    'Service de pneus', "Réparation d'appareils", 'Autre',
];

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
    const { user } = useAuth();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const [annonces, setAnnonces] = useState<Annonce[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, en_attente: 0, approuvee: 0, suspendue: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('');
    const [adminTab, setAdminTab] = useState<'annonces' | 'users' | 'reviews'>('annonces');

    const [suspendingId, setSuspendingId] = useState<string | null>(null);
    const [suspendNote, setSuspendNote] = useState('');
    const [actionSubmitting, setActionSubmitting] = useState(false);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [userStats, setUserStats] = useState<UserStats>({ total: 0, pending: 0, approved: 0, suspended: 0 });
    const [userFilterStatus, setUserFilterStatus] = useState<UserFilterStatus>('');
    const [userActionLoadingId, setUserActionLoadingId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [passwordResetTarget, setPasswordResetTarget] = useState<AdminUser | null>(null);
    const [passwordResetData, setPasswordResetData] = useState({
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordResetSubmitting, setPasswordResetSubmitting] = useState(false);
    const [editUserData, setEditUserData] = useState({
        nom: '',
        prenom: '',
        sexe: '',
        adresse: '',
        ville: '',
        telephone: '',
        email: '',
        userType: 'utilisateur' as 'utilisateur' | 'artisan',
        moderationStatus: 'pending' as 'pending' | 'approved' | 'suspended',
        cni: '',
        profilePhoto: '',
    });
    const [isProcessingUserImage, setIsProcessingUserImage] = useState(false);

    const [reviews, setReviews] = useState<AdminReviewItem[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewFilterReviewerType, setReviewFilterReviewerType] = useState<ReviewUserTypeFilter>('');
    const [reviewFilterRevieweeType, setReviewFilterRevieweeType] = useState<ReviewUserTypeFilter>('');
    const [reviewFilterRating, setReviewFilterRating] = useState('');
    const [reviewFilterStatus, setReviewFilterStatus] = useState<ReviewModerationStatus>('');
    const [reviewSearch, setReviewSearch] = useState('');
    const [reviewSort, setReviewSort] = useState<ReviewSort>('latest');
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewLimit, setReviewLimit] = useState(10);
    const [reviewPageJump, setReviewPageJump] = useState('1');
    const [reviewPagination, setReviewPagination] = useState<ReviewPagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    });
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [reviewEditData, setReviewEditData] = useState({ rating: 5, comment: '' });
    const [reviewActionLoadingId, setReviewActionLoadingId] = useState<string | null>(null);
    const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
    const [pendingReviewsCount, setPendingReviewsCount] = useState(0);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState({
        titre: '',
        description: '',
        categories: [] as string[],
        ville: '',
        prix: '',
        contact: '',
        status: 'en_attente' as Annonce['status'],
        adminNote: '',
    });
    const [editImages, setEditImages] = useState<string[]>([]);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [annonceImageIndexes, setAnnonceImageIndexes] = useState<Record<string, number>>({});

    const fetchAnnonces = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.set('status', filterStatus);
            const response = await fetch(`${apiUrl}/api/annonces/admin/all?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setAnnonces(data.annonces);
            if (data.stats) setStats(data.stats);
        } catch {
            setError('Impossible de charger les annonces.');
        } finally {
            setLoading(false);
        }
    }, [apiUrl, filterStatus]);

    const fetchUsers = useCallback(async () => {
        setError('');
        try {
            const params = new URLSearchParams();
            if (userFilterStatus) params.set('moderationStatus', userFilterStatus);
            const response = await fetch(`${apiUrl}/api/auth/admin/users?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.users || []);
            if (data.stats) setUserStats(data.stats);
        } catch {
            setError('Impossible de charger les utilisateurs.');
        }
    }, [apiUrl, userFilterStatus]);

    const fetchReviews = useCallback(async () => {
        setReviewsLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (reviewFilterReviewerType) params.set('reviewerType', reviewFilterReviewerType);
            if (reviewFilterRevieweeType) params.set('revieweeType', reviewFilterRevieweeType);
            if (reviewFilterRating) params.set('rating', reviewFilterRating);
            if (reviewFilterStatus) params.set('status', reviewFilterStatus);
            if (reviewSearch.trim()) params.set('q', reviewSearch.trim());
            params.set('sort', reviewSort);
            params.set('page', String(reviewPage));
            params.set('limit', String(reviewLimit));

            const response = await fetch(`${apiUrl}/api/reviews/admin/all?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Impossible de charger les avis.');
                return;
            }
            setReviews(data.reviews || []);
            if (data.pagination) {
                setReviewPagination(data.pagination);
                if (typeof data.pagination.page === 'number' && data.pagination.page !== reviewPage) {
                    setReviewPage(data.pagination.page);
                }
            } else {
                setReviewPagination({
                    page: reviewPage,
                    limit: reviewLimit,
                    total: data.reviews?.length || 0,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false,
                });
            }
        } catch {
            setError('Impossible de charger les avis.');
        } finally {
            setReviewsLoading(false);
        }
    }, [apiUrl, reviewFilterReviewerType, reviewFilterRevieweeType, reviewFilterRating, reviewFilterStatus, reviewSearch, reviewSort, reviewPage, reviewLimit]);

    const fetchPendingReviewsCount = useCallback(async () => {
        try {
            const params = new URLSearchParams({ status: 'pending', page: '1', limit: '1' });
            const response = await fetch(`${apiUrl}/api/reviews/admin/all?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            if (!response.ok) return;
            const data = await response.json();
            setPendingReviewsCount(data?.pagination?.total || 0);
        } catch {
            // Keep dashboard usable if pending review count fails.
        }
    }, [apiUrl]);

    useEffect(() => { fetchAnnonces(); }, [fetchAnnonces]);
    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    useEffect(() => {
        if (adminTab === 'reviews') {
            fetchReviews();
        }
    }, [adminTab, fetchReviews]);

    useEffect(() => {
        fetchPendingReviewsCount();
    }, [fetchPendingReviewsCount]);

    useEffect(() => {
        setReviewPageJump(String(reviewPagination.page));
    }, [reviewPagination.page]);

    useEffect(() => {
        setAnnonceImageIndexes((prev) => {
            const next: Record<string, number> = {};
            for (const annonce of annonces) {
                const total = annonce.images?.length || 0;
                if (total === 0) {
                    next[annonce._id] = 0;
                    continue;
                }
                const currentIndex = prev[annonce._id] ?? 0;
                next[annonce._id] = Math.min(Math.max(currentIndex, 0), total - 1);
            }
            return next;
        });
    }, [annonces]);

    const flash = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const formatRelativeTimeFr = (value: string) => {
        const diffMs = Date.now() - new Date(value).getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffSecs < 60) return "à l'instant";
        if (diffMins < 60) return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
        if (diffDays < 7) return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        if (diffWeeks < 4) return `il y a ${diffWeeks} semaine${diffWeeks > 1 ? 's' : ''}`;
        if (diffMonths < 12) return `il y a ${diffMonths} mois`;
        return `il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
    };

    const goToAnnonceImage = (annonceId: string, index: number, total: number) => {
        if (total <= 0) return;
        const normalized = ((index % total) + total) % total;
        setAnnonceImageIndexes((prev) => ({ ...prev, [annonceId]: normalized }));
    };

    const prevAnnonceImage = (annonceId: string, total: number) => {
        if (total <= 1) return;
        const currentIndex = annonceImageIndexes[annonceId] ?? 0;
        goToAnnonceImage(annonceId, currentIndex - 1, total);
    };

    const nextAnnonceImage = (annonceId: string, total: number) => {
        if (total <= 1) return;
        const currentIndex = annonceImageIndexes[annonceId] ?? 0;
        goToAnnonceImage(annonceId, currentIndex + 1, total);
    };

    const handleApprove = async (id: string) => {
        setActionSubmitting(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/annonces/admin/${id}/approve`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            if (!response.ok) { setError(data.message || 'Erreur.'); setActionSubmitting(false); return; }
            flash('Annonce approuvée.');
            await fetchAnnonces();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setActionSubmitting(false);
        }
    };

    const handleSuspend = async () => {
        if (!suspendingId) return;
        setActionSubmitting(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/annonces/admin/${suspendingId}/suspend`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ adminNote: suspendNote }),
            });
            const data = await response.json();
            if (!response.ok) { setError(data.message || 'Erreur.'); setActionSubmitting(false); return; }
            setSuspendingId(null);
            setSuspendNote('');
            flash('Annonce suspendue.');
            await fetchAnnonces();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setActionSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setActionSubmitting(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/annonces/admin/${deletingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            if (!response.ok) { setError(data.message || 'Erreur.'); setActionSubmitting(false); return; }
            setDeletingId(null);
            flash('Annonce supprimée.');
            await fetchAnnonces();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setActionSubmitting(false);
        }
    };

    const handleApproveUser = async (id: string) => {
        setUserActionLoadingId(id);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/auth/admin/users/${id}/approve`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la validation utilisateur.');
                return;
            }
            flash('Utilisateur approuvé.');
            await fetchUsers();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setUserActionLoadingId(null);
        }
    };

    const handleSuspendUser = async (id: string) => {
        setUserActionLoadingId(id);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/auth/admin/users/${id}/suspend`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la suspension utilisateur.');
                return;
            }
            flash('Utilisateur suspendu.');
            await fetchUsers();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setUserActionLoadingId(null);
        }
    };

    const handleDeleteUser = async (id: string) => {
        setDeletingUser(users.find((currentUser) => currentUser._id === id) || null);
    };

    const openEditUser = (targetUser: AdminUser) => {
        setEditingUser(targetUser);
        setEditUserData({
            nom: targetUser.nom || '',
            prenom: targetUser.prenom || '',
            sexe: targetUser.sexe || '',
            adresse: targetUser.adresse || '',
            ville: targetUser.ville || '',
            telephone: targetUser.telephone || '',
            email: targetUser.email || '',
            userType: targetUser.userType || 'utilisateur',
            moderationStatus: targetUser.moderationStatus || 'pending',
            cni: targetUser.cni || targetUser.cnie || '',
            profilePhoto: targetUser.profilePhoto || '',
        });
        setError('');
    };

    const handleEditUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditUserData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditUserImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!validateImageFile(file)) {
            setError('Veuillez selectionner un fichier image valide (png, jpg, jpeg, gif) de moins de 5MB.');
            return;
        }

        setIsProcessingUserImage(true);
        try {
            const resized = await resizeImage(file, 400, 400, 0.85);
            setEditUserData((prev) => ({ ...prev, profilePhoto: resized }));
        } catch {
            setError('Erreur lors du traitement de la photo.');
        } finally {
            setIsProcessingUserImage(false);
        }
    };

    const submitEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        setUserActionLoadingId(editingUser._id);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/auth/admin/users/${editingUser._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    nom: editUserData.nom,
                    prenom: editUserData.prenom,
                    sexe: editUserData.sexe,
                    adresse: editUserData.adresse,
                    ville: editUserData.ville,
                    telephone: editUserData.telephone,
                    email: editUserData.email,
                    userType: editUserData.userType,
                    moderationStatus: editUserData.moderationStatus,
                    cni: editUserData.userType === 'artisan' ? editUserData.cni : undefined,
                    profilePhoto: editUserData.profilePhoto,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la mise a jour utilisateur.');
                return;
            }

            setEditingUser(null);
            flash('Utilisateur mis a jour.');
            await fetchUsers();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setUserActionLoadingId(null);
        }
    };

    const openResetPasswordModal = (targetUser: AdminUser) => {
        setPasswordResetTarget(targetUser);
        setPasswordResetData({ newPassword: '', confirmPassword: '' });
        setError('');
    };

    const closeResetPasswordModal = () => {
        if (passwordResetSubmitting) return;
        setPasswordResetTarget(null);
        setPasswordResetData({ newPassword: '', confirmPassword: '' });
    };

    const submitResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordResetTarget) return;

        const { newPassword, confirmPassword } = passwordResetData;
        if (newPassword.length < 6) {
            setError('Le nouveau mot de passe doit contenir au moins 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('La confirmation du mot de passe ne correspond pas.');
            return;
        }

        setPasswordResetSubmitting(true);
        setUserActionLoadingId(passwordResetTarget._id);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/auth/admin/users/${passwordResetTarget._id}/reset-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ newPassword }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la reinitialisation du mot de passe.');
                return;
            }

            flash('Mot de passe reinitialise avec succes.');
            setPasswordResetTarget(null);
            setPasswordResetData({ newPassword: '', confirmPassword: '' });
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setPasswordResetSubmitting(false);
            setUserActionLoadingId(null);
        }
    };

    const getProfileDisplayName = (profile?: ReviewProfile) => {
        if (!profile) return 'Utilisateur inconnu';
        const fullName = `${profile.prenom || ''} ${profile.nom || ''}`.trim();
        return fullName || profile.name || 'Utilisateur';
    };

    const jumpToReviewPage = () => {
        const parsed = Number(reviewPageJump);
        if (!Number.isInteger(parsed)) {
            setError('Numero de page invalide.');
            return;
        }

        const maxPage = Math.max(1, reviewPagination.totalPages || 1);
        const targetPage = Math.min(Math.max(parsed, 1), maxPage);
        setError('');
        setReviewPage(targetPage);
    };

    const openEditReview = (review: AdminReviewItem) => {
        setEditingReviewId(review._id);
        setReviewEditData({
            rating: review.rating,
            comment: review.comment || '',
        });
        setError('');
    };

    const updateReviewStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
        setReviewActionLoadingId(reviewId);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/reviews/admin/${reviewId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ status }),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la moderation de l avis.');
                return;
            }

            flash(status === 'approved' ? 'Avis approuve.' : 'Avis rejete.');
            await fetchReviews();
            await fetchPendingReviewsCount();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setReviewActionLoadingId(null);
        }
    };

    const submitEditReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingReviewId) return;

        setReviewActionLoadingId(editingReviewId);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/reviews/admin/${editingReviewId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    rating: reviewEditData.rating,
                    comment: reviewEditData.comment,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la mise a jour de l avis.');
                return;
            }
            setEditingReviewId(null);
            flash('Avis mis a jour.');
            await fetchReviews();
            await fetchPendingReviewsCount();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setReviewActionLoadingId(null);
        }
    };

    const confirmDeleteReview = async () => {
        if (!deletingReviewId) return;

        setReviewActionLoadingId(deletingReviewId);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/reviews/admin/${deletingReviewId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la suppression de l avis.');
                return;
            }
            setDeletingReviewId(null);
            flash('Avis supprime.');
            await fetchReviews();
            await fetchPendingReviewsCount();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setReviewActionLoadingId(null);
        }
    };

    const confirmDeleteUser = async () => {
        if (!deletingUser) return;

        setUserActionLoadingId(deletingUser._id);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/auth/admin/users/${deletingUser._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la suppression utilisateur.');
                return;
            }
            setDeletingUser(null);
            flash('Utilisateur supprimé.');
            await fetchUsers();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setUserActionLoadingId(null);
        }
    };

    const openEdit = (a: Annonce) => {
        setEditingId(a._id);
        setEditData({
            titre: a.titre,
            description: a.description,
            categories: a.categories || [],
            ville: a.ville,
            prix: a.prix?.toString() || '',
            contact: a.contact || '',
            status: a.status,
            adminNote: a.adminNote || '',
        });
        setEditImages(a.images || []);
        setError('');
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditData((prev) => ({ ...prev, [name]: value }));
    };

    const handleEditCategoryChange = (category: string) => {
        setEditData((prev) => {
            const categories = prev.categories.includes(category)
                ? prev.categories.filter((c) => c !== category)
                : prev.categories.length < 5
                    ? [...prev.categories, category]
                    : prev.categories;
            return { ...prev, categories };
        });
    };

    const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const remainingSlots = MAX_ANNONCE_IMAGES - editImages.length;
        if (remainingSlots <= 0) {
            setError(`Vous avez deja atteint le maximum de ${MAX_ANNONCE_IMAGES} images.`);
            return;
        }

        setIsProcessingImage(true);
        try {
            const filesToProcess = Array.from(files).slice(0, remainingSlots);
            const processedImages: string[] = [];

            for (const file of filesToProcess) {
                if (!validateImageFile(file)) {
                    setError(`Image invalide: ${file.name} (png, jpg, jpeg, gif) - max 5 MB.`);
                    setIsProcessingImage(false);
                    return;
                }
                const resized = await resizeImage(file, 600, 400, 0.8);
                processedImages.push(resized);
            }

            setEditImages((prev) => [...prev, ...processedImages]);
            e.target.value = '';
        } catch {
            setError('Erreur lors du traitement des images.');
        } finally {
            setIsProcessingImage(false);
        }
    };

    const removeEditImage = (index: number) => {
        setEditImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;

        if (editData.categories.length < 1 || editData.categories.length > 5) {
            setError('Veuillez selectionner entre 1 et 5 categories.');
            return;
        }

        if (editImages.length < 1 || editImages.length > MAX_ANNONCE_IMAGES) {
            setError(`Veuillez ajouter entre 1 et ${MAX_ANNONCE_IMAGES} images.`);
            return;
        }

        setEditSubmitting(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/annonces/admin/${editingId}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    titre: editData.titre,
                    description: editData.description,
                    categories: editData.categories,
                    ville: editData.ville,
                    prix: editData.prix ? Number(editData.prix) : undefined,
                    contact: editData.contact,
                    status: editData.status,
                    adminNote: editData.adminNote,
                    images: editImages,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || 'Erreur lors de la mise à jour.');
                setEditSubmitting(false);
                return;
            }

            setEditingId(null);
            flash('Annonce mise à jour par admin.');
            await fetchAnnonces();
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setEditSubmitting(false);
        }
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-5xl mb-4">🚫</div>
                    <h1 className="text-2xl font-bold text-slate-900">Accès refusé</h1>
                    <p className="mt-2 text-slate-500">Vous n'avez pas les droits administrateur.</p>
                    <button onClick={onBack} className="mt-6 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    const FILTER_TABS: { label: string; value: FilterStatus }[] = [
        { label: 'Toutes', value: '' },
        { label: `En attente (${stats.en_attente})`, value: 'en_attente' },
        { label: `Approuvées (${stats.approuvee})`, value: 'approuvee' },
        { label: `Suspendues (${stats.suspendue})`, value: 'suspendue' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 pb-20">
            <div className="mx-auto max-w-6xl px-6">
                <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    Retour
                </button>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Tableau de bord — Administration</h1>
                    <p className="mt-1 text-slate-600">Modérez les annonces des utilisateurs et artisans</p>
                </div>

                <div className="mb-6 flex gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 w-fit">
                    <button
                        type="button"
                        onClick={() => setAdminTab('annonces')}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition ${adminTab === 'annonces' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <span className="inline-flex items-center gap-2">
                            <span>Gestion annonces</span>
                            {stats.en_attente > 0 && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                    {stats.en_attente}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAdminTab('users')}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition ${adminTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <span className="inline-flex items-center gap-2">
                            <span>Gestion utilisateurs</span>
                            {userStats.pending > 0 && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                    {userStats.pending}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAdminTab('reviews')}
                        className={`rounded-full px-5 py-2 text-sm font-semibold transition ${adminTab === 'reviews' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <span className="inline-flex items-center gap-2">
                            <span>Gestion avis</span>
                            {pendingReviewsCount > 0 && (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                    {pendingReviewsCount}
                                </span>
                            )}
                        </span>
                    </button>
                </div>

                {adminTab === 'users' && (
                    <div className="mb-8">
                        <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: 'Total', value: userStats.total, color: 'bg-slate-50 border-slate-200 text-slate-700' },
                                { label: 'En attente', value: userStats.pending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                                { label: 'Approuvés', value: userStats.approved, color: 'bg-green-50 border-green-200 text-green-700' },
                                { label: 'Suspendus', value: userStats.suspended, color: 'bg-red-50 border-red-200 text-red-700' },
                            ].map(s => (
                                <div key={s.label} className={`rounded-2xl border p-5 ${s.color}`}>
                                    <p className="text-sm font-medium opacity-70">{s.label}</p>
                                    <p className="mt-1 text-3xl font-bold">{s.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                            {[
                                { label: 'Tous', value: '' },
                                { label: `En attente (${userStats.pending})`, value: 'pending' },
                                { label: `Approuvés (${userStats.approved})`, value: 'approved' },
                                { label: `Suspendus (${userStats.suspended})`, value: 'suspended' },
                            ].map(tab => (
                                <button
                                    key={tab.value}
                                    onClick={() => setUserFilterStatus(tab.value as UserFilterStatus)}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${userFilterStatus === tab.value
                                        ? 'bg-sky-600 text-white border-sky-600'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            {users.map(u => (
                                <div key={u._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-start gap-3">
                                            <img src={u.profilePhoto || DEFAULT_AVATAR} alt={u.name || 'Photo profil'} className="h-12 w-12 rounded-full object-cover border border-slate-200" />
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {u.prenom || ''} {u.nom || ''} {!u.nom && !u.prenom ? u.name : ''}
                                                </p>
                                                <p className="text-sm text-slate-500">{u.email}</p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    Type: {u.userType} · Statut: {u.moderationStatus} · Créé le {new Date(u.createdAt).toLocaleString('fr-FR', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {u.role !== 'admin' && (
                                                <button
                                                    onClick={() => openEditUser(u)}
                                                    disabled={userActionLoadingId === u._id}
                                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                                >
                                                    Modifier
                                                </button>
                                            )}
                                            {u.role !== 'admin' && (
                                                <button
                                                    onClick={() => openResetPasswordModal(u)}
                                                    disabled={userActionLoadingId === u._id || passwordResetSubmitting}
                                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                                >
                                                    Reinit. MDP
                                                </button>
                                            )}
                                            {u.role !== 'admin' && u.moderationStatus !== 'approved' && (
                                                <button
                                                    onClick={() => handleApproveUser(u._id)}
                                                    disabled={userActionLoadingId === u._id}
                                                    className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                                                >
                                                    Approuver
                                                </button>
                                            )}
                                            {u.role !== 'admin' && u.moderationStatus !== 'suspended' && (
                                                <button
                                                    onClick={() => handleSuspendUser(u._id)}
                                                    disabled={userActionLoadingId === u._id}
                                                    className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                                                >
                                                    Suspendre
                                                </button>
                                            )}
                                            {u.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteUser(u._id)}
                                                    disabled={userActionLoadingId === u._id || Boolean(deletingUser)}
                                                    className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    Supprimer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {users.length === 0 && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                                    Aucun utilisateur trouvé pour ce filtre.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {adminTab === 'reviews' && (
                    <div className="mb-8 space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="min-w-[220px]">
                                    <label className="block text-xs font-semibold text-slate-700">Recherche (auteur/cible)</label>
                                    <input
                                        type="text"
                                        value={reviewSearch}
                                        onChange={(e) => {
                                            setReviewPage(1);
                                            setReviewSearch(e.target.value);
                                        }}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                        placeholder="Nom, prenom..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Type de l'auteur</label>
                                    <select
                                        value={reviewFilterReviewerType}
                                        onChange={(e) => {
                                            setReviewPage(1);
                                            setReviewFilterReviewerType(e.target.value as ReviewUserTypeFilter);
                                        }}
                                        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="">Tous</option>
                                        <option value="utilisateur">Utilisateur</option>
                                        <option value="artisan">Artisan</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Type de la cible</label>
                                    <select
                                        value={reviewFilterRevieweeType}
                                        onChange={(e) => {
                                            setReviewPage(1);
                                            setReviewFilterRevieweeType(e.target.value as ReviewUserTypeFilter);
                                        }}
                                        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="">Tous</option>
                                        <option value="utilisateur">Utilisateur</option>
                                        <option value="artisan">Artisan</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Note</label>
                                    <select
                                        value={reviewFilterRating}
                                        onChange={(e) => {
                                            setReviewPage(1);
                                            setReviewFilterRating(e.target.value);
                                        }}
                                        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="">Toutes</option>
                                        {[5, 4, 3, 2, 1].map((r) => (
                                            <option key={r} value={String(r)}>{r}/5</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Moderation</label>
                                    <select
                                        value={reviewFilterStatus}
                                        onChange={(e) => {
                                            setReviewPage(1);
                                            setReviewFilterStatus(e.target.value as ReviewModerationStatus);
                                        }}
                                        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="">Tous</option>
                                        <option value="pending">En attente</option>
                                        <option value="approved">Approuves</option>
                                        <option value="rejected">Rejetes</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Tri</label>
                                    <select
                                        value={reviewSort}
                                        onChange={(e) => {
                                            setReviewPage(1);
                                            setReviewSort(e.target.value as ReviewSort);
                                        }}
                                        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    >
                                        <option value="latest">Plus recents</option>
                                        <option value="oldest">Plus anciens</option>
                                        <option value="rating_desc">Note: 5 vers 1</option>
                                        <option value="rating_asc">Note: 1 vers 5</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700">Par page</label>
                                    <select
                                        value={String(reviewLimit)}
                                        onChange={(e) => {
                                            setReviewPage(1);
                                            setReviewLimit(Number(e.target.value));
                                        }}
                                        className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                    >
                                        {[5, 10, 20, 50].map((value) => (
                                            <option key={value} value={String(value)}>{value}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={fetchReviews}
                                    className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                                >
                                    Actualiser
                                </button>

                                <button
                                    onClick={() => {
                                        setReviewPage(1);
                                        setReviewFilterReviewerType('');
                                        setReviewFilterRevieweeType('');
                                        setReviewFilterRating('');
                                        setReviewFilterStatus('');
                                        setReviewSearch('');
                                        setReviewSort('latest');
                                        setReviewLimit(10);
                                    }}
                                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Reinitialiser
                                </button>
                            </div>
                        </div>

                        {reviewsLoading ? (
                            <div className="flex items-center justify-center py-24">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
                                Aucun avis trouve pour ce filtre.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reviews.map((review) => (
                                    <div key={review._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                        {editingReviewId === review._id ? (
                                            <form onSubmit={submitEditReview} className="space-y-3">
                                                <h3 className="font-semibold text-slate-900">Modifier l'avis</h3>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700">Note</label>
                                                        <select
                                                            value={reviewEditData.rating}
                                                            onChange={(e) => setReviewEditData((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                                                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                                        >
                                                            {[5, 4, 3, 2, 1].map((value) => (
                                                                <option key={value} value={value}>{value}/5</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700">Commentaire (optionnel)</label>
                                                        <textarea
                                                            value={reviewEditData.comment}
                                                            onChange={(e) => setReviewEditData((prev) => ({ ...prev, comment: e.target.value }))}
                                                            maxLength={500}
                                                            rows={3}
                                                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="submit"
                                                        disabled={reviewActionLoadingId === review._id}
                                                        className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                                                    >
                                                        {reviewActionLoadingId === review._id ? 'Enregistrement...' : 'Enregistrer'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingReviewId(null)}
                                                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        Annuler
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* Header: Names, Status Badge, Star Rating, and Action Buttons */}
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {getProfileDisplayName(review.reviewer)} ({review.reviewerType}) → {getProfileDisplayName(review.reviewee)} ({review.revieweeType})
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {/* Star Badge */}
                                                        <div
                                                            className="inline-flex items-center gap-0.5 rounded-full border border-slate-300/70 bg-slate-100/80 px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                                                            title={`${review.rating}/5`}
                                                            aria-label={`${review.rating} sur 5`}
                                                        >
                                                            {Array.from({ length: 5 }).map((_, index) => {
                                                                const fillRatio = Math.max(0, Math.min(1, review.rating - index));
                                                                return (
                                                                    <span key={index} className="relative inline-flex h-2.5 w-2.5">
                                                                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-slate-300" fill="currentColor" aria-hidden="true">
                                                                            <path d="M12 17.3l-5.877 3.09 1.123-6.545L2.49 9.21l6.573-.955L12 2.3l2.938 5.955 6.573.955-4.756 4.635 1.123 6.545z" />
                                                                        </svg>
                                                                        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillRatio * 100}%` }}>
                                                                            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-amber-500" fill="currentColor" aria-hidden="true">
                                                                                <path d="M12 17.3l-5.877 3.09 1.123-6.545L2.49 9.21l6.573-.955L12 2.3l2.938 5.955 6.573.955-4.756 4.635 1.123 6.545z" />
                                                                            </svg>
                                                                        </span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                        {/* Status Badge */}
                                                        <span
                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${review.status === 'approved'
                                                                ? 'border-green-200 bg-green-50 text-green-700'
                                                                : review.status === 'rejected'
                                                                    ? 'border-red-200 bg-red-50 text-red-700'
                                                                    : 'border-amber-200 bg-amber-50 text-amber-700'
                                                                }`}
                                                        >
                                                            {review.status === 'approved' ? 'Approuve' : review.status === 'rejected' ? 'Rejete' : 'En attente'}
                                                        </span>
                                                    </div>
                                                    {/* Action Buttons */}
                                                    <div className="flex gap-1.5 flex-wrap sm:flex-nowrap sm:ml-auto">
                                                        {review.status !== 'approved' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateReviewStatus(review._id, 'approved')}
                                                                disabled={reviewActionLoadingId === review._id}
                                                                className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                                                            >
                                                                Approuver
                                                            </button>
                                                        )}
                                                        {review.status !== 'rejected' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => updateReviewStatus(review._id, 'rejected')}
                                                                disabled={reviewActionLoadingId === review._id}
                                                                className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50 whitespace-nowrap"
                                                            >
                                                                Rejeter
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditReview(review)}
                                                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
                                                        >
                                                            Modifier
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeletingReviewId(review._id)}
                                                            className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 whitespace-nowrap"
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Comment */}
                                                <div>
                                                    {review.comment ? (
                                                        <p className="text-sm text-slate-600">{review.comment}</p>
                                                    ) : (
                                                        <p className="text-sm italic text-slate-400">Aucun commentaire.</p>
                                                    )}
                                                </div>

                                                {/* Timestamps */}
                                                <p className="text-xs text-slate-400">
                                                    Cree le {new Date(review.createdAt).toLocaleString('fr-FR')} · Mis a jour le {new Date(review.updatedAt).toLocaleString('fr-FR')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                                    <p className="text-xs text-slate-500">
                                        {`Total: ${reviewPagination.total} avis · Page ${reviewPagination.page}/${reviewPagination.totalPages}`}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setReviewPage((prev) => Math.max(1, prev - 1))}
                                            disabled={!reviewPagination.hasPrev || reviewsLoading}
                                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Precedent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReviewPage((prev) => prev + 1)}
                                            disabled={!reviewPagination.hasNext || reviewsLoading}
                                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Suivant
                                        </button>

                                        <div className="mx-1 h-6 w-px bg-slate-200" />

                                        <input
                                            type="number"
                                            min={1}
                                            max={Math.max(1, reviewPagination.totalPages)}
                                            value={reviewPageJump}
                                            onChange={(e) => setReviewPageJump(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    jumpToReviewPage();
                                                }
                                            }}
                                            className="w-20 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                                            aria-label="Aller a la page"
                                        />
                                        <button
                                            type="button"
                                            onClick={jumpToReviewPage}
                                            disabled={reviewsLoading || reviewPagination.totalPages <= 1}
                                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Aller
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Stats */}
                {adminTab === 'annonces' && (
                    <div className="mb-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Total', value: stats.total, color: 'bg-slate-50 border-slate-200 text-slate-700' },
                            { label: 'En attente', value: stats.en_attente, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                            { label: 'Approuvées', value: stats.approuvee, color: 'bg-green-50 border-green-200 text-green-700' },
                            { label: 'Suspendues', value: stats.suspendue, color: 'bg-red-50 border-red-200 text-red-700' },
                        ].map(s => (
                            <div key={s.label} className={`rounded-2xl border p-5 ${s.color}`}>
                                <p className="text-sm font-medium opacity-70">{s.label}</p>
                                <p className="mt-1 text-3xl font-bold">{s.value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
                {successMessage && <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">{successMessage}</div>}

                {/* Filter tabs */}
                {adminTab === 'annonces' && (
                    <div className="mb-6 flex flex-wrap gap-2">
                        {FILTER_TABS.map(tab => (
                            <button
                                key={tab.value}
                                onClick={() => setFilterStatus(tab.value)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${filterStatus === tab.value
                                    ? 'bg-sky-600 text-white border-sky-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {adminTab === 'annonces' && (loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
                    </div>
                ) : annonces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                        <div className="text-5xl mb-4">📋</div>
                        <p className="text-lg font-semibold text-slate-700">Aucune annonce correspondante</p>
                    </div>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {annonces.map(a => {
                            const annonceImages = a.images || [];
                            const totalImages = annonceImages.length;
                            const activeImageIndex = Math.min(annonceImageIndexes[a._id] ?? 0, Math.max(totalImages - 1, 0));

                            return (
                                <div key={a._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    {/* Edit inline form */}
                                    {editingId === a._id ? (
                                        <form onSubmit={handleEditSubmit} className="space-y-4">
                                            <h3 className="font-bold text-slate-900">Modifier l'annonce (admin)</h3>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-900">Titre</label>
                                                <input
                                                    type="text"
                                                    name="titre"
                                                    value={editData.titre}
                                                    onChange={handleEditChange}
                                                    required
                                                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-900">Categories <span className="font-normal text-slate-400">- min 1, max 5</span></label>
                                                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                        {CATEGORIES.map((c) => (
                                                            <label key={c} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 cursor-pointer hover:bg-sky-50 transition">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editData.categories.includes(c)}
                                                                    onChange={() => handleEditCategoryChange(c)}
                                                                    disabled={!editData.categories.includes(c) && editData.categories.length >= 5}
                                                                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                                                                />
                                                                <span className="text-xs text-slate-700">{c}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        {editData.categories.length} categorie{editData.categories.length !== 1 ? 's' : ''} selectionnee{editData.categories.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-900">Ville</label>
                                                    <select
                                                        name="ville"
                                                        value={editData.ville}
                                                        onChange={handleEditChange}
                                                        required
                                                        className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    >
                                                        <option value="">Sélectionner</option>
                                                        {MOROCCO_CITIES.map((city) => (
                                                            <option key={city} value={city}>{city}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-900">Description</label>
                                                <textarea
                                                    name="description"
                                                    value={editData.description}
                                                    onChange={handleEditChange}
                                                    required
                                                    rows={3}
                                                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-900">Prix MAD</label>
                                                    <input
                                                        type="number"
                                                        name="prix"
                                                        value={editData.prix}
                                                        onChange={handleEditChange}
                                                        min="0"
                                                        className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-900">Contact</label>
                                                    <input
                                                        type="text"
                                                        name="contact"
                                                        value={editData.contact}
                                                        onChange={handleEditChange}
                                                        className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-900">Statut</label>
                                                    <select
                                                        name="status"
                                                        value={editData.status}
                                                        onChange={handleEditChange}
                                                        className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    >
                                                        <option value="en_attente">En attente</option>
                                                        <option value="approuvee">Approuvée</option>
                                                        <option value="suspendue">Suspendue</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-900">Note admin</label>
                                                    <input
                                                        type="text"
                                                        name="adminNote"
                                                        value={editData.adminNote}
                                                        onChange={handleEditChange}
                                                        className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-900">Photos <span className="font-normal text-slate-400">- min 1, max {MAX_ANNONCE_IMAGES}</span></label>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/png,image/jpeg,image/jpg,image/gif"
                                                    onChange={handleEditImageChange}
                                                    disabled={isProcessingImage || editImages.length >= MAX_ANNONCE_IMAGES}
                                                    className="mt-1.5 block w-full text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
                                                />
                                                {isProcessingImage && <div className="mt-2 text-sm text-slate-500">Traitement...</div>}
                                                {editImages.length > 0 && (
                                                    <div className="mt-3">
                                                        <p className="text-xs text-slate-500 mb-2">{editImages.length} image{editImages.length !== 1 ? 's' : ''} selectionnee{editImages.length !== 1 ? 's' : ''}</p>
                                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                            {editImages.map((img, idx) => (
                                                                <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200">
                                                                    <img src={img} alt={`Apercu ${idx + 1}`} className="h-24 w-full object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeEditImage(idx)}
                                                                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition"
                                                                    >
                                                                        x
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    type="submit"
                                                    disabled={editSubmitting}
                                                    className="flex-1 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                                                >
                                                    {editSubmitting ? 'Sauvegarde…' : 'Enregistrer'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(null)}
                                                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    Annuler
                                                </button>
                                            </div>
                                        </form>
                                    ) : suspendingId === a._id ? (
                                        <div className="space-y-3">
                                            <h3 className="font-bold text-slate-900">Suspendre : {a.titre}</h3>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-900">Motif de suspension <span className="font-normal text-slate-400">– facultatif</span></label>
                                                <input
                                                    type="text"
                                                    value={suspendNote}
                                                    onChange={e => setSuspendNote(e.target.value)}
                                                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    placeholder="Ex : Contenu inapproprié, informations incomplètes…"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleSuspend} disabled={actionSubmitting} className="flex-1 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">
                                                    {actionSubmitting ? 'En cours…' : 'Confirmer la suspension'}
                                                </button>
                                                <button onClick={() => { setSuspendingId(null); setSuspendNote(''); }} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                                    Annuler
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {totalImages > 0 ? (
                                                <div>
                                                    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                                        <span className={`absolute left-3 top-3 z-10 rounded-full border border-white/70 bg-white/90 px-2.5 py-0.5 text-xs font-semibold shadow-sm backdrop-blur ${STATUS_CONFIG[a.status].cls}`}>
                                                            {STATUS_CONFIG[a.status].label}
                                                        </span>
                                                        <img
                                                            src={annonceImages[activeImageIndex]}
                                                            alt={`${a.titre} image ${activeImageIndex + 1}`}
                                                            className="h-52 w-full object-cover"
                                                        />
                                                        {totalImages > 1 && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => prevAnnonceImage(a._id, totalImages)}
                                                                    className="absolute left-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300/60 bg-slate-700/80 text-slate-100 shadow-md backdrop-blur-sm transition hover:bg-slate-700"
                                                                    aria-label="Image précédente"
                                                                >
                                                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M15 18l-6-6 6-6" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => nextAnnonceImage(a._id, totalImages)}
                                                                    className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300/60 bg-slate-700/80 text-slate-100 shadow-md backdrop-blur-sm transition hover:bg-slate-700"
                                                                    aria-label="Image suivante"
                                                                >
                                                                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M9 18l6-6-6-6" />
                                                                    </svg>
                                                                </button>
                                                                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/25 bg-slate-900/45 px-2 py-1 backdrop-blur-sm">
                                                                    {annonceImages.map((_, idx) => (
                                                                        <button
                                                                            key={`${a._id}-dot-${idx}`}
                                                                            type="button"
                                                                            onClick={() => goToAnnonceImage(a._id, idx, totalImages)}
                                                                            className={`h-1.5 rounded-full transition ${idx === activeImageIndex ? 'w-5 bg-cyan-200' : 'w-1.5 bg-white/60 hover:bg-white/85'}`}
                                                                            aria-label={`Voir image ${idx + 1}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {totalImages > 1 && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {annonceImages.map((img, idx) => (
                                                                <button
                                                                    key={`${a._id}-thumb-${idx}`}
                                                                    type="button"
                                                                    onClick={() => goToAnnonceImage(a._id, idx, totalImages)}
                                                                    className={`overflow-hidden rounded-xl border transition ${idx === activeImageIndex ? 'border-sky-400 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'}`}
                                                                    aria-label={`Miniature image ${idx + 1}`}
                                                                >
                                                                    <img src={img} alt={`${a.titre} miniature ${idx + 1}`} className="h-12 w-16 object-cover" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="relative h-52 w-full rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-4xl">
                                                    <span className={`absolute left-3 top-3 z-10 rounded-full border border-white/70 bg-white/90 px-2.5 py-0.5 text-xs font-semibold shadow-sm backdrop-blur ${STATUS_CONFIG[a.status].cls}`}>
                                                        {STATUS_CONFIG[a.status].label}
                                                    </span>
                                                    🛠
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-bold text-slate-900">{a.titre}</h3>
                                                </div>
                                                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{a.description}</p>
                                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <img
                                                            src={a.auteurPhoto || DEFAULT_AVATAR}
                                                            alt={`Profil ${a.auteurPrenom} ${a.auteurNom}`}
                                                            className="h-8 w-8 rounded-full border border-slate-200 object-cover shrink-0"
                                                        />
                                                        <p className="truncate text-sm font-semibold text-slate-700">
                                                            {a.auteurPrenom} {a.auteurNom}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">📍 {a.ville}</span>
                                                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${a.auteurType === 'artisan' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                                            {a.auteurType === 'artisan' ? '🛠 Artisan' : '👤 Utilisateur'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {(a.categories || []).map((category, idx) => (
                                                        <span key={`${a._id}-${category}-${idx}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">{category}</span>
                                                    ))}
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
                                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                            <line x1="16" y1="2" x2="16" y2="6" />
                                                            <line x1="8" y1="2" x2="8" y2="6" />
                                                            <line x1="3" y1="10" x2="21" y2="10" />
                                                        </svg>
                                                        <span>{formatRelativeTimeFr(a.createdAt)}</span>
                                                    </span>
                                                    {a.contact && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
                                                            <span aria-hidden="true">📞</span>
                                                            <span>{a.contact}</span>
                                                        </span>
                                                    )}
                                                    {a.prix != null && (
                                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
                                                                <circle cx="12" cy="12" r="2.5" />
                                                                <path d="M7 9.5a1.5 1.5 0 01-1.5-1.5" />
                                                                <path d="M17 9.5a1.5 1.5 0 001.5-1.5" />
                                                                <path d="M7 14.5A1.5 1.5 0 015.5 16" />
                                                                <path d="M17 14.5a1.5 1.5 0 001.5 1.5" />
                                                            </svg>
                                                            <span>{a.prix} MAD</span>
                                                        </span>
                                                    )}
                                                </div>
                                                {a.adminNote && a.status === 'suspendue' && (
                                                    <p className="mt-1.5 text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-1.5 border border-orange-100">
                                                        Motif : {a.adminNote}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-wrap gap-2 pt-1">
                                                {a.status !== 'approuvee' && (
                                                    <button onClick={() => handleApprove(a._id)} disabled={actionSubmitting} className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">
                                                        ✓ Approuver
                                                    </button>
                                                )}
                                                {a.status !== 'suspendue' && (
                                                    <button onClick={() => { setSuspendingId(a._id); setSuspendNote(''); }} disabled={actionSubmitting} className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50">
                                                        ⏸ Suspendre
                                                    </button>
                                                )}
                                                <button onClick={() => setDeletingId(a._id)} disabled={actionSubmitting} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
                                                    🗑 Supprimer
                                                </button>
                                                <button onClick={() => openEdit(a)} disabled={actionSubmitting || editSubmitting} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                                                    ✎ Modifier
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Delete confirmation modal */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900">Supprimer l'annonce ?</h3>
                        <p className="mt-2 text-sm text-slate-500">Cette action est définitive et irréversible.</p>
                        <div className="mt-6 flex gap-3">
                            <button onClick={handleDelete} disabled={actionSubmitting} className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
                                {actionSubmitting ? 'Suppression…' : 'Supprimer'}
                            </button>
                            <button onClick={() => setDeletingId(null)} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-slate-900">Modifier l'utilisateur</h3>
                        <form onSubmit={submitEditUser} className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Nom</label>
                                    <input name="nom" value={editUserData.nom} onChange={handleEditUserChange} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Prenom</label>
                                    <input name="prenom" value={editUserData.prenom} onChange={handleEditUserChange} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Sexe</label>
                                    <select name="sexe" value={editUserData.sexe} onChange={handleEditUserChange} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900">
                                        <option value="">Selectionner</option>
                                        <option value="Homme">Homme</option>
                                        <option value="Femme">Femme</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Telephone</label>
                                    <input name="telephone" value={editUserData.telephone} onChange={handleEditUserChange} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900">Adresse</label>
                                <input name="adresse" value={editUserData.adresse} onChange={handleEditUserChange} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Ville</label>
                                    <select name="ville" value={editUserData.ville} onChange={handleEditUserChange} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900">
                                        <option value="">Selectionner</option>
                                        {MOROCCO_CITIES.map((city) => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Email</label>
                                    <input type="email" name="email" value={editUserData.email} onChange={handleEditUserChange} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Type utilisateur</label>
                                    <select name="userType" value={editUserData.userType} onChange={handleEditUserChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900">
                                        <option value="utilisateur">Utilisateur</option>
                                        <option value="artisan">Artisan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Statut moderation</label>
                                    <select name="moderationStatus" value={editUserData.moderationStatus} onChange={handleEditUserChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900">
                                        <option value="pending">En attente</option>
                                        <option value="approved">Approuve</option>
                                        <option value="suspended">Suspendu</option>
                                    </select>
                                </div>
                            </div>

                            {editUserData.userType === 'artisan' && (
                                <div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-900">CNI</label>
                                        <input name="cni" value={editUserData.cni} onChange={handleEditUserChange} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-900">Photo de profil</label>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/gif"
                                    onChange={handleEditUserImageChange}
                                    disabled={isProcessingUserImage}
                                    className="mt-1.5 block w-full text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
                                />
                                {isProcessingUserImage && <p className="mt-2 text-xs text-slate-500">Traitement de l'image...</p>}
                                {editUserData.profilePhoto && (
                                    <img src={editUserData.profilePhoto} alt="Apercu profil" className="mt-3 h-16 w-16 rounded-full object-cover border border-slate-200" />
                                )}
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={userActionLoadingId === editingUser._id}
                                    className="flex-1 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                                >
                                    {userActionLoadingId === editingUser._id ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    disabled={userActionLoadingId === editingUser._id}
                                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deletingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900">Supprimer l'utilisateur ?</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            {`Vous allez supprimer ${deletingUser.prenom || deletingUser.nom ? `${deletingUser.prenom || ''} ${deletingUser.nom || ''}`.trim() : deletingUser.name || deletingUser.email}. Cette action est définitive et irréversible.`}
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={confirmDeleteUser}
                                disabled={userActionLoadingId === deletingUser._id}
                                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                            >
                                {userActionLoadingId === deletingUser._id ? 'Suppression…' : 'Supprimer'}
                            </button>
                            <button
                                onClick={() => setDeletingUser(null)}
                                disabled={userActionLoadingId === deletingUser._id}
                                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deletingReviewId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900">Supprimer l'avis ?</h3>
                        <p className="mt-2 text-sm text-slate-500">Cette action est definitive et irreversible.</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={confirmDeleteReview}
                                disabled={reviewActionLoadingId === deletingReviewId}
                                className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                            >
                                {reviewActionLoadingId === deletingReviewId ? 'Suppression...' : 'Supprimer'}
                            </button>
                            <button
                                onClick={() => setDeletingReviewId(null)}
                                disabled={reviewActionLoadingId === deletingReviewId}
                                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {passwordResetTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900">Reinitialiser le mot de passe</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            {`Utilisateur: ${passwordResetTarget.prenom || ''} ${passwordResetTarget.nom || ''}`.trim() || passwordResetTarget.email}
                        </p>
                        <form onSubmit={submitResetPassword} className="mt-4 space-y-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    value={passwordResetData.newPassword}
                                    onChange={(e) => setPasswordResetData((prev) => ({ ...prev, newPassword: e.target.value }))}
                                    minLength={6}
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-900">Confirmer le mot de passe</label>
                                <input
                                    type="password"
                                    value={passwordResetData.confirmPassword}
                                    onChange={(e) => setPasswordResetData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                    minLength={6}
                                    required
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                                />
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={passwordResetSubmitting}
                                    className="flex-1 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                                >
                                    {passwordResetSubmitting ? 'En cours...' : 'Confirmer'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeResetPasswordModal}
                                    disabled={passwordResetSubmitting}
                                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

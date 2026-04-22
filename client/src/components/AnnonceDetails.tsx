import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/useAuth';
import DEFAULT_AVATAR from '../utils/defaultAvatar';
import ReviewMiniBadge from './ReviewMiniBadge';

interface Annonce {
    _id: string;
    titre: string;
    description: string;
    categories: string[];
    ville: string;
    prix?: number;
    contact?: string;
    auteur: string;
    auteurNom: string;
    auteurPrenom: string;
    auteurType: 'utilisateur' | 'artisan';
    auteurPhoto?: string;
    images?: string[];
    createdAt: string;
}

interface ReviewAuthor {
    _id: string;
    nom?: string;
    prenom?: string;
    name?: string;
    profilePhoto?: string;
}

interface ReviewItem {
    _id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    updatedAt?: string;
    reviewer: ReviewAuthor;
}

interface UserReviewResponse {
    stats: {
        total: number;
        averageRating: number;
        annonceTotal?: number;
    };
    reviews: ReviewItem[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

interface MyAnnonceReview {
    _id: string;
    rating: number;
    comment?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    updatedAt?: string;
}

const REVIEWS_PAGE_SIZE = 10;

const StarScore = ({ value }: { value: number }) => {
    const normalized = Math.max(0, Math.min(5, value));

    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => {
                const fillRatio = Math.max(0, Math.min(1, normalized - index));
                return (
                    <span key={index} className="relative inline-flex h-5 w-5">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-300" fill="currentColor" aria-hidden="true">
                            <path d="M12 17.3l-5.877 3.09 1.123-6.545L2.49 9.21l6.573-.955L12 2.3l2.938 5.955 6.573.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillRatio * 100}%` }}>
                            <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-500" fill="currentColor" aria-hidden="true">
                                <path d="M12 17.3l-5.877 3.09 1.123-6.545L2.49 9.21l6.573-.955L12 2.3l2.938 5.955 6.573.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                        </span>
                    </span>
                );
            })}
        </div>
    );
};

const capitalizeFirst = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return '';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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

export default function AnnonceDetails({ annonceId, onBack, onOpenAnnonce, onOpenUser }: { annonceId: string; onBack: () => void; onOpenAnnonce?: (annonceId: string) => void; onOpenUser?: (userId: string) => void }) {
    const { user } = useAuth();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const [annonce, setAnnonce] = useState<Annonce | null>(null);
    const [reviews, setReviews] = useState<UserReviewResponse | null>(null);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewRating, setReviewRating] = useState(5);
    const [hoveredReviewRating, setHoveredReviewRating] = useState<number | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewDeleting, setReviewDeleting] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [reviewSuccess, setReviewSuccess] = useState('');
    const [myReview, setMyReview] = useState<MyAnnonceReview | null>(null);
    const [showEditReviewModal, setShowEditReviewModal] = useState(false);
    const [showDeleteReviewModal, setShowDeleteReviewModal] = useState(false);
    const [showContactAlert, setShowContactAlert] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isCarouselPaused, setIsCarouselPaused] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [relatedAnnonces, setRelatedAnnonces] = useState<Annonce[]>([]);
    const [relatedLoading, setRelatedLoading] = useState(false);
    const [relatedImageIndices, setRelatedImageIndices] = useState<Record<string, number>>({});

    const auteurDisplayName = annonce?.auteurPrenom?.trim() || annonce?.auteurNom?.trim() || 'Utilisateur';
    const auteurDisplayNameCapitalized = capitalizeFirst(auteurDisplayName);
    const annonceCreatedRelative = annonce ? formatRelativeTimeFr(annonce.createdAt) : '';
    const annonceImages = annonce?.images || [];

    const canManageReview = useMemo(() => {
        if (!annonce || !user) return false;
        if (user.id === annonce.auteur) return false;
        if (user.role === 'admin') return true;
        if (user.moderationStatus !== 'approved') return false;
        return user.userType !== annonce.auteurType;
    }, [annonce, user]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [annonceId]);

    useEffect(() => {
        setActiveImageIndex(0);
    }, [annonce?._id]);

    useEffect(() => {
        if (!annonce?._id || !annonce?.auteur) return;

        const loadRelatedAnnonces = async () => {
            setRelatedLoading(true);
            try {
                const response = await fetch(`${apiUrl}/api/annonces`);
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                const allAnnonces = (data.annonces || []) as Annonce[];

                const latestAnnonces = allAnnonces
                    .filter((a) => a._id !== annonce._id)
                    .slice(0, 24);
                setRelatedAnnonces(latestAnnonces);
            } catch {
                setRelatedAnnonces([]);
            } finally {
                setRelatedLoading(false);
            }
        };

        loadRelatedAnnonces();
    }, [annonce?._id, annonce?.auteur, apiUrl]);

    useEffect(() => {
        if (activeImageIndex >= annonceImages.length) {
            setActiveImageIndex(0);
        }
    }, [activeImageIndex, annonceImages.length]);

    useEffect(() => {
        if (!myReview) return;
        setReviewRating(myReview.rating);
        setReviewComment(myReview.comment || '');
    }, [myReview]);

    const goToPreviousImage = () => {
        if (annonceImages.length < 2) return;
        setActiveImageIndex((prev) => (prev === 0 ? annonceImages.length - 1 : prev - 1));
    };

    const goToNextImage = () => {
        if (annonceImages.length < 2) return;
        setActiveImageIndex((prev) => (prev === annonceImages.length - 1 ? 0 : prev + 1));
    };

    const getRelatedImageIndex = (id: string) => relatedImageIndices[id] ?? 0;

    const prevRelatedImage = (e: React.MouseEvent, id: string, total: number) => {
        e.stopPropagation();
        setRelatedImageIndices((prev) => ({ ...prev, [id]: (getRelatedImageIndex(id) - 1 + total) % total }));
    };

    const nextRelatedImage = (e: React.MouseEvent, id: string, total: number) => {
        e.stopPropagation();
        setRelatedImageIndices((prev) => ({ ...prev, [id]: (getRelatedImageIndex(id) + 1) % total }));
    };

    useEffect(() => {
        if (annonceImages.length < 2 || isCarouselPaused) return;

        const intervalId = window.setInterval(() => {
            setActiveImageIndex((prev) => (prev === annonceImages.length - 1 ? 0 : prev + 1));
        }, 3500);

        return () => window.clearInterval(intervalId);
    }, [annonceImages.length, isCarouselPaused]);

    const loadMyReview = useCallback(async (targetAnnonceId: string) => {
        if (!user) {
            setMyReview(null);
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/reviews/annonce/${targetAnnonceId}/mine`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (!response.ok) {
                setMyReview(null);
                return;
            }

            const data = (await response.json()) as { review?: MyAnnonceReview | null };
            setMyReview(data.review || null);
        } catch {
            setMyReview(null);
        }
    }, [apiUrl, user]);

    const loadReviews = useCallback(async (revieweeId: string, targetAnnonceId: string, page = 1) => {
        setReviewsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(REVIEWS_PAGE_SIZE),
                annonceId: targetAnnonceId,
            });
            const reviewsResponse = await fetch(`${apiUrl}/api/reviews/user/${revieweeId}?${params.toString()}`);
            if (!reviewsResponse.ok) {
                throw new Error('Reviews not found');
            }
            const reviewsData = (await reviewsResponse.json()) as UserReviewResponse;
            setReviews(reviewsData);
            setReviewsPage(reviewsData.pagination?.page || page);
        } catch {
            setReviews({
                stats: { total: 0, averageRating: 0 },
                reviews: [],
                pagination: {
                    page: 1,
                    limit: REVIEWS_PAGE_SIZE,
                    total: 0,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false,
                },
            });
        } finally {
            setReviewsLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => {
        const loadDetails = async () => {
            setLoading(true);
            setError('');
            try {
                const annonceResponse = await fetch(`${apiUrl}/api/annonces/${annonceId}`);
                if (!annonceResponse.ok) {
                    throw new Error('Annonce introuvable');
                }

                const annonceData = await annonceResponse.json();
                const fetchedAnnonce = annonceData.annonce as Annonce;
                setAnnonce(fetchedAnnonce);
                await loadReviews(fetchedAnnonce.auteur, fetchedAnnonce._id, 1);
                await loadMyReview(fetchedAnnonce._id);
            } catch {
                setError('Impossible de charger la page de cette annonce.');
            } finally {
                setLoading(false);
            }
        };

        loadDetails();
    }, [annonceId, apiUrl, loadReviews, loadMyReview]);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!annonce) return;

        setReviewSubmitting(true);
        setReviewError('');
        setReviewSuccess('');
        try {
            const isEditingReview = Boolean(myReview);
            const endpoint = isEditingReview
                ? `${apiUrl}/api/reviews/annonce/${annonce._id}/mine`
                : `${apiUrl}/api/reviews`;

            const payload = isEditingReview
                ? { rating: reviewRating, comment: reviewComment }
                : {
                    annonceId: annonce._id,
                    revieweeId: annonce.auteur,
                    rating: reviewRating,
                    comment: reviewComment,
                };

            const response = await fetch(endpoint, {
                method: isEditingReview ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                setReviewError(data.message || 'Erreur lors de l enregistrement de l avis.');
                return;
            }

            setReviewSuccess(data.message || 'Avis enregistre.');
            setHoveredReviewRating(null);
            await loadReviews(annonce.auteur, annonce._id, reviewsPage);
            await loadMyReview(annonce._id);

            if (isEditingReview) {
                setShowEditReviewModal(false);
            } else {
                setReviewComment('');
                setReviewRating(5);
            }
        } catch {
            setReviewError('Impossible de joindre le serveur.');
        } finally {
            setReviewSubmitting(false);
        }
    };

    const handleDeleteMyReview = async () => {
        if (!annonce || !myReview) return;

        setReviewDeleting(true);
        setReviewError('');
        setReviewSuccess('');

        try {
            const response = await fetch(`${apiUrl}/api/reviews/annonce/${annonce._id}/mine`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            const data = await response.json();
            if (!response.ok) {
                setReviewError(data.message || 'Erreur lors de la suppression de l avis.');
                return;
            }

            setReviewSuccess(data.message || 'Avis supprime avec succes.');
            setMyReview(null);
            setReviewComment('');
            setReviewRating(5);
            setHoveredReviewRating(null);
            setShowEditReviewModal(false);
            setShowDeleteReviewModal(false);
            await loadReviews(annonce.auteur, annonce._id, reviewsPage);
        } catch {
            setReviewError('Impossible de joindre le serveur.');
        } finally {
            setReviewDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 pb-20">
                <div className="mx-auto max-w-7xl px-6">
                    <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Retour
                    </button>
                    <div className="flex items-center justify-center py-24">
                        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-sky-600"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !annonce) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 pb-20">
                <div className="mx-auto max-w-7xl px-6">
                    <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                        Retour
                    </button>
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                        {error || 'Annonce introuvable'}
                    </div>
                </div>
            </div>
        );
    }

    const otherReviews = [...(reviews?.reviews || [])]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .filter((review) => review._id !== myReview?._id);
    const myReviewPrenom = capitalizeFirst(user?.prenom?.trim() || user?.name || 'Vous');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 pb-20">
            <div className="mx-auto max-w-7xl px-6">
                <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    Retour
                </button>

                <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white/85 px-5 py-4 shadow-sm backdrop-blur-sm">
                    <h1 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl line-clamp-2">
                        {annonce.titre}
                    </h1>
                    <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-teal-400" />
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        {annonceImages.length > 0 ? (
                            <div className="mb-5">
                                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                    <img
                                        src={annonceImages[activeImageIndex]}
                                        alt={`${annonce.titre} ${activeImageIndex + 1}`}
                                        className="h-96 w-full object-cover"
                                        onMouseEnter={() => setIsCarouselPaused(true)}
                                        onMouseLeave={() => setIsCarouselPaused(false)}
                                    />

                                    {annonceImages.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={goToPreviousImage}
                                                onMouseEnter={() => setIsCarouselPaused(true)}
                                                onMouseLeave={() => setIsCarouselPaused(false)}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/25 text-white shadow-[0_8px_24px_rgba(15,23,42,0.35)] backdrop-blur-md transition hover:scale-105 hover:bg-white/35"
                                                aria-label="Image precedente"
                                            >
                                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M15 18l-6-6 6-6" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={goToNextImage}
                                                onMouseEnter={() => setIsCarouselPaused(true)}
                                                onMouseLeave={() => setIsCarouselPaused(false)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/25 text-white shadow-[0_8px_24px_rgba(15,23,42,0.35)] backdrop-blur-md transition hover:scale-105 hover:bg-white/35"
                                                aria-label="Image suivante"
                                            >
                                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M9 18l6-6-6-6" />
                                                </svg>
                                            </button>
                                            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                                                {activeImageIndex + 1}/{annonceImages.length}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {annonceImages.length > 1 && (
                                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                                        {annonceImages.map((img, index) => (
                                            <button
                                                key={`${annonce._id}-img-${index}`}
                                                type="button"
                                                onClick={() => setActiveImageIndex(index)}
                                                onMouseEnter={() => setIsCarouselPaused(true)}
                                                onMouseLeave={() => setIsCarouselPaused(false)}
                                                className={`overflow-hidden rounded-xl border transition ${index === activeImageIndex ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'}`}
                                                aria-label={`Afficher image ${index + 1}`}
                                            >
                                                <img src={img} alt={`${annonce.titre} miniature ${index + 1}`} className="h-16 w-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mb-5 flex h-56 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 text-6xl opacity-70">🛠</div>
                        )}

                        <div className="mt-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${annonce.auteurType === 'artisan' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                    <span aria-hidden="true">{annonce.auteurType === 'artisan' ? '🛠' : '👤'}</span>
                                    <span>{annonce.auteurType === 'artisan' ? 'Artisan' : 'Utilisateur'}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                    <span aria-hidden="true">📍</span>
                                    {annonce.ville}
                                </span>
                                {annonce.prix != null && (
                                    <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <rect x="3" y="6" width="18" height="12" rx="2" ry="2" />
                                            <circle cx="12" cy="12" r="2.5" />
                                            <path d="M7 9.5a1.5 1.5 0 01-1.5-1.5" />
                                            <path d="M17 9.5a1.5 1.5 0 001.5-1.5" />
                                            <path d="M7 14.5A1.5 1.5 0 015.5 16" />
                                            <path d="M17 14.5a1.5 1.5 0 001.5 1.5" />
                                        </svg>
                                        <span>{annonce.prix} MAD</span>
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                {[...(annonce.categories || [])]
                                    .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
                                    .map((category) => (
                                        <span key={`${annonce._id}-${category}`} className="rounded-full bg-slate-200 px-2 py-0.5">{category}</span>
                                    ))}
                            </div>
                        </div>

                        <div className="mt-5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Description</p>
                            <p className="whitespace-pre-line text-slate-700">{annonce.description}</p>
                        </div>

                        <div className="mt-6 border-t border-slate-100 pt-4">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div className="flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={() => onOpenUser && onOpenUser(annonce.auteur)}
                                        className="flex items-center gap-2 rounded-lg px-2 py-1 -ml-2 text-left transition cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                                        aria-label={`Voir le profil de ${auteurDisplayNameCapitalized}`}
                                    >
                                        <img
                                            src={annonce.auteurPhoto || DEFAULT_AVATAR}
                                            alt={auteurDisplayNameCapitalized}
                                            className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-200"
                                        />
                                        <p className="text-sm font-semibold text-slate-800">{auteurDisplayNameCapitalized}</p>
                                        <ReviewMiniBadge averageRating={reviews?.stats.averageRating || 0} />
                                    </button>
                                    <p className="inline-flex items-center gap-1 text-sm text-slate-500">
                                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        <span>{annonceCreatedRelative}</span>
                                    </p>
                                </div>

                                {annonce.contact && (
                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`https://wa.me/${annonce.contact.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                            aria-label="Contacter sur WhatsApp"
                                        >
                                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                                                <path d="M20.52 3.48A11.85 11.85 0 0012.08 0C5.54 0 .2 5.34.2 11.88c0 2.1.55 4.15 1.58 5.96L0 24l6.35-1.67a11.84 11.84 0 005.73 1.47h.01c6.54 0 11.88-5.34 11.88-11.88 0-3.17-1.24-6.15-3.45-8.44zM12.09 21.8h-.01a9.9 9.9 0 01-5.05-1.39l-.36-.22-3.77.99 1-3.67-.24-.38A9.88 9.88 0 012.2 11.88C2.2 6.45 6.65 2 12.08 2a9.82 9.82 0 017 2.9 9.83 9.83 0 012.88 6.98c0 5.43-4.44 9.92-9.87 9.92zm5.44-7.39c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.95 1.18-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.8.38-.27.3-1.05 1.03-1.05 2.5 0 1.48 1.08 2.9 1.23 3.1.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.57-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.07-.13-.27-.2-.57-.35z" />
                                            </svg>
                                            WhatsApp
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setShowContactAlert(true)}
                                            className="inline-flex items-center rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                                        >
                                            📞 Contacter
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </article>

                    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] lg:flex-col">
                        <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3 lg:sticky lg:top-0 lg:z-10 lg:flex-none">
                            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Avis sur cette annonce</p>
                            <div className="mt-1.5 flex items-center gap-2">
                                <StarScore value={reviews?.stats.averageRating || 0} />
                                <span className="text-2xl font-bold text-slate-900">{(reviews?.stats.averageRating || 0).toFixed(1)}</span>
                                <span className="text-sm text-slate-400">/ 5</span>
                                <span className="ml-auto text-xs text-slate-500">{reviews?.stats.annonceTotal ?? 0} avis</span>
                            </div>
                        </div>

                        <div className="mt-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                            {reviewError && (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                                    {reviewError}
                                </div>
                            )}
                            {reviewSuccess && (
                                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-2 text-xs text-green-700">
                                    {reviewSuccess}
                                </div>
                            )}

                            {canManageReview && !myReview && (
                                <form onSubmit={handleSubmitReview} className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-sm font-semibold text-slate-700">Laisser un avis</p>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700">Note</label>
                                        <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHoveredReviewRating(null)}>
                                            {[1, 2, 3, 4, 5].map((value) => {
                                                const active = value <= (hoveredReviewRating ?? reviewRating);
                                                return (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onMouseEnter={() => setHoveredReviewRating(value)}
                                                        onFocus={() => setHoveredReviewRating(value)}
                                                        onBlur={() => setHoveredReviewRating(null)}
                                                        onClick={() => setReviewRating(value)}
                                                        className="rounded p-0.5"
                                                        aria-label={`Noter ${value} sur 5`}
                                                    >
                                                        <svg viewBox="0 0 24 24" className={`h-6 w-6 transition ${active ? 'text-amber-500' : 'text-slate-300'}`} fill="currentColor" aria-hidden="true">
                                                            <path d="M12 17.3l-5.877 3.09 1.123-6.545L2.49 9.21l6.573-.955L12 2.3l2.938 5.955 6.573.955-4.756 4.635 1.123 6.545z" />
                                                        </svg>
                                                    </button>
                                                );
                                            })}
                                            <div className="ml-2">
                                                <ReviewMiniBadge averageRating={hoveredReviewRating ?? reviewRating} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700">Commentaire (optionnel)</label>
                                        <textarea
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            maxLength={500}
                                            rows={3}
                                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                                            placeholder="Partagez votre experience..."
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={reviewSubmitting}
                                        className="w-full rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                                    >
                                        {reviewSubmitting ? 'Enregistrement...' : 'Envoyer avis'}
                                    </button>
                                </form>
                            )}

                            <div className="mt-4 space-y-3">
                                {reviewsLoading && (
                                    <div className="flex items-center justify-center py-6">
                                        <div className="h-7 w-7 animate-spin rounded-full border-b-2 border-sky-600"></div>
                                    </div>
                                )}

                                {myReview && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={user?.profilePhoto || DEFAULT_AVATAR}
                                                    alt={myReviewPrenom}
                                                    className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                                                />
                                                <p className="text-xs font-semibold text-slate-700">{myReviewPrenom}</p>
                                                {myReview.status !== 'approved' && (
                                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${myReview.status === 'rejected'
                                                        ? 'border-red-200 bg-red-50 text-red-700'
                                                        : 'border-amber-200 bg-amber-50 text-amber-700'
                                                        }`}>
                                                        {myReview.status === 'rejected' ? 'Rejete' : 'En cours de validation'}
                                                    </span>
                                                )}
                                            </div>
                                            <ReviewMiniBadge averageRating={myReview.rating} />
                                        </div>
                                        {myReview.comment ? (
                                            <p className="mt-1 text-sm text-slate-600">{myReview.comment}</p>
                                        ) : (
                                            <p className="mt-1 text-sm italic text-slate-400">Aucun commentaire.</p>
                                        )}
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <p className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                    <line x1="16" y1="2" x2="16" y2="6" />
                                                    <line x1="8" y1="2" x2="8" y2="6" />
                                                    <line x1="3" y1="10" x2="21" y2="10" />
                                                </svg>
                                                <span>{new Date(myReview.createdAt).toLocaleDateString('fr-FR')}</span>
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {canManageReview && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReviewError('');
                                                                setReviewSuccess('');
                                                                setHoveredReviewRating(null);
                                                                setShowEditReviewModal(true);
                                                            }}
                                                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
                                                        >
                                                            Modifier avis
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReviewError('');
                                                                setReviewSuccess('');
                                                                setShowDeleteReviewModal(true);
                                                            }}
                                                            disabled={reviewDeleting}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                            aria-label={reviewDeleting ? 'Suppression de l avis en cours' : 'Supprimer avis'}
                                                            title={reviewDeleting ? 'Suppression...' : 'Supprimer avis'}
                                                        >
                                                            {reviewDeleting ? (
                                                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                                                            ) : (
                                                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <path d="M3 6h18" />
                                                                    <path d="M8 6V4h8v2" />
                                                                    <path d="M19 6l-1 14H6L5 6" />
                                                                    <path d="M10 11v6" />
                                                                    <path d="M14 11v6" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {otherReviews.map((review) => {
                                    return (
                                        <div key={review._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={review.reviewer.profilePhoto || DEFAULT_AVATAR}
                                                        alt={capitalizeFirst(review.reviewer.prenom || review.reviewer.name || 'Utilisateur')}
                                                        className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                                                    />
                                                    <p className="text-xs font-semibold text-slate-700">
                                                        {capitalizeFirst(review.reviewer.prenom || review.reviewer.name || 'Utilisateur')}
                                                    </p>
                                                </div>
                                                <ReviewMiniBadge averageRating={review.rating} />
                                            </div>
                                            {review.comment ? (
                                                <p className="mt-1 text-sm text-slate-600">{review.comment}</p>
                                            ) : (
                                                <p className="mt-1 text-sm italic text-slate-400">Aucun commentaire.</p>
                                            )}
                                            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                                                <p className="inline-flex items-center gap-1">
                                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
                                                    </svg>
                                                    <span>{new Date(review.createdAt).toLocaleDateString('fr-FR')}</span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {!reviewsLoading && !myReview && otherReviews.length === 0 && (
                                    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                        Aucun avis pour le moment.
                                    </p>
                                )}
                            </div>

                            {reviews?.pagination && reviews.pagination.totalPages > 1 && (
                                <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <p className="text-[11px] text-slate-500">
                                        Page {reviews.pagination.page}/{reviews.pagination.totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => loadReviews(annonce.auteur, annonce._id, Math.max(1, reviewsPage - 1))}
                                            disabled={!reviews.pagination.hasPrev || reviewsLoading}
                                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Precedent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => loadReviews(annonce.auteur, annonce._id, reviewsPage + 1)}
                                            disabled={!reviews.pagination.hasNext || reviewsLoading}
                                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Suivant
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            {relatedAnnonces.length > 0 && (
                <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">Dernières annonces</h2>
                    </div>
                    {relatedLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {relatedAnnonces.map((a) => (
                                <div
                                    key={a._id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onOpenAnnonce && onOpenAnnonce(a._id)}
                                    onKeyDown={(e) => e.key === 'Enter' && onOpenAnnonce && onOpenAnnonce(a._id)}
                                    className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer"
                                >
                                    {a.images && a.images.length > 0 && (
                                        <div className="group relative h-44 w-full overflow-hidden bg-slate-100 shrink-0">
                                            <img
                                                src={a.images[getRelatedImageIndex(a._id)]}
                                                alt={`${a.titre} ${getRelatedImageIndex(a._id) + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                            {a.images.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={(e) => prevRelatedImage(e, a._id, a.images!.length)}
                                                        className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition opacity-0 group-hover:opacity-100"
                                                        aria-label="Image précédente"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => nextRelatedImage(e, a._id, a.images!.length)}
                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition opacity-0 group-hover:opacity-100"
                                                        aria-label="Image suivante"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                                                        {a.images.map((_, i) => (
                                                            <span
                                                                key={i}
                                                                className={`block h-1.5 rounded-full transition-all ${i === getRelatedImageIndex(a._id) ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex flex-col flex-1 p-4 gap-2">
                                        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                                            {a.titre}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${a.auteurType === 'artisan' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                <span aria-hidden="true">{a.auteurType === 'artisan' ? '🛠' : '👤'}</span>
                                                <span>{a.auteurType === 'artisan' ? 'Artisan' : 'Utilisateur'}</span>
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-slate-500">
                                                <span aria-hidden="true">📍</span>
                                                {a.ville}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                            {(a.categories || []).map((category) => (
                                                <span key={`${a._id}-${category}`} className="rounded-full bg-slate-200 px-2 py-0.5">{category}</span>
                                            ))}
                                        </div>

                                        <div className="mt-auto pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenUser && onOpenUser(a.auteur);
                                                }}
                                                className="flex items-center gap-2 transition rounded-lg px-2 py-1 -ml-2 hover:bg-blue-50 hover:text-blue-700"
                                                aria-label={`Voir le profil de ${capitalizeFirst(a.auteurPrenom || a.auteurNom || 'Utilisateur')}`}
                                            >
                                                <img
                                                    src={a.auteurPhoto || DEFAULT_AVATAR}
                                                    alt={capitalizeFirst(a.auteurPrenom || a.auteurNom || 'Utilisateur')}
                                                    className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                                                />
                                                <span>
                                                    {capitalizeFirst(a.auteurPrenom || a.auteurNom || 'Utilisateur')}
                                                </span>
                                            </button>
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

                                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            <span>{formatRelativeTimeFr(a.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {showContactAlert && annonce.contact && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowContactAlert(false)}>
                    <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowContactAlert(false)}
                                className="text-3xl leading-none text-slate-400 transition hover:text-slate-700"
                                aria-label="Fermer"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl">⚠️</div>

                        <h3 className="font-display text-center text-2xl font-bold text-red-500">Attention !</h3>
                        <p className="mx-auto mt-3 max-w-lg text-center text-base leading-7 text-slate-600">
                            Il ne faut jamais envoyer de l&apos;argent a l&apos;avance au vendeur par virement bancaire ou a travers une agence de transfert d&apos;argent lors de l&apos;achat des biens disponibles sur le site.
                        </p>

                        <p className="font-display mt-8 text-center text-xl font-semibold text-slate-700">Appeler {annonce.titre}</p>

                        <a
                            href={`tel:${annonce.contact}`}
                            className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-2.5 rounded-xl border border-blue-500 px-4 py-3 text-2xl font-semibold text-slate-700 transition hover:bg-blue-50"
                        >
                            📞 {annonce.contact}
                        </a>
                    </div>
                </div>
            )}

            {showEditReviewModal && myReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={() => setShowEditReviewModal(false)}>
                    <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Modifier avis</h3>
                            <button
                                type="button"
                                onClick={() => setShowEditReviewModal(false)}
                                className="text-2xl leading-none text-slate-400 transition hover:text-slate-700"
                                aria-label="Fermer"
                            >
                                ×
                            </button>
                        </div>

                        {reviewError && (
                            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                                {reviewError}
                            </div>
                        )}

                        <form onSubmit={handleSubmitReview} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Note</label>
                                <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHoveredReviewRating(null)}>
                                    {[1, 2, 3, 4, 5].map((value) => {
                                        const active = value <= (hoveredReviewRating ?? reviewRating);
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onMouseEnter={() => setHoveredReviewRating(value)}
                                                onFocus={() => setHoveredReviewRating(value)}
                                                onBlur={() => setHoveredReviewRating(null)}
                                                onClick={() => setReviewRating(value)}
                                                className="rounded p-0.5"
                                                aria-label={`Noter ${value} sur 5`}
                                            >
                                                <svg viewBox="0 0 24 24" className={`h-5 w-5 transition ${active ? 'text-amber-500' : 'text-slate-300'}`} fill="currentColor" aria-hidden="true">
                                                    <path d="M12 17.3l-5.877 3.09 1.123-6.545L2.49 9.21l6.573-.955L12 2.3l2.938 5.955 6.573.955-4.756 4.635 1.123 6.545z" />
                                                </svg>
                                            </button>
                                        );
                                    })}
                                    <div className="ml-2">
                                        <ReviewMiniBadge averageRating={hoveredReviewRating ?? reviewRating} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700">Commentaire (optionnel)</label>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    maxLength={500}
                                    rows={4}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                                    placeholder="Partagez votre experience..."
                                />
                            </div>

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowEditReviewModal(false)}
                                    className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={reviewSubmitting}
                                    className="flex-1 rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
                                >
                                    {reviewSubmitting ? 'Enregistrement...' : 'Modifier avis'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteReviewModal && myReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" onClick={() => !reviewDeleting && setShowDeleteReviewModal(false)}>
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900">Supprimer avis</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Voulez-vous vraiment supprimer votre avis ? Cette action est irreversible.
                        </p>

                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDeleteReviewModal(false)}
                                disabled={reviewDeleting}
                                className="flex-1 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteMyReview}
                                disabled={reviewDeleting}
                                className="flex-1 rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                            >
                                {reviewDeleting ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

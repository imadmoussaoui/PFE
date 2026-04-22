import { useState, useEffect } from 'react';
import DEFAULT_AVATAR from '../utils/defaultAvatar';
import ReviewMiniBadge from './ReviewMiniBadge';

interface PublicUser {
    id: string;
    nom: string;
    prenom: string;
    userType: 'utilisateur' | 'artisan';
    ville: string;
    profilePhoto?: string;
    createdAt: string;
}

interface Annonce {
    _id: string;
    titre: string;
    categories: string[];
    ville: string;
    prix?: number;
    images?: string[];
    createdAt: string;
}

interface ReviewSummary {
    total: number;
    averageRating: number;
}

export default function UserProfile({
    userId,
    onBack,
    onOpenAnnonce,
}: {
    userId: string;
    onBack: () => void;
    onOpenAnnonce?: (annonceId: string) => void;
}) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const [user, setUser] = useState<PublicUser | null>(null);
    const [annonces, setAnnonces] = useState<Annonce[]>([]);
    const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const [userRes, annoncesRes, reviewRes] = await Promise.all([
                    fetch(`${apiUrl}/api/auth/users/${userId}`),
                    fetch(`${apiUrl}/api/annonces?auteur=${userId}`),
                    fetch(`${apiUrl}/api/reviews/summary?userIds=${userId}`),
                ]);

                if (!userRes.ok) {
                    const data = await userRes.json().catch(() => ({}));
                    throw new Error((data as { message?: string }).message || 'Utilisateur introuvable');
                }

                const userData = await userRes.json();
                const annoncesData = await annoncesRes.json().catch(() => ({ annonces: [] }));
                const reviewData = await reviewRes.json().catch(() => ({ summaries: {} }));

                if (!cancelled) {
                    setUser(userData.user as PublicUser);
                    setAnnonces((annoncesData.annonces || []) as Annonce[]);
                    const summaries = (reviewData.summaries || {}) as Record<string, ReviewSummary>;
                    setReviewSummary(summaries[userId] || null);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur lors du chargement.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [apiUrl, userId]);

    const formatRelativeDate = (value: string) => {
        const diffMs = Date.now() - new Date(value).getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);
        if (diffDays < 1) return "aujourd'hui";
        if (diffDays < 30) return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
        if (diffMonths < 12) return `il y a ${diffMonths} mois`;
        return `il y a ${diffYears} an${diffYears > 1 ? 's' : ''}`;
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-20 pb-12 px-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
                {/* Back button */}
                <button
                    onClick={onBack}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                </button>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                ) : error ? (
                    <p className="py-12 text-center text-sm text-red-500">{error}</p>
                ) : user ? (
                    <>
                        {/* Profile card */}
                        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
                            <div className="h-24 bg-gradient-to-r from-sky-400 to-blue-600" />
                            <div className="px-6 pb-6">
                                <div className="-mt-12 flex items-end justify-between">
                                    <img
                                        src={user.profilePhoto || DEFAULT_AVATAR}
                                        alt={`${user.prenom} ${user.nom}`}
                                        className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow"
                                    />
                                    <span className={`mb-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${user.userType === 'artisan' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                        <span aria-hidden="true">{user.userType === 'artisan' ? '🛠' : '👤'}</span>
                                        {user.userType === 'artisan' ? 'Artisan' : 'Utilisateur'}
                                    </span>
                                </div>
                                <h1 className="mt-3 text-xl font-bold text-slate-900">{user.prenom} {user.nom}</h1>
                                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <span aria-hidden="true">📍</span>
                                        {user.ville}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span aria-hidden="true">📅</span>
                                        Membre {formatRelativeDate(user.createdAt)}
                                    </span>
                                    {reviewSummary && reviewSummary.total > 0 && (
                                        <ReviewMiniBadge averageRating={reviewSummary.averageRating} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Annonces */}
                        <h2 className="mb-4 text-lg font-bold text-slate-800">
                            Annonces publiées
                            <span className="ml-2 text-sm font-normal text-slate-400">({annonces.length})</span>
                        </h2>

                        {annonces.length === 0 ? (
                            <p className="text-center py-8 text-sm text-slate-400">Aucune annonce publiée.</p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {annonces.map((annonce) => (
                                    <div
                                        key={annonce._id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onOpenAnnonce && onOpenAnnonce(annonce._id)}
                                        onKeyDown={(e) => e.key === 'Enter' && onOpenAnnonce && onOpenAnnonce(annonce._id)}
                                        className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer"
                                    >
                                        {annonce.images && annonce.images.length > 0 && (
                                            <img
                                                src={annonce.images[0]}
                                                alt={annonce.titre}
                                                className="h-36 w-full object-cover"
                                            />
                                        )}
                                        <div className="p-4 flex flex-col gap-2">
                                            <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">{annonce.titre}</h3>
                                            <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
                                                {(annonce.categories || []).map((cat) => (
                                                    <span key={cat} className="rounded-full bg-slate-100 px-2 py-0.5">{cat}</span>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-2 border-t border-slate-100">
                                                <span className="flex items-center gap-1">
                                                    <span aria-hidden="true">📍</span>
                                                    {annonce.ville}
                                                </span>
                                                {annonce.prix != null && (
                                                    <span className="font-semibold text-sky-700">{annonce.prix} MAD</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}

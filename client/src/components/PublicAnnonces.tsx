import { useState, useEffect, useCallback } from 'react';
import ReviewMiniBadge from './ReviewMiniBadge';
import DEFAULT_AVATAR from '../utils/defaultAvatar';
import { useAuth } from '../context/useAuth';
import { MOROCCO_CITIES } from '../utils/moroccoCities';

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

interface ReviewSummaryResponse {
    summaries: Record<string, { total: number; averageRating: number }>;
}

const CATEGORIES = [
    'Plomberie', 'Électricité', 'Climatisation / CVC', 'Dépannage routier',
    'Mécanique mobile', 'Serrurerie', 'Charpenterie', 'Peinture',
    'Nettoyage professionnel', 'Entretien de piscine', 'Sécurité / CCTV',
    'Transport de marchandises', 'Jardinage', 'Désinsectisation',
    'Service de pneus', "Réparation d'appareils", 'Autre',
];

export default function PublicAnnonces({
    onOpenAnnonce,
    onOpenUser,
}: {
    onOpenAnnonce?: (annonceId: string) => void;
    onOpenUser?: (userId: string) => void;
}) {
    const { user } = useAuth();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const getDefaultAuteurType = (userType?: 'utilisateur' | 'artisan') => {
        if (userType === 'utilisateur') return 'artisan';
        if (userType === 'artisan') return 'utilisateur';
        return '';
    };

    const formatRelativeDate = (value: string) => {
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

    const capitalizeFirstChar = (value?: string) => {
        if (!value) return '';
        return value.charAt(0).toUpperCase() + value.slice(1);
    };

    const [annonces, setAnnonces] = useState<Annonce[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterVille, setFilterVille] = useState('');
    const [filterCategorie, setFilterCategorie] = useState('');
    const [filterAuteurType, setFilterAuteurType] = useState<'utilisateur' | 'artisan' | ''>(getDefaultAuteurType(user?.userType));
    const [searchText, setSearchText] = useState('');
    const [imageIndices, setImageIndices] = useState<Record<string, number>>({});
    const [reviewSummaries, setReviewSummaries] = useState<Record<string, { total: number; averageRating: number }>>({});

    const getImageIndex = (id: string) => imageIndices[id] ?? 0;

    const prevImage = (e: React.MouseEvent, id: string, total: number) => {
        e.stopPropagation();
        setImageIndices((prev) => ({ ...prev, [id]: (getImageIndex(id) - 1 + total) % total }));
    };

    const nextImage = (e: React.MouseEvent, id: string, total: number) => {
        e.stopPropagation();
        setImageIndices((prev) => ({ ...prev, [id]: (getImageIndex(id) + 1) % total }));
    };

    useEffect(() => {
        setFilterAuteurType(getDefaultAuteurType(user?.userType));
    }, [user?.userType]);

    const preloadReviewSummaries = useCallback(async (authorIds: string[]) => {
        const uniqueIds = Array.from(new Set(authorIds.filter(Boolean)));
        if (!uniqueIds.length) return;

        try {
            const params = new URLSearchParams({ userIds: uniqueIds.join(',') });
            const response = await fetch(`${apiUrl}/api/reviews/summary?${params.toString()}`);
            if (!response.ok) return;

            const data = (await response.json()) as ReviewSummaryResponse;
            if (!data?.summaries) return;
            setReviewSummaries(data.summaries);
        } catch {
            // Keep home cards resilient even if summary prefetch fails.
        }
    }, [apiUrl]);

    const fetchAnnonces = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const params = new URLSearchParams();
            if (filterVille) params.set('ville', filterVille);
            if (filterCategorie) params.set('categorie', filterCategorie);

            const response = await fetch(`${apiUrl}/api/annonces?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const fetchedAnnonces = (data.annonces || []) as Annonce[];
            setAnnonces(fetchedAnnonces);
            await preloadReviewSummaries(fetchedAnnonces.map((annonce) => annonce.auteur));
        } catch {
            setError('Impossible de charger les annonces.');
        } finally {
            setLoading(false);
        }
    }, [apiUrl, filterVille, filterCategorie, preloadReviewSummaries]);

    useEffect(() => {
        fetchAnnonces();
    }, [fetchAnnonces]);

    const filtered = annonces.filter((a) => {
        if (filterAuteurType && a.auteurType !== filterAuteurType) return false;
        if (!searchText) return true;

        const q = searchText.toLowerCase();
        return (
            a.titre.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            (a.categories || []).some((category) => category.toLowerCase().includes(q))
        );
    });

    return (
        <section className="w-full bg-white border-b border-slate-200 pt-24 pb-10 px-6 sm:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Annonces récentes</h2>
                </div>

                <div className="mb-7 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Filtrer les annonces</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">
                                {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                            </p>
                            <button
                                onClick={() => {
                                    setFilterVille('');
                                    setFilterCategorie('');
                                    setFilterAuteurType(getDefaultAuteurType(user?.userType));
                                    setSearchText('');
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200 transition hover:text-slate-700 hover:ring-slate-300"
                            >
                                <span aria-hidden="true">↺</span>
                                Réinitialiser les filtres
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Recherche</span>
                            <div className="relative mt-1.5">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" aria-hidden="true">🔎</span>
                                <input
                                    type="text"
                                    placeholder="Titre, mot-clé..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                                />
                            </div>
                        </label>

                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Ville</span>
                            <div className="relative mt-1.5">
                                <select
                                    value={filterVille}
                                    onChange={(e) => setFilterVille(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                                >
                                    <option value="">Toutes les villes</option>
                                    {MOROCCO_CITIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true">▾</span>
                            </div>
                        </label>

                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Catégorie</span>
                            <div className="relative mt-1.5">
                                <select
                                    value={filterCategorie}
                                    onChange={(e) => setFilterCategorie(e.target.value)}
                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                                >
                                    <option value="">Toutes les catégories</option>
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true">▾</span>
                            </div>
                        </label>

                        <label className="block">
                            <span className="text-xs font-medium text-slate-600">Profil</span>
                            <div className="relative mt-1.5">
                                <select
                                    value={filterAuteurType}
                                    onChange={(e) => setFilterAuteurType(e.target.value as 'utilisateur' | 'artisan' | '')}
                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                                >
                                    <option value="">Tous les profils</option>
                                    <option value="artisan">Artisan</option>
                                    <option value="utilisateur">Utilisateur</option>
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" aria-hidden="true">▾</span>
                            </div>
                        </label>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                ) : error ? (
                    <p className="py-8 text-center text-sm text-red-500">{error}</p>
                ) : filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">Aucune annonce trouvée.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((annonce) => (
                            <div
                                key={annonce._id}
                                role="button"
                                tabIndex={0}
                                onClick={() => onOpenAnnonce && onOpenAnnonce(annonce._id)}
                                onKeyDown={(e) => e.key === 'Enter' && onOpenAnnonce && onOpenAnnonce(annonce._id)}
                                className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer"
                            >
                                {annonce.images && annonce.images.length > 0 && (
                                    <div className="group relative h-44 w-full overflow-hidden bg-slate-100 shrink-0">
                                        <img
                                            src={annonce.images[getImageIndex(annonce._id)]}
                                            alt={`${annonce.titre} ${getImageIndex(annonce._id) + 1}`}
                                            className="h-full w-full object-cover"
                                        />
                                        {annonce.images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={(e) => prevImage(e, annonce._id, annonce.images!.length)}
                                                    className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition opacity-0 group-hover:opacity-100"
                                                    aria-label="Image précédente"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={(e) => nextImage(e, annonce._id, annonce.images!.length)}
                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition opacity-0 group-hover:opacity-100"
                                                    aria-label="Image suivante"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                                                    {annonce.images.map((_, i) => (
                                                        <span
                                                            key={i}
                                                            className={`block h-1.5 rounded-full transition-all ${i === getImageIndex(annonce._id) ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col flex-1 p-4 gap-2">
                                    <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                                        {annonce.titre}
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${annonce.auteurType === 'artisan' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                            <span aria-hidden="true">{annonce.auteurType === 'artisan' ? '🛠' : '👤'}</span>
                                            <span>{annonce.auteurType === 'artisan' ? 'Artisan' : 'Utilisateur'}</span>
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-slate-500">
                                            <span aria-hidden="true">📍</span>
                                            {annonce.ville}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                        {(annonce.categories || []).map((category) => (
                                            <span key={`${annonce._id}-${category}`} className="rounded-full bg-slate-200 px-2 py-0.5">{category}</span>
                                        ))}
                                    </div>

                                    <div className="mt-auto pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenUser && onOpenUser(annonce.auteur);
                                            }}
                                            className="flex items-center gap-2 transition rounded-lg px-2 py-1 -ml-2 hover:bg-blue-50 hover:text-blue-700"
                                            aria-label={`Voir le profil de ${capitalizeFirstChar(annonce.auteurPrenom || annonce.auteurNom || 'Utilisateur')}`}
                                        >
                                            <img
                                                src={annonce.auteurPhoto || DEFAULT_AVATAR}
                                                alt={capitalizeFirstChar(annonce.auteurPrenom || annonce.auteurNom || 'Utilisateur')}
                                                className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                                            />
                                            <span>{capitalizeFirstChar(annonce.auteurPrenom || annonce.auteurNom || 'Utilisateur')}</span>
                                            <ReviewMiniBadge averageRating={reviewSummaries[annonce.auteur]?.averageRating || 0} />
                                        </button>

                                        {annonce.prix != null && (
                                            <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
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

                                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                        <span>{formatRelativeDate(annonce.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { resizeImage, validateImageFile } from '../utils/imageUtils';
import ReviewMiniBadge from './ReviewMiniBadge';
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
    status: string;
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

const MAX_ANNONCE_IMAGES = 6;

export default function Annonces({ onBack, onMesAnnonces, onOpenAnnonce, onOpenUser, initialTab = 'browse' }: { onBack: () => void; onMesAnnonces?: () => void; onOpenAnnonce?: (annonceId: string) => void; onOpenUser?: (userId: string) => void; initialTab?: 'browse' | 'post' }) {
    const { user } = useAuth();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const canPostAnnonce = !!user && (user.role === 'admin' || !user.moderationStatus || user.moderationStatus === 'approved');

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

    const [activeTab, setActiveTab] = useState<'browse' | 'post'>(() => (initialTab === 'post' && canPostAnnonce ? 'post' : 'browse'));
    const [annonces, setAnnonces] = useState<Annonce[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const [filterVille, setFilterVille] = useState('');
    const [filterCategorie, setFilterCategorie] = useState('');
    const [filterAuteurType, setFilterAuteurType] = useState<'utilisateur' | 'artisan' | ''>('');
    const [searchText, setSearchText] = useState('');
    const [imageIndices, setImageIndices] = useState<Record<string, number>>({});

    const [formData, setFormData] = useState({
        titre: '', description: '', categories: [] as string[], prix: '',
    });
    const [formImages, setFormImages] = useState<string[]>([]);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [reviewSummaries, setReviewSummaries] = useState<Record<string, { total: number; averageRating: number }>>({});

    const preloadReviewSummaries = useCallback(async (authorIds: string[]) => {
        const uniqueIds = Array.from(new Set(authorIds.filter(Boolean)));
        if (!uniqueIds.length) {
            return;
        }

        try {
            const params = new URLSearchParams({ userIds: uniqueIds.join(',') });
            const response = await fetch(`${apiUrl}/api/reviews/summary?${params.toString()}`);
            if (!response.ok) return;

            const data = (await response.json()) as ReviewSummaryResponse;
            if (!data?.summaries) return;
            setReviewSummaries(data.summaries);
        } catch {
            // Keep annonce loading resilient even if summary prefetch fails.
        }
    }, [apiUrl]);

    const getImageIndex = (id: string) => imageIndices[id] ?? 0;

    const prevImage = (e: React.MouseEvent, id: string, total: number) => {
        e.stopPropagation();
        setImageIndices((prev) => ({ ...prev, [id]: (getImageIndex(id) - 1 + total) % total }));
    };

    const nextImage = (e: React.MouseEvent, id: string, total: number) => {
        e.stopPropagation();
        setImageIndices((prev) => ({ ...prev, [id]: (getImageIndex(id) + 1) % total }));
    };

    const fetchAnnonces = useCallback(async () => {
        setLoading(true);
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

    useEffect(() => { fetchAnnonces(); }, [fetchAnnonces]);

    useEffect(() => {
        if (initialTab === 'post' && canPostAnnonce) {
            setError('');
            setActiveTab('post');
            return;
        }
        setActiveTab('browse');
    }, [initialTab, canPostAnnonce]);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCategoryChange = (category: string) => {
        setFormData(prev => {
            const categories = prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : prev.categories.length < 5 ? [...prev.categories, category] : prev.categories;
            return { ...prev, categories };
        });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const remainingSlots = MAX_ANNONCE_IMAGES - formImages.length;
        if (remainingSlots <= 0) {
            setError(`Vous avez déjà atteint le maximum de ${MAX_ANNONCE_IMAGES} images.`);
            return;
        }

        setIsProcessingImage(true);
        try {
            const filesToProcess = Array.from(files).slice(0, remainingSlots);
            const processedImages: string[] = [];

            for (const file of filesToProcess) {
                if (!validateImageFile(file)) {
                    setError(`Image invalide: ${file.name} (png, jpg, jpeg, gif) — max 5 MB.`);
                    setIsProcessingImage(false);
                    return;
                }
                const resized = await resizeImage(file, 600, 400, 0.8);
                processedImages.push(resized);
            }

            setFormImages(prev => [...prev, ...processedImages]);
            e.target.value = '';
        } catch {
            setError("Erreur lors du traitement des images.");
        } finally {
            setIsProcessingImage(false);
        }
    };

    const removeImage = (index: number) => {
        setFormImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        if (!user) { setError('Vous devez être connecté pour publier une annonce.'); return; }
        if (!user.ville || !user.telephone) {
            setError('Votre ville et votre telephone de profil sont requis pour publier une annonce.');
            return;
        }
        if (formData.categories.length === 0) {
            setError('Veuillez sélectionner au moins une catégorie.');
            return;
        }
        if (formData.categories.length > 5) {
            setError('Vous pouvez sélectionner maximum 5 catégories.');
            return;
        }
        if (formImages.length < 1) {
            setError('Veuillez ajouter au moins une photo.');
            return;
        }
        if (formImages.length > MAX_ANNONCE_IMAGES) {
            setError(`Veuillez ajouter entre 1 et ${MAX_ANNONCE_IMAGES} images.`);
            return;
        }
        setSubmitted(true);
        try {
            const response = await fetch(`${apiUrl}/api/annonces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    titre: formData.titre,
                    description: formData.description,
                    categories: formData.categories,
                    ville: user.ville,
                    contact: user.telephone,
                    prix: formData.prix ? Number(formData.prix) : undefined,
                    images: formImages,
                }),
            });
            const data = await response.json();
            if (!response.ok) { setError(data.message || 'Une erreur est survenue.'); setSubmitted(false); return; }
            setSuccessMessage('Annonce soumise ! Elle sera visible après validation par un administrateur.');
            setFormData({ titre: '', description: '', categories: [], prix: '' });
            setFormImages([]);
            setTimeout(() => {
                setSubmitted(false);
                setSuccessMessage('');
                if (onMesAnnonces) {
                    onMesAnnonces();
                } else {
                    setActiveTab('browse');
                    fetchAnnonces();
                }
            }, 1200);
        } catch {
            setError('Impossible de joindre le serveur.');
            setSubmitted(false);
        }
    };

    return (
        <section className="w-full bg-white border-b border-slate-200 pt-24 pb-10 px-6 sm:px-8 min-h-screen">
            <div className="mx-auto max-w-7xl">
                <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    Retour
                </button>

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Annonces</h1>
                        <p className="mt-1 text-slate-600">Découvrez et publiez des offres de services</p>
                    </div>
                    {user && onMesAnnonces && (
                        <button onClick={onMesAnnonces} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            Mes annonces
                        </button>
                    )}
                </div>

                {user && (
                    <div className="mb-8 flex gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 w-fit">
                        <button type="button" onClick={() => setActiveTab('browse')} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${activeTab === 'browse' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                            Parcourir
                        </button>
                        {canPostAnnonce && (
                            <button type="button" onClick={() => { setError(''); setActiveTab('post'); }} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${activeTab === 'post' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                                + Publier
                            </button>
                        )}
                    </div>
                )}

                {user && !canPostAnnonce && (
                    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700 text-sm">
                        {user.moderationStatus === 'suspended'
                            ? 'Votre compte est suspendu. Vous pouvez parcourir les annonces, mais vous ne pouvez pas en publier.'
                            : 'Votre compte est en attente de validation par un admin. Vous pouvez parcourir les annonces, mais vous ne pouvez pas encore en publier.'}
                    </div>
                )}

                {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
                {successMessage && <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">{successMessage}</div>}

                {activeTab === 'browse' ? (
                    <>
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
                                            setFilterAuteurType('');
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
                            <div className="flex items-center justify-center py-24">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                                <div className="text-5xl mb-4">📋</div>
                                <p className="text-lg font-semibold text-slate-700">Aucune annonce trouvée</p>
                                <p className="mt-1 text-sm">Revenez plus tard ou soyez le premier à publier.</p>
                                {canPostAnnonce && (
                                    <button onClick={() => setActiveTab('post')} className="mt-6 inline-block rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                                        Publier une annonce
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filtered.map(a => (
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
                                                    src={a.images[getImageIndex(a._id)]}
                                                    alt={`${a.titre} ${getImageIndex(a._id) + 1}`}
                                                    className="h-full w-full object-cover"
                                                />
                                                {a.images.length > 1 && (
                                                    <>
                                                        <button
                                                            onClick={(e) => prevImage(e, a._id, a.images!.length)}
                                                            className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition opacity-0 group-hover:opacity-100"
                                                            aria-label="Image précédente"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={(e) => nextImage(e, a._id, a.images!.length)}
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
                                                                    className={`block h-1.5 rounded-full transition-all ${i === getImageIndex(a._id) ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
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
                                                    aria-label={`Voir le profil de ${capitalizeFirstChar(a.auteurPrenom || a.auteurNom || 'Utilisateur')}`}
                                                >
                                                    <img
                                                        src={a.auteurPhoto || DEFAULT_AVATAR}
                                                        alt={capitalizeFirstChar(a.auteurPrenom || a.auteurNom || 'Utilisateur')}
                                                        className="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200"
                                                    />
                                                    <span>{capitalizeFirstChar(a.auteurPrenom || a.auteurNom || 'Utilisateur')}</span>
                                                    <ReviewMiniBadge
                                                        averageRating={reviewSummaries[a.auteur]?.averageRating || 0}
                                                    />
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
                                                <span>{formatRelativeDate(a.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="max-w-2xl">
                        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg space-y-5">
                            <h2 className="text-xl font-bold text-slate-900">Publier une annonce</h2>

                            <div>
                                <label htmlFor="a-titre" className="block text-sm font-semibold text-slate-900">Titre</label>
                                <input type="text" id="a-titre" name="titre" value={formData.titre} onChange={handleChange} required className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20" placeholder="Ex : Plombier disponible à Casablanca" />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900">Catégories <span className="font-normal text-slate-400">– min 1, max 5</span></label>
                                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                    {CATEGORIES.map(c => (
                                        <label key={c} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 cursor-pointer hover:bg-sky-50 transition">
                                            <input
                                                type="checkbox"
                                                checked={formData.categories.includes(c)}
                                                onChange={() => handleCategoryChange(c)}
                                                disabled={!formData.categories.includes(c) && formData.categories.length >= 5}
                                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50 cursor-pointer"
                                            />
                                            <span className="text-xs font-medium text-slate-700">{c}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {formData.categories.length} catégorie{formData.categories.length !== 1 ? 's' : ''} sélectionnée{formData.categories.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900">Ville du profil</label>
                                <div className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                                    {user?.ville || 'Non renseignée'}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="a-description" className="block text-sm font-semibold text-slate-900">Description</label>
                                <textarea id="a-description" name="description" value={formData.description} onChange={handleChange} required rows={4} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none" placeholder="Décrivez votre offre ou service en détail…" />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="a-prix" className="block text-sm font-semibold text-slate-900">Prix MAD <span className="font-normal text-slate-400">– facultatif</span></label>
                                    <input type="number" id="a-prix" name="prix" value={formData.prix} onChange={handleChange} min="0" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900">Telephone du profil</label>
                                    <div className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                                        {user?.telephone || 'Non renseigné'}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900">Photos <span className="font-normal text-slate-400">– obligatoire, min 1 max {MAX_ANNONCE_IMAGES}</span></label>
                                <input type="file" multiple required={formImages.length === 0} accept="image/png,image/jpeg,image/jpg,image/gif" onChange={handleImageChange} disabled={isProcessingImage || formImages.length >= MAX_ANNONCE_IMAGES} className="mt-2 block w-full text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50" />
                                {isProcessingImage && <div className="mt-2 flex items-center gap-2 text-sm text-slate-500"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600"></div>Traitement…</div>}
                                {formImages.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs text-slate-500 mb-2">{formImages.length} image{formImages.length !== 1 ? 's' : ''} sélectionnée{formImages.length !== 1 ? 's' : ''}</p>
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                            {formImages.map((img, idx) => (
                                                <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200">
                                                    <img src={img} alt={`Aperçu ${idx + 1}`} className="h-24 w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(idx)}
                                                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button type="submit" disabled={submitted} className="w-full rounded-full bg-sky-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50">
                                {submitted ? 'Envoi en cours…' : "Soumettre l'annonce"}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </section>
    );
}

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { resizeImage, validateImageFile } from '../utils/imageUtils';

interface Annonce {
    _id: string;
    titre: string;
    description: string;
    categories: string[];
    ville: string;
    prix?: number;
    contact?: string;
    status: 'en_attente' | 'approuvee' | 'suspendue';
    images?: string[];
    adminNote?: string;
    createdAt: string;
}

const CATEGORIES = [
    'Plomberie', 'Électricité', 'Climatisation / CVC', 'Dépannage routier',
    'Mécanique mobile', 'Serrurerie', 'Charpenterie', 'Peinture',
    'Nettoyage professionnel', 'Entretien de piscine', 'Sécurité / CCTV',
    'Transport de marchandises', 'Jardinage', 'Désinsectisation',
    'Service de pneus', "Réparation d'appareils", 'Autre',
];

const MAX_ANNONCE_IMAGES = 6;

const STATUS_CONFIG = {
    en_attente: { label: 'En attente', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    approuvee: { label: 'Approuvée', cls: 'bg-green-50 text-green-700 border-green-200' },
    suspendue: { label: 'Suspendue', cls: 'bg-red-50 text-red-700 border-red-200' },
} as const;

export default function UserAnnonces({ onBack, onAnnonces }: { onBack: () => void; onAnnonces?: () => void }) {
    const { user } = useAuth();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const [annonces, setAnnonces] = useState<Annonce[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState({
        titre: '', description: '', categories: [] as string[], prix: '',
    });
    const [editImages, setEditImages] = useState<string[]>([]);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);

    const fetchMyAnnonces = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/annonces/my`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            if (!response.ok) throw new Error();
            const data = await response.json();
            setAnnonces(data.annonces);
        } catch {
            setError('Impossible de charger vos annonces.');
        } finally {
            setLoading(false);
        }
    }, [apiUrl]);

    useEffect(() => { if (user) fetchMyAnnonces(); }, [user, fetchMyAnnonces]);

    const openEdit = (a: Annonce) => {
        setEditingId(a._id);
        setEditData({
            titre: a.titre,
            description: a.description,
            categories: a.categories || [],
            prix: a.prix?.toString() || '',
        });
        setEditImages(a.images || []);
        setError('');
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditCategoryChange = (category: string) => {
        setEditData(prev => {
            const categories = prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : prev.categories.length < 5 ? [...prev.categories, category] : prev.categories;
            return { ...prev, categories };
        });
    };

    const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const remainingSlots = MAX_ANNONCE_IMAGES - editImages.length;
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

            setEditImages(prev => [...prev, ...processedImages]);
            e.target.value = '';
        } catch {
            setError("Erreur lors du traitement des images.");
        } finally {
            setIsProcessingImage(false);
        }
    };

    const removeEditImage = (index: number) => {
        setEditImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (editData.categories.length < 1 || editData.categories.length > 5) {
            setError('Veuillez sélectionner entre 1 et 5 catégories.');
            return;
        }
        if (editImages.length < 1 || editImages.length > MAX_ANNONCE_IMAGES) {
            setError(`Veuillez ajouter entre 1 et ${MAX_ANNONCE_IMAGES} images.`);
            return;
        }
        setEditSubmitting(true);
        try {
            const editedAnnonce = annonces.find(a => a._id === editingId);
            const wasApproved = editedAnnonce?.status === 'approuvee';
            const wasSuspended = editedAnnonce?.status === 'suspendue';
            const response = await fetch(`${apiUrl}/api/annonces/${editingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({
                    titre: editData.titre,
                    description: editData.description,
                    categories: editData.categories,
                    prix: editData.prix ? Number(editData.prix) : undefined,
                    images: editImages,
                }),
            });
            const data = await response.json();
            if (!response.ok) { setError(data.message || 'Erreur lors de la mise à jour.'); setEditSubmitting(false); return; }
            if (editingId) {
                setAnnonces((prev) => prev.map((annonce) => {
                    if (annonce._id !== editingId) return annonce;
                    return {
                        ...annonce,
                        ...data.annonce,
                        status: 'en_attente',
                    } as Annonce;
                }));
            }
            setSuccessMessage((wasApproved || wasSuspended) ? 'Annonce mise à jour. Elle repasse en attente de validation.' : 'Annonce mise à jour !');
            setEditingId(null);
            await fetchMyAnnonces();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setEditSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;
        setDeleteSubmitting(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/annonces/${deletingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            });
            if (!response.ok) {
                const data = await response.json();
                setError(data.message || 'Erreur lors de la suppression.');
                setDeleteSubmitting(false);
                return;
            }
            setDeletingId(null);
            setSuccessMessage('Annonce supprimée.');
            await fetchMyAnnonces();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch {
            setError('Impossible de joindre le serveur.');
        } finally {
            setDeleteSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 pb-20">
            <div className="mx-auto max-w-4xl px-6">
                <button onClick={onBack} className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    Retour
                </button>

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Mes annonces</h1>
                        <p className="mt-1 text-slate-600">Gérez vos annonces publiées</p>
                    </div>
                    {onAnnonces && (
                        <button onClick={onAnnonces} className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">
                            + Nouvelle annonce
                        </button>
                    )}
                </div>

                {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
                {successMessage && <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">{successMessage}</div>}

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
                    </div>
                ) : annonces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                        <div className="text-5xl mb-4">📋</div>
                        <p className="text-lg font-semibold text-slate-700">Aucune annonce pour le moment</p>
                        {onAnnonces && (
                            <button onClick={onAnnonces} className="mt-6 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
                                Publier ma première annonce
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {annonces.map(a => (
                            <div key={a._id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                {editingId === a._id ? (
                                    <form onSubmit={handleEditSubmit} className="space-y-4">
                                        <h3 className="font-bold text-slate-900">Modifier l'annonce</h3>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-900">Titre</label>
                                            <input type="text" name="titre" value={editData.titre} onChange={handleEditChange} required className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-900">Catégories <span className="font-normal text-slate-400">– min 1, max 5</span></label>
                                            <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                {CATEGORIES.map(c => (
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
                                                {editData.categories.length} catégorie{editData.categories.length !== 1 ? 's' : ''} sélectionnée{editData.categories.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-900">Description</label>
                                            <textarea name="description" value={editData.description} onChange={handleEditChange} required rows={3} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none" />
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-900">Ville (profil)</label>
                                                <div className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700">
                                                    {user?.ville || a.ville || 'Non renseignée'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-900">Prix MAD</label>
                                                <input type="number" name="prix" value={editData.prix} onChange={handleEditChange} min="0" className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-900">Contact (profil)</label>
                                            <div className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700">
                                                {user?.telephone || a.contact || 'Non renseigné'}
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-500">
                                            Ville et téléphone sont désormais synchronisés depuis votre profil.
                                        </p>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-900">Photos <span className="font-normal text-slate-400">– obligatoire, min 1 max {MAX_ANNONCE_IMAGES}</span></label>
                                            <input type="file" multiple required={editImages.length === 0} accept="image/png,image/jpeg,image/jpg,image/gif" onChange={handleEditImageChange} disabled={isProcessingImage || editImages.length >= MAX_ANNONCE_IMAGES} className="mt-1.5 block w-full text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50" />
                                            {isProcessingImage && <div className="mt-2 flex items-center gap-2 text-sm text-slate-500"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600"></div>Traitement…</div>}
                                            {editImages.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-xs text-slate-500 mb-2">{editImages.length} image{editImages.length !== 1 ? 's' : ''} sélectionnée{editImages.length !== 1 ? 's' : ''}</p>
                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                                        {editImages.map((img, idx) => (
                                                            <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200">
                                                                <img src={img} alt={`Aperçu ${idx + 1}`} className="h-24 w-full object-cover" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeEditImage(idx)}
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

                                        <div className="flex gap-2 pt-1">
                                            <button type="submit" disabled={editSubmitting} className="flex-1 rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50">
                                                {editSubmitting ? 'Sauvegarde…' : 'Enregistrer'}
                                            </button>
                                            <button type="button" onClick={() => setEditingId(null)} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                                Annuler
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex gap-4">
                                            {a.images && a.images.length > 0 && <img src={a.images[0]} alt={a.titre} className="h-20 w-20 rounded-2xl object-cover border border-slate-200 shrink-0" />}
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-bold text-slate-900">{a.titre}</h3>
                                                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[a.status].cls}`}>
                                                        {STATUS_CONFIG[a.status].label}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{a.description}</p>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {a.categories?.slice(0, 3).map((c) => (
                                                        <span key={`${a._id}-${c}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">{c}</span>
                                                    ))}
                                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">📍 {a.ville}</span>
                                                    {a.contact && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">📞 {a.contact}</span>}
                                                    {a.prix != null && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">{a.prix} MAD</span>}
                                                </div>
                                                <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-0.5 text-[11px] font-medium text-sky-700">
                                                    <span aria-hidden="true">ℹ</span>
                                                    Ville et contact synchronisés depuis votre profil
                                                </p>
                                                {a.status === 'suspendue' && a.adminNote && (
                                                    <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-1.5 border border-red-100">
                                                        Note admin : {a.adminNote}
                                                    </p>
                                                )}
                                                {a.status === 'suspendue' && (
                                                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5 border border-amber-100">
                                                        Corrigez l'annonce puis enregistrez-la pour la renvoyer en attente de validation.
                                                    </p>
                                                )}
                                                <p className="mt-2 text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            {(a.status === 'en_attente' || a.status === 'approuvee' || a.status === 'suspendue') && (
                                                <button onClick={() => openEdit(a)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                                                    Modifier
                                                </button>
                                            )}
                                            <button onClick={() => setDeletingId(a._id)} className="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">
                                                Supprimer
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete confirmation modal */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900">Supprimer l'annonce ?</h3>
                        <p className="mt-2 text-sm text-slate-500">Cette action est irréversible.</p>
                        <div className="mt-6 flex gap-3">
                            <button onClick={handleDelete} disabled={deleteSubmitting} className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
                                {deleteSubmitting ? 'Suppression…' : 'Supprimer'}
                            </button>
                            <button onClick={() => setDeletingId(null)} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

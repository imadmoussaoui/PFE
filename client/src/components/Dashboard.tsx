import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { resizeImage, validateImageFile } from '../utils/imageUtils';
import DEFAULT_AVATAR from '../utils/defaultAvatar';

export default function Dashboard({ onBack }: { onBack: () => void }) {
    const { user, updateUser } = useAuth();
    const nameParts = (user?.name || '').trim().split(/\s+/).filter(Boolean);
    const initialFirstName = user?.prenom || nameParts[0] || '';
    const initialLastName = user?.nom || nameParts.slice(1).join(' ') || '';
    const [isEditing, setIsEditing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    const [formData, setFormData] = useState({
        prenom: initialFirstName,
        nom: initialLastName,
        email: user?.email || '',
        userType: user?.userType || 'utilisateur',
        cnie: user?.cnie || '',
        profilePhoto: user?.profilePhoto || '',
        newPassword: '',
        confirmPassword: '',
    });
    const [photoPreview, setPhotoPreview] = useState(user?.profilePhoto || DEFAULT_AVATAR);
    const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
    const hasCustomProfilePhoto = Boolean(formData.profilePhoto && formData.profilePhoto !== DEFAULT_AVATAR);
    const accountTypeLabel = formData.userType === 'utilisateur' ? 'Utilisateur' : 'Artisan';

    const handleRemovePhoto = () => {
        setFormData((prev) => ({ ...prev, profilePhoto: DEFAULT_AVATAR }));
        setPhotoPreview(DEFAULT_AVATAR);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        if (!validateImageFile(file)) {
            setError('Veuillez sélectionner un fichier image valide (png, jpg, jpeg, gif) de moins de 5MB.');
            return;
        }

        setIsProcessingPhoto(true);
        try {
            // Resize the image to 200x200 pixels
            const resizedImage = await resizeImage(file, 200, 200, 0.8);
            setFormData((prev) => ({
                ...prev,
                profilePhoto: resizedImage,
            }));
            setPhotoPreview(resizedImage);
        } catch (error) {
            console.error('Error resizing image:', error);
            setError('Erreur lors du traitement de l\'image. Veuillez réessayer.');
        } finally {
            setIsProcessingPhoto(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setSubmitted(true);

        const trimmedFirstName = formData.prenom.trim();
        const trimmedLastName = formData.nom.trim();

        if (!trimmedFirstName || !trimmedLastName) {
            setError('Le prénom et le nom sont requis.');
            setSubmitted(false);
            return;
        }

        const wantsPasswordChange = Boolean(formData.newPassword || formData.confirmPassword);
        if (wantsPasswordChange) {
            if (!formData.newPassword || !formData.confirmPassword) {
                setError('Veuillez remplir les deux champs de mot de passe.');
                setSubmitted(false);
                return;
            }
            if (formData.newPassword.length < 6) {
                setError('Le nouveau mot de passe doit contenir au moins 6 caracteres.');
                setSubmitted(false);
                return;
            }
            if (formData.newPassword !== formData.confirmPassword) {
                setError('La confirmation du mot de passe ne correspond pas.');
                setSubmitted(false);
                return;
            }
        }

        try {
            const payload: {
                prenom: string;
                nom: string;
                cnie: string;
                profilePhoto: string;
                newPassword?: string;
            } = {
                prenom: trimmedFirstName,
                nom: trimmedLastName,
                cnie: formData.cnie,
                profilePhoto: formData.profilePhoto,
            };

            if (wantsPasswordChange) {
                payload.newPassword = formData.newPassword;
            }

            const response = await fetch(`${apiUrl}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Une erreur est survenue.');
                setSubmitted(false);
                return;
            }

            updateUser({
                name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
                prenom: trimmedFirstName,
                nom: trimmedLastName,
                cnie: formData.cnie,
                profilePhoto: data.user.profilePhoto,
            });

            setSuccessMessage('Profil mis à jour avec succès !');
            setFormData((prev) => ({
                ...prev,
                newPassword: '',
                confirmPassword: '',
            }));
            setTimeout(() => {
                setIsEditing(false);
                setSuccessMessage('');
                setSubmitted(false);
            }, 1500);
        } catch (fetchError) {
            console.error(fetchError);
            setError('Impossible de joindre le serveur.');
            setSubmitted(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 pb-20">
            <div className="mx-auto max-w-2xl px-6">
                <button
                    onClick={onBack}
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Retour
                </button>

                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
                    <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
                            <p className="mt-2 text-slate-600">Gérez vos informations personnelles</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative h-24 w-24">
                                <img
                                    src={photoPreview}
                                    alt="Photo de profil"
                                    className="h-24 w-24 rounded-full border border-slate-200 object-cover"
                                />
                                {isEditing && (
                                    <button
                                        type="button"
                                        onClick={handleRemovePhoto}
                                        disabled={!hasCustomProfilePhoto || isProcessingPhoto}
                                        aria-label="Supprimer la photo"
                                        title="Supprimer la photo"
                                        className="absolute -right-1 -top-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M3 6h18" />
                                            <path d="M8 6V4h8v2" />
                                            <path d="M19 6l-1 14H6L5 6" />
                                            <path d="M10 11v6" />
                                            <path d="M14 11v6" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                {accountTypeLabel}
                            </span>
                        </div>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
                            >
                                Modifier
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700">
                            {successMessage}
                        </div>
                    )}

                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="prenom" className="block text-sm font-semibold text-slate-900">
                                        Prenom
                                    </label>
                                    <input
                                        type="text"
                                        id="prenom"
                                        name="prenom"
                                        value={formData.prenom}
                                        onChange={handleChange}
                                        required
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="nom" className="block text-sm font-semibold text-slate-900">
                                        Nom
                                    </label>
                                    <input
                                        type="text"
                                        id="nom"
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleChange}
                                        required
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="profilePhoto" className="block text-sm font-semibold text-slate-900">
                                    Photo de profil
                                </label>
                                <input
                                    type="file"
                                    id="profilePhoto"
                                    name="profilePhoto"
                                    accept="image/png,image/jpeg,image/jpg,image/gif"
                                    onChange={handlePhotoChange}
                                    disabled={isProcessingPhoto}
                                    className="mt-2 block w-full text-sm text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
                                />
                                {isProcessingPhoto && (
                                    <div className="mt-2 flex items-center text-sm text-slate-600">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600 mr-2"></div>
                                        Traitement de l'image...
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-slate-900">
                                    Adresse email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    disabled
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 transition"
                                />
                                <p className="mt-1 text-xs text-slate-500">L'email ne peut pas être modifié</p>
                            </div>

                            {formData.userType === 'artisan' && (
                                <div>
                                    <label htmlFor="cnie" className="block text-sm font-semibold text-slate-900">
                                        Numéro CNIE
                                    </label>
                                    <input
                                        type="text"
                                        id="cnie"
                                        name="cnie"
                                        value={formData.cnie}
                                        onChange={handleChange}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    />
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="newPassword" className="block text-sm font-semibold text-slate-900">
                                        Nouveau mot de passe
                                    </label>
                                    <input
                                        type="password"
                                        id="newPassword"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleChange}
                                        minLength={6}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-900">
                                        Confirmer le mot de passe
                                    </label>
                                    <input
                                        type="password"
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        minLength={6}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={submitted}
                                    className="flex-1 rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                                >
                                    {submitted ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            prenom: user?.prenom || nameParts[0] || '',
                                            nom: user?.nom || nameParts.slice(1).join(' ') || '',
                                            email: user?.email || '',
                                            userType: user?.userType || 'utilisateur',
                                            cnie: user?.cnie || '',
                                            profilePhoto: user?.profilePhoto || '',
                                            newPassword: '',
                                            confirmPassword: '',
                                        });
                                        setPhotoPreview(user?.profilePhoto || DEFAULT_AVATAR);
                                    }}
                                    className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Annuler
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm text-slate-600">Prenom</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{user?.prenom}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm text-slate-600">Nom</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{user?.nom}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm text-slate-600">Adresse email</p>
                                <p className="mt-1 text-lg font-semibold text-slate-900">{user?.email}</p>
                            </div>

                            {user?.userType === 'artisan' && user?.cnie && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-sm text-slate-600">Numéro CNIE</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-900">{user.cnie}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

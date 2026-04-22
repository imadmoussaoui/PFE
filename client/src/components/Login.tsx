import { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { resizeImage, validateImageFile } from '../utils/imageUtils';
import { MOROCCO_CITIES } from '../utils/moroccoCities';

type AuthMode = 'login' | 'register';

export default function Login({ onBack, onLoginSuccess }: { onBack: () => void; onLoginSuccess?: (user: import('../context/AuthContext').User) => void }) {
    const [mode, setMode] = useState<AuthMode>('login');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const { login } = useAuth();
    const [photoPreview, setPhotoPreview] = useState('');
    const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        sexe: '',
        adresse: '',
        ville: '',
        telephone: '',
        email: '',
        password: '',
        confirmPassword: '',
        userType: 'utilisateur',
        cni: '',
        profilePhoto: '',
    });

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

        if (mode === 'register' && formData.password !== formData.confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setSubmitted(true);

        const payload: Record<string, string> = {
            email: formData.email,
            password: formData.password,
        };

        if (mode === 'register') {
            payload.nom = formData.nom;
            payload.prenom = formData.prenom;
            payload.sexe = formData.sexe;
            payload.adresse = formData.adresse;
            payload.ville = formData.ville;
            payload.telephone = formData.telephone;
            payload.userType = formData.userType;
            if (formData.userType === 'artisan') {
                payload.cni = formData.cni;
            }
            if (formData.profilePhoto) {
                payload.profilePhoto = formData.profilePhoto;
            }
        }

        try {
            const response = await fetch(`${apiUrl}/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || 'Une erreur est survenue.');
                setSubmitted(false);
                return;
            }

            // Use AuthContext to store user data
            login(data.user, data.token);
            setSuccessMessage(mode === 'login' ? 'Connexion réussie !' : 'Inscription réussie !');

            setTimeout(() => {
                setSubmitted(false);
                if (mode === 'login') {
                    if (onLoginSuccess) {
                        onLoginSuccess(data.user);
                    } else {
                        onBack();
                    }
                } else {
                    onBack();
                    setPhotoPreview('');
                }
                setFormData({
                    nom: '',
                    prenom: '',
                    sexe: '',
                    adresse: '',
                    ville: '',
                    telephone: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    userType: 'utilisateur',
                    cni: '',
                    profilePhoto: '',
                });
            }, 1500);
        } catch (fetchError) {
            console.error(fetchError);
            setError('Impossible de joindre le serveur.');
            setSubmitted(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-20 flex items-center justify-center">
            <div className="w-full max-w-md px-6">
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
                    <div className="mb-8 flex items-center justify-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">BricolPro</h1>
                    </div>

                    <div className="mb-8 flex gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'login'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Connexion
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('register')}
                            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${mode === 'register'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Inscription
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <div>
                                <label htmlFor="userType" className="block text-sm font-semibold text-slate-900">
                                    Type de compte
                                </label>
                                <select
                                    id="userType"
                                    name="userType"
                                    value={formData.userType}
                                    onChange={handleChange}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                >
                                    <option value="utilisateur">Utilisateur</option>
                                    <option value="artisan">Artisan</option>
                                </select>
                            </div>
                        )}

                        {mode === 'register' && (
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
                                    placeholder="Votre nom"
                                />
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label htmlFor="prenom" className="block text-sm font-semibold text-slate-900">
                                    Prénom
                                </label>
                                <input
                                    type="text"
                                    id="prenom"
                                    name="prenom"
                                    value={formData.prenom}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="Votre prénom"
                                />
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label htmlFor="sexe" className="block text-sm font-semibold text-slate-900">
                                    Sexe
                                </label>
                                <select
                                    id="sexe"
                                    name="sexe"
                                    value={formData.sexe}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                >
                                    <option value="">Sélectionnez le sexe</option>
                                    <option value="Homme">Homme</option>
                                    <option value="Femme">Femme</option>
                                </select>
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label htmlFor="adresse" className="block text-sm font-semibold text-slate-900">
                                    Adresse
                                </label>
                                <input
                                    type="text"
                                    id="adresse"
                                    name="adresse"
                                    value={formData.adresse}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="Votre adresse"
                                />
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label htmlFor="ville" className="block text-sm font-semibold text-slate-900">
                                    Ville
                                </label>
                                <select
                                    id="ville"
                                    name="ville"
                                    value={formData.ville}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                >
                                    <option value="">Sélectionnez une ville</option>
                                    {MOROCCO_CITIES.map((city) => (
                                        <option key={city} value={city}>
                                            {city}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label htmlFor="telephone" className="block text-sm font-semibold text-slate-900">
                                    Téléphone
                                </label>
                                <input
                                    type="tel"
                                    id="telephone"
                                    name="telephone"
                                    value={formData.telephone}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="06XXXXXXXX"
                                />
                            </div>
                        )}

                        {mode === 'register' && formData.userType === 'artisan' && (
                            <div>
                                <label htmlFor="cni" className="block text-sm font-semibold text-slate-900">
                                    CNI
                                </label>
                                <input
                                    type="text"
                                    id="cni"
                                    name="cni"
                                    value={formData.cni}
                                    onChange={handleChange}
                                    required
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="Entrez votre numéro CNI"
                                />
                            </div>
                        )}

                        {mode === 'register' && (
                            <div>
                                <label htmlFor="profilePhoto" className="block text-sm font-semibold text-slate-900">
                                    Photo de profil (facultatif)
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
                                    <div className="mt-4 flex items-center justify-center h-24 w-24 rounded-full border border-slate-200 bg-slate-50">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                                    </div>
                                )}
                                {photoPreview && !isProcessingPhoto && (
                                    <img
                                        src={photoPreview}
                                        alt="Aperçu de la photo de profil"
                                        className="mt-4 h-24 w-24 rounded-full border border-slate-200 object-cover"
                                    />
                                )}
                            </div>
                        )}

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
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                placeholder="votre@email.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-slate-900">
                                Mot de passe
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                placeholder="••••••••"
                            />
                        </div>

                        {mode === 'register' && (
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
                                    required
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        {mode === 'login' && (
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" className="rounded border-slate-200" />
                                    <span className="text-sm text-slate-600">Se souvenir de moi</span>
                                </label>
                                <a href="#" className="text-sm font-semibold text-sky-600 hover:text-sky-700">
                                    Mot de passe oublié ?
                                </a>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-2xl bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="rounded-2xl bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700">
                                {successMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full rounded-full bg-sky-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                            disabled={submitted}
                        >
                            {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
                        </button>

                        <p className="text-center text-sm text-slate-600">
                            {mode === 'login' ? "Vous n'avez pas de compte ? " : 'Vous avez déjà un compte ? '}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(mode === 'login' ? 'register' : 'login');
                                    setFormData({
                                        nom: '',
                                        prenom: '',
                                        sexe: '',
                                        adresse: '',
                                        ville: '',
                                        telephone: '',
                                        email: '',
                                        password: '',
                                        confirmPassword: '',
                                        userType: 'utilisateur',
                                        cni: '',
                                        profilePhoto: '',
                                    });
                                }}
                                className="font-semibold text-sky-600 hover:text-sky-700"
                            >
                                {mode === 'login' ? 'Inscrivez-vous ici' : 'Connectez-vous ici'}
                            </button>
                        </p>
                    </form>
                </div>
            </div >
        </div >
    );
}

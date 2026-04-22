import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Annonce from '../models/Annonce';
import User from '../models/User';

const LEGACY_UI_AVATAR_REGEX = /^https?:\/\/ui-avatars\.com\/api\//i;
const MAX_ANNONCE_IMAGES = 6;

const sanitizeProfilePhoto = (value?: unknown) => {
    if (typeof value !== 'string') return '';
    const normalizedValue = value.trim();
    if (!normalizedValue || LEGACY_UI_AVATAR_REGEX.test(normalizedValue)) {
        return '';
    }
    return normalizedValue;
};

type AnnonceAuthorShape = {
    auteur: { toString(): string } | string;
    auteurNom?: string;
    auteurPrenom?: string;
    auteurType?: 'utilisateur' | 'artisan';
    auteurPhoto?: string;
    toObject?: () => Record<string, unknown>;
};

const withLiveAuthorData = async <T extends AnnonceAuthorShape>(annonces: T[]) => {
    const authorIds = Array.from(new Set(annonces.map((annonce) => annonce.auteur?.toString()).filter(Boolean)));
    if (!authorIds.length) {
        return annonces;
    }

    const users = await User.find({ _id: { $in: authorIds } })
        .select('_id name nom prenom userType profilePhoto')
        .lean();

    const userById = new Map(users.map((user) => [String(user._id), user]));

    return annonces.map((annonce) => {
        const authorId = annonce.auteur?.toString();
        const author = authorId ? userById.get(authorId) : undefined;
        const annonceObject = typeof annonce.toObject === 'function'
            ? annonce.toObject()
            : (annonce as unknown as Record<string, unknown>);

        if (!author) {
            return annonceObject;
        }

        return {
            ...annonceObject,
            auteurNom: author.nom || (annonceObject.auteurNom as string) || author.name || '',
            auteurPrenom: author.prenom || (annonceObject.auteurPrenom as string) || '',
            auteurType: (author.userType as 'utilisateur' | 'artisan') || (annonceObject.auteurType as 'utilisateur' | 'artisan'),
            auteurPhoto: sanitizeProfilePhoto(author.profilePhoto) || sanitizeProfilePhoto(annonceObject.auteurPhoto),
        };
    });
};

const isValidImageDataUri = (value: string) =>
    /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(value);

const normalizeAnnonceStatus = (value: unknown): 'en_attente' | 'approuvee' | 'suspendue' | null => {
    if (typeof value !== 'string') return null;

    const normalized = value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');

    if (normalized === 'en_attente' || normalized === 'approuvee' || normalized === 'suspendue') {
        return normalized;
    }

    return null;
};

// GET /api/annonces — public, returns approved annonces with optional filters
export const getAnnonces = async (req: Request, res: Response) => {
    try {
        const { ville, categorie, page = '1', limit = '20' } = req.query as Record<string, string>;
        const filter: Record<string, unknown> = { status: 'approuvee' };
        if (ville) filter.ville = ville;
        if (categorie) filter.categories = categorie;
        const { auteur } = req.query as Record<string, string>;
        if (auteur && mongoose.Types.ObjectId.isValid(auteur)) filter.auteur = auteur;

        const skip = (Number(page) - 1) * Number(limit);
        const [annonces, total] = await Promise.all([
            Annonce.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Annonce.countDocuments(filter),
        ]);

        const annoncesWithLiveAuthorData = await withLiveAuthorData(annonces);

        return res.status(200).json({
            annonces: annoncesWithLiveAuthorData,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/annonces/:id — public, approved annonce details
export const getAnnonceById = async (req: Request, res: Response) => {
    try {
        const annonce = await Annonce.findOne({
            _id: req.params.id,
            status: 'approuvee',
        });

        if (!annonce) {
            return res.status(404).json({ message: 'Annonce introuvable' });
        }

        const [annonceWithLiveAuthorData] = await withLiveAuthorData([annonce]);

        return res.status(200).json({ annonce: annonceWithLiveAuthorData });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// POST /api/annonces — authenticated
export const createAnnonce = async (req: Request, res: Response) => {
    try {
        const { titre, description, categories, prix, images } = req.body;

        if (!titre || !description || !categories || !Array.isArray(categories)) {
            return res.status(400).json({ message: 'Titre, description et catégories (tableau) sont requis.' });
        }

        if (categories.length < 1 || categories.length > 5) {
            return res.status(400).json({ message: 'Vous devez sélectionner entre 1 et 5 catégories.' });
        }

        if (!images || !Array.isArray(images) || images.length < 1 || images.length > MAX_ANNONCE_IMAGES) {
            return res.status(400).json({ message: `Vous devez ajouter entre 1 et ${MAX_ANNONCE_IMAGES} images.` });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        if (user.role !== 'admin' && (user.moderationStatus === 'pending' || user.moderationStatus === 'suspended')) {
            return res.status(403).json({
                message: user.moderationStatus === 'suspended'
                    ? 'Votre compte est suspendu. Vous ne pouvez pas publier d\'annonces.'
                    : 'Votre compte est en attente de validation admin. Vous ne pouvez pas publier d\'annonces pour le moment.',
            });
        }

        const profileVille = (user as unknown as Record<string, string>).ville?.trim();
        const profileTelephone = (user as unknown as Record<string, string>).telephone?.trim();
        if (!profileVille || !profileTelephone) {
            return res.status(400).json({
                message: 'Votre profil doit contenir une ville et un telephone pour publier une annonce.',
            });
        }

        let imagesValue: string[];
        {
            const validatedImages = images.filter((img: string) => isValidImageDataUri(img));
            if (validatedImages.length !== images.length) {
                return res.status(400).json({ message: "Format d'image invalide. Utilisez png, jpg, jpeg, gif ou webp." });
            }
            imagesValue = validatedImages;
        }

        const annonce = new Annonce({
            titre: titre.trim(),
            description: description.trim(),
            categories: categories.map((c: string) => c.trim()),
            ville: profileVille,
            prix: prix !== undefined && prix !== '' ? Number(prix) : undefined,
            contact: profileTelephone,
            auteur: user._id,
            auteurNom: (user as unknown as Record<string, string>).nom || user.name || '',
            auteurPrenom: (user as unknown as Record<string, string>).prenom || '',
            auteurType: user.userType,
            auteurPhoto: sanitizeProfilePhoto((user as unknown as Record<string, string>).profilePhoto),
            images: imagesValue,
            status: 'en_attente',
        });

        await annonce.save();

        return res.status(201).json({
            message: 'Annonce soumise avec succès. Elle sera visible après validation.',
            annonce,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/annonces/my — user's own annonces
export const getMyAnnonces = async (req: Request, res: Response) => {
    try {
        const annonces = await Annonce.find({ auteur: req.userId }).sort({ createdAt: -1 });
        const normalizedAnnonces = annonces.map((annonce) => {
            const normalizedStatus = normalizeAnnonceStatus(annonce.status);
            if (normalizedStatus && annonce.status !== normalizedStatus) {
                annonce.status = normalizedStatus;
            }
            return annonce;
        });

        const annoncesWithLiveAuthorData = await withLiveAuthorData(normalizedAnnonces);

        return res.status(200).json({ annonces: annoncesWithLiveAuthorData });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/annonces/:id — update own annonce
export const updateAnnonce = async (req: Request, res: Response) => {
    try {
        const annonce = await Annonce.findById(req.params.id);
        if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });

        const currentUser = await User.findById(req.userId);
        if (!currentUser) return res.status(404).json({ message: 'Utilisateur introuvable' });

        const isAdmin = currentUser.role === 'admin';
        const currentStatus = normalizeAnnonceStatus(annonce.status);
        if (annonce.status !== currentStatus) {
            annonce.status = currentStatus || 'en_attente';
        }

        if (!isAdmin && annonce.auteur.toString() !== req.userId)
            return res.status(403).json({ message: 'Non autorisé' });

        const { titre, description, categories, ville, prix, contact, images } = req.body;
        const profileVille = (currentUser as unknown as Record<string, string>).ville?.trim();
        const profileTelephone = (currentUser as unknown as Record<string, string>).telephone?.trim();

        if (!isAdmin && (!profileVille || !profileTelephone)) {
            return res.status(400).json({
                message: 'Votre profil doit contenir une ville et un telephone pour mettre a jour une annonce.',
            });
        }

        if (titre) annonce.titre = titre.trim();
        if (description) annonce.description = description.trim();
        if (categories !== undefined) {
            if (!Array.isArray(categories) || categories.length < 1 || categories.length > 5) {
                return res.status(400).json({ message: 'Vous devez sélectionner entre 1 et 5 catégories.' });
            }
            annonce.categories = categories.map((c: string) => c.trim());
        }
        if (isAdmin && ville) annonce.ville = ville;
        if (prix !== undefined) annonce.prix = prix !== '' ? Number(prix) : undefined;
        if (isAdmin && contact !== undefined) annonce.contact = contact?.trim() || undefined;
        if (images !== undefined) {
            if (!Array.isArray(images) || images.length < 1 || images.length > MAX_ANNONCE_IMAGES) {
                return res.status(400).json({ message: `Vous devez ajouter entre 1 et ${MAX_ANNONCE_IMAGES} images.` });
            }
            const validatedImages = images.filter((img: string) => isValidImageDataUri(img));
            if (validatedImages.length !== images.length) {
                return res.status(400).json({ message: "Format d'image invalide." });
            }
            annonce.images = validatedImages;
        }

        if (!isAdmin) {
            annonce.ville = profileVille || annonce.ville;
            annonce.contact = profileTelephone || annonce.contact;
            annonce.status = 'en_attente';
            annonce.adminNote = '';
        }

        await annonce.save();
        return res.status(200).json({
            message: !isAdmin
                ? 'Annonce mise à jour. Elle est repassée en attente de validation.'
                : 'Annonce mise à jour',
            annonce,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// DELETE /api/annonces/:id — delete own annonce
export const deleteAnnonce = async (req: Request, res: Response) => {
    try {
        const annonce = await Annonce.findById(req.params.id);
        if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
        if (annonce.auteur.toString() !== req.userId)
            return res.status(403).json({ message: 'Non autorisé' });

        await annonce.deleteOne();
        return res.status(200).json({ message: 'Annonce supprimée' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/annonces/admin/all — admin: all annonces
export const getAllAnnoncesAdmin = async (req: Request, res: Response) => {
    try {
        const { status, page = '1', limit = '50' } = req.query as Record<string, string>;
        const filter: Record<string, unknown> = {};
        if (status) filter.status = status;

        const skip = (Number(page) - 1) * Number(limit);
        const [annonces, total] = await Promise.all([
            Annonce.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Annonce.countDocuments(filter),
        ]);

        const annoncesWithLiveAuthorData = await withLiveAuthorData(annonces);

        const stats = {
            total: await Annonce.countDocuments({}),
            en_attente: await Annonce.countDocuments({ status: 'en_attente' }),
            approuvee: await Annonce.countDocuments({ status: 'approuvee' }),
            suspendue: await Annonce.countDocuments({ status: 'suspendue' }),
        };

        return res.status(200).json({ annonces: annoncesWithLiveAuthorData, total, stats });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/annonces/admin/:id/approve
export const approveAnnonce = async (req: Request, res: Response) => {
    try {
        const annonce = await Annonce.findByIdAndUpdate(
            req.params.id,
            { status: 'approuvee', adminNote: '' },
            { new: true }
        );
        if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
        return res.status(200).json({ message: 'Annonce approuvée', annonce });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/annonces/admin/:id/suspend
export const suspendAnnonce = async (req: Request, res: Response) => {
    try {
        const { adminNote } = req.body;
        const annonce = await Annonce.findByIdAndUpdate(
            req.params.id,
            { status: 'suspendue', adminNote: adminNote?.trim() || '' },
            { new: true }
        );
        if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
        return res.status(200).json({ message: 'Annonce suspendue', annonce });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/annonces/admin/:id/update — admin: update any annonce
export const updateAnnonceAdmin = async (req: Request, res: Response) => {
    try {
        const annonce = await Annonce.findById(req.params.id);
        if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });

        const currentStatus = normalizeAnnonceStatus(annonce.status);
        if (currentStatus && annonce.status !== currentStatus) {
            annonce.status = currentStatus;
        }

        const { titre, description, categories, ville, prix, contact, images, status, adminNote } = req.body;

        if (titre) annonce.titre = titre.trim();
        if (description) annonce.description = description.trim();
        if (categories !== undefined) {
            if (!Array.isArray(categories) || categories.length < 1 || categories.length > 5) {
                return res.status(400).json({ message: 'Vous devez sélectionner entre 1 et 5 catégories.' });
            }
            annonce.categories = categories.map((c: string) => c.trim());
        }
        if (ville) annonce.ville = ville;
        if (prix !== undefined) annonce.prix = prix !== '' ? Number(prix) : undefined;
        if (contact !== undefined) annonce.contact = contact?.trim() || undefined;
        if (images !== undefined) {
            if (!Array.isArray(images) || images.length < 1 || images.length > MAX_ANNONCE_IMAGES) {
                return res.status(400).json({ message: `Vous devez ajouter entre 1 et ${MAX_ANNONCE_IMAGES} images.` });
            }
            const validatedImages = images.filter((img: string) => isValidImageDataUri(img));
            if (validatedImages.length !== images.length) {
                return res.status(400).json({ message: "Format d'image invalide." });
            }
            annonce.images = validatedImages;
        }
        const requestedStatus = normalizeAnnonceStatus(status);
        if (requestedStatus) {
            annonce.status = requestedStatus;
        }
        if (adminNote !== undefined) annonce.adminNote = adminNote?.trim() || '';

        await annonce.save();
        return res.status(200).json({ message: 'Annonce mise à jour par admin', annonce });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// DELETE /api/annonces/admin/:id
export const deleteAnnonceAdmin = async (req: Request, res: Response) => {
    try {
        const annonce = await Annonce.findByIdAndDelete(req.params.id);
        if (!annonce) return res.status(404).json({ message: 'Annonce introuvable' });
        return res.status(200).json({ message: 'Annonce supprimée' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

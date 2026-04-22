import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';

const DEFAULT_PROFILE_PHOTO = '/default-profile-avatar.svg';
const LEGACY_UI_AVATAR_REGEX = /^https?:\/\/ui-avatars\.com\/api\//i;

const isValidPhotoDataUri = (value: string) => {
    return /^data:image\/(png|jpe?g|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
};

const getProfilePhotoOrDefault = (value?: string | null) => {
    if (!value || !value.trim()) return DEFAULT_PROFILE_PHOTO;
    if (LEGACY_UI_AVATAR_REGEX.test(value.trim())) return DEFAULT_PROFILE_PHOTO;
    return value;
};

const isValidProfilePhotoInput = (value: string) => {
    return value === DEFAULT_PROFILE_PHOTO || isValidPhotoDataUri(value);
};

const normalizeIncomingProfilePhoto = (value: unknown): string | null => {
    if (value === null) return DEFAULT_PROFILE_PHOTO;
    if (typeof value !== 'string') return null;

    const trimmedValue = value.trim();
    if (!trimmedValue) return DEFAULT_PROFILE_PHOTO;

    const sanitizedValue = getProfilePhotoOrDefault(trimmedValue);
    return isValidProfilePhotoInput(sanitizedValue) ? sanitizedValue : null;
};

const createToken = (userId: string) => {
    const secret = process.env.JWT_SECRET || 'supersecret';
    return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response) => {
    try {
        const { nom, prenom, sexe, adresse, ville, telephone, email, password, userType, cni, cnie, profilePhoto } = req.body;
        const normalizedCni = cni || cnie;
        const fullName = `${prenom || ''} ${nom || ''}`.trim();
        const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
        const roleValue: 'user' | 'admin' = adminEmail && email.toLowerCase().trim() === adminEmail ? 'admin' : 'user';
        const moderationStatusValue: 'pending' | 'approved' = roleValue === 'admin' ? 'approved' : 'pending';

        if (!nom || !prenom || !sexe || !adresse || !ville || !telephone || !email || !password || !userType) {
            return res.status(400).json({ message: 'Tous les champs requis doivent être remplis.' });
        }

        if (userType === 'artisan' && !normalizedCni) {
            return res.status(400).json({ message: 'Le champ CNI est requis pour les artisans.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
        }

        let photoValue = DEFAULT_PROFILE_PHOTO;
        if (profilePhoto) {
            if (isValidProfilePhotoInput(profilePhoto)) {
                photoValue = profilePhoto;
            } else {
                return res.status(400).json({ message: 'Format de photo invalide. Utilisez une image png, jpg, jpeg ou gif.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name: fullName,
            nom,
            prenom,
            sexe,
            adresse,
            ville,
            telephone,
            email,
            password: hashedPassword,
            userType,
            role: roleValue,
            moderationStatus: moderationStatusValue,
            cni: userType === 'artisan' ? normalizedCni : undefined,
            cnie: userType === 'artisan' ? normalizedCni : undefined,
            profilePhoto: photoValue,
        });

        await user.save();

        const token = createToken(user._id.toString());

        return res.status(201).json({
            user: {
                id: user._id,
                name: user.name,
                nom: user.nom,
                prenom: user.prenom,
                sexe: user.sexe,
                adresse: user.adresse,
                ville: user.ville,
                telephone: user.telephone,
                email: user.email,
                userType: user.userType,
                role: user.role,
                moderationStatus: user.moderationStatus,
                cni: user.cni,
                cnie: user.cnie,
                profilePhoto: getProfilePhotoOrDefault(user.profilePhoto),
            },
            token,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email et mot de passe sont requis.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Email ou mot de passe invalide.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Email ou mot de passe invalide.' });
        }

        // Check if user should be admin based on ADMIN_EMAIL
        const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
        const userEmail = user.email.toLowerCase().trim();
        if (adminEmail && userEmail === adminEmail && user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
        }

        const token = createToken(user._id.toString());

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                nom: user.nom,
                prenom: user.prenom,
                sexe: user.sexe,
                adresse: user.adresse,
                ville: user.ville,
                telephone: user.telephone,
                email: user.email,
                userType: user.userType,
                role: user.role,
                moderationStatus: user.moderationStatus,
                cni: user.cni,
                cnie: user.cnie,
                profilePhoto: getProfilePhotoOrDefault(user.profilePhoto),
            },
            token,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                nom: user.nom,
                prenom: user.prenom,
                sexe: user.sexe,
                adresse: user.adresse,
                ville: user.ville,
                telephone: user.telephone,
                email: user.email,
                userType: user.userType,
                role: user.role,
                moderationStatus: user.moderationStatus,
                cni: user.cni,
                cnie: user.cnie,
                profilePhoto: getProfilePhotoOrDefault(user.profilePhoto),
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/auth/users/:id  – public profile (no sensitive data)
export const getPublicUserProfile = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
        }

        const user = await User.findById(id).select('nom prenom userType ville profilePhoto createdAt moderationStatus');
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (user.moderationStatus === 'suspended') {
            return res.status(403).json({ message: 'Ce compte est suspendu.' });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                nom: user.nom,
                prenom: user.prenom,
                userType: user.userType,
                ville: user.ville,
                profilePhoto: getProfilePhotoOrDefault(user.profilePhoto),
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        const { name, prenom, nom, cni, cnie, profilePhoto, newPassword } = req.body;
        const normalizedCni = cni || cnie;
        const normalizedPrenom = typeof prenom === 'string' ? prenom.trim() : '';
        const normalizedNom = typeof nom === 'string' ? nom.trim() : '';

        if (!userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        let resolvedPrenom = normalizedPrenom;
        let resolvedNom = normalizedNom;

        if ((!resolvedPrenom || !resolvedNom) && typeof name === 'string' && name.trim()) {
            const nameParts = name.trim().split(/\s+/).filter(Boolean);
            resolvedPrenom = resolvedPrenom || nameParts[0] || '';
            resolvedNom = resolvedNom || nameParts.slice(1).join(' ') || '';
        }

        if (!resolvedPrenom || !resolvedNom) {
            return res.status(400).json({ message: 'Le prénom et le nom sont requis.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        user.prenom = resolvedPrenom;
        user.nom = resolvedNom;
        user.name = `${resolvedPrenom} ${resolvedNom}`.trim();
        if (user.userType === 'artisan' && normalizedCni) {
            user.cni = normalizedCni;
            user.cnie = normalizedCni;
        }

        if (newPassword !== undefined && newPassword !== '') {
            if (typeof newPassword !== 'string' || newPassword.length < 6) {
                return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
            }
            user.password = await bcrypt.hash(newPassword, 10);
        }

        if (profilePhoto !== undefined) {
            const normalizedProfilePhoto = normalizeIncomingProfilePhoto(profilePhoto);
            if (normalizedProfilePhoto) {
                user.profilePhoto = normalizedProfilePhoto;
            } else {
                return res.status(400).json({ message: 'Format de photo invalide. Utilisez une image png, jpg, jpeg ou gif.' });
            }
        }

        await user.save();

        return res.status(200).json({
            message: 'Profil mis à jour avec succès',
            user: {
                id: user._id,
                name: user.name,
                nom: user.nom,
                prenom: user.prenom,
                sexe: user.sexe,
                adresse: user.adresse,
                ville: user.ville,
                telephone: user.telephone,
                email: user.email,
                userType: user.userType,
                role: user.role,
                moderationStatus: user.moderationStatus,
                cni: user.cni,
                cnie: user.cnie,
                profilePhoto: getProfilePhotoOrDefault(user.profilePhoto),
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// GET /api/auth/admin/users — admin: list all users
export const getAllUsersAdmin = async (req: Request, res: Response) => {
    try {
        const { moderationStatus } = req.query as Record<string, string>;
        const filter: Record<string, unknown> = {};
        if (moderationStatus) filter.moderationStatus = moderationStatus;

        const users = await User.find(filter)
            .select('-password')
            .sort({ createdAt: -1 });

        const stats = {
            total: await User.countDocuments({}),
            pending: await User.countDocuments({ moderationStatus: 'pending' }),
            approved: await User.countDocuments({ moderationStatus: 'approved' }),
            suspended: await User.countDocuments({ moderationStatus: 'suspended' }),
        };

        const usersWithDefaultPhoto = users.map((u) => {
            const plainUser = u.toObject();
            return {
                ...plainUser,
                profilePhoto: getProfilePhotoOrDefault((plainUser as { profilePhoto?: string }).profilePhoto),
            };
        });

        return res.status(200).json({ users: usersWithDefaultPhoto, stats });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/auth/admin/users/:id/approve
export const approveUserAdmin = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { moderationStatus: 'approved' },
            { new: true }
        ).select('_id');

        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

        return res.status(200).json({ message: 'Utilisateur approuvé' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/auth/admin/users/:id/suspend
export const suspendUserAdmin = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
        }

        const user = await User.findById(id).select('_id role');
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (user.role === 'admin') return res.status(400).json({ message: 'Impossible de suspendre un administrateur.' });

        await User.updateOne({ _id: id }, { $set: { moderationStatus: 'suspended' } });

        return res.status(200).json({ message: 'Utilisateur suspendu' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// DELETE /api/auth/admin/users/:id
export const deleteUserAdmin = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
        }

        const user = await User.findById(id).select('_id role');
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (user.role === 'admin') return res.status(400).json({ message: 'Impossible de supprimer un administrateur.' });

        await user.deleteOne();
        return res.status(200).json({ message: 'Utilisateur supprimé' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/auth/admin/users/:id
export const updateUserAdmin = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
        }

        const {
            nom,
            prenom,
            sexe,
            adresse,
            ville,
            telephone,
            email,
            userType,
            moderationStatus,
            cni,
            cnie,
            profilePhoto,
        } = req.body as {
            nom?: string;
            prenom?: string;
            sexe?: string;
            adresse?: string;
            ville?: string;
            telephone?: string;
            email?: string;
            userType?: 'utilisateur' | 'artisan';
            moderationStatus?: 'pending' | 'approved' | 'suspended';
            cni?: string;
            cnie?: string;
            profilePhoto?: string;
        };

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (user.role === 'admin') return res.status(400).json({ message: 'Impossible de modifier un administrateur.' });

        if (email !== undefined) {
            const emailTrimmed = email.trim().toLowerCase();
            if (!emailTrimmed) {
                return res.status(400).json({ message: 'Email invalide.' });
            }

            const existingUser = await User.findOne({ email: emailTrimmed, _id: { $ne: user._id } }).select('_id');
            if (existingUser) {
                return res.status(409).json({ message: 'Cet email est deja utilise.' });
            }

            user.email = emailTrimmed;
        }

        if (nom !== undefined) user.nom = nom.trim();
        if (prenom !== undefined) user.prenom = prenom.trim();
        if (sexe !== undefined) user.sexe = sexe.trim();
        if (adresse !== undefined) user.adresse = adresse.trim();
        if (ville !== undefined) user.ville = ville.trim();
        if (telephone !== undefined) user.telephone = telephone.trim();

        if (userType !== undefined) {
            if (userType !== 'utilisateur' && userType !== 'artisan') {
                return res.status(400).json({ message: 'Type utilisateur invalide.' });
            }
            user.userType = userType;
        }

        if (moderationStatus !== undefined) {
            if (!['pending', 'approved', 'suspended'].includes(moderationStatus)) {
                return res.status(400).json({ message: 'Statut de moderation invalide.' });
            }
            user.moderationStatus = moderationStatus;
        }

        const normalizedCni = cni ?? cnie;
        if (user.userType === 'artisan') {
            if (normalizedCni !== undefined) {
                user.cni = normalizedCni.trim();
                user.cnie = normalizedCni.trim();
            }
        } else {
            user.cni = undefined;
            user.cnie = undefined;
        }

        if (profilePhoto !== undefined) {
            if (profilePhoto === '') {
                user.profilePhoto = DEFAULT_PROFILE_PHOTO;
            } else if (isValidProfilePhotoInput(profilePhoto)) {
                user.profilePhoto = profilePhoto;
            } else {
                return res.status(400).json({ message: 'Format de photo invalide. Utilisez une image png, jpg, jpeg ou gif.' });
            }
        }

        const fullName = `${user.prenom || ''} ${user.nom || ''}`.trim();
        user.name = fullName || user.name;

        if (!user.nom || !user.prenom || !user.sexe || !user.adresse || !user.ville || !user.telephone || !user.email) {
            return res.status(400).json({ message: 'Les champs profil requis ne peuvent pas etre vides.' });
        }

        if (user.userType === 'artisan' && !user.cni) {
            return res.status(400).json({ message: 'Le champ CNI est requis pour les artisans.' });
        }

        await user.save();

        return res.status(200).json({
            message: 'Utilisateur mis a jour avec succes.',
            user: {
                _id: user._id,
                name: user.name,
                nom: user.nom,
                prenom: user.prenom,
                sexe: user.sexe,
                adresse: user.adresse,
                ville: user.ville,
                telephone: user.telephone,
                email: user.email,
                userType: user.userType,
                role: user.role,
                moderationStatus: user.moderationStatus,
                cni: user.cni,
                cnie: user.cnie,
                profilePhoto: getProfilePhotoOrDefault(user.profilePhoto),
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

// PUT /api/auth/admin/users/:id/reset-password
export const resetUserPasswordAdmin = async (req: Request, res: Response) => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { newPassword } = req.body as { newPassword?: string };

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
        }

        if (!newPassword || newPassword.trim().length < 6) {
            return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caracteres.' });
        }

        const user = await User.findById(id).select('_id role');
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (user.role === 'admin') return res.status(400).json({ message: 'Impossible de modifier le mot de passe d un administrateur.' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne({ _id: id }, { $set: { password: hashedPassword } });

        return res.status(200).json({ message: 'Mot de passe reinitialise avec succes.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const createToken = (userId: string) => {
    const secret = process.env.JWT_SECRET || 'supersecret';
    return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, userType, cnie } = req.body;

        if (!name || !email || !password || !userType) {
            return res.status(400).json({ message: 'Tous les champs requis doivent être remplis.' });
        }

        if (userType === 'artisan' && !cnie) {
            return res.status(400).json({ message: 'Le numéro CNIE est requis pour les artisans.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            userType,
            cnie: userType === 'artisan' ? cnie : undefined,
        });

        await user.save();

        const token = createToken(user._id.toString());

        return res.status(201).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                cnie: user.cnie,
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

        const token = createToken(user._id.toString());

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                cnie: user.cnie,
            },
            token,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
    }
};

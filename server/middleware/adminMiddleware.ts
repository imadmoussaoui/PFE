import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        const user = await User.findById(req.userId).lean() as { role?: string } | null;
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Accès refusé. Droits administrateur requis.' });
        }

        next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
};

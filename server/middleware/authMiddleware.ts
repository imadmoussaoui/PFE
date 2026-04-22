import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Token manquant' });
        }

        const secret = process.env.JWT_SECRET || 'supersecret';
        const decoded = jwt.verify(token, secret) as { id: string };

        req.userId = decoded.id;
        next();
    } catch (error) {
        console.error(error);
        return res.status(401).json({ message: 'Token invalide' });
    }
};

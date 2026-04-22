import mongoose, { Document, Schema } from 'mongoose';

const MAX_ANNONCE_IMAGES = 6;

export interface IAnnonce extends Document {
    titre: string;
    description: string;
    categories: string[];
    ville: string;
    prix?: number;
    contact?: string;
    status: 'en_attente' | 'approuvee' | 'suspendue';
    auteur: mongoose.Types.ObjectId;
    auteurNom: string;
    auteurPrenom: string;
    auteurType: 'utilisateur' | 'artisan';
    auteurPhoto?: string;
    images?: string[];
    adminNote?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AnnonceSchema = new Schema<IAnnonce>(
    {
        titre: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        categories: { type: [String], required: true, validate: { validator: (v: string[]) => v.length >= 1 && v.length <= 5, message: 'Vous devez sélectionner entre 1 et 5 catégories.' } },
        ville: { type: String, required: true, trim: true },
        prix: { type: Number, min: 0 },
        contact: { type: String, trim: true },
        status: {
            type: String,
            enum: ['en_attente', 'approuvee', 'suspendue'],
            default: 'en_attente',
        },
        auteur: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        auteurNom: { type: String, required: true, trim: true },
        auteurPrenom: { type: String, trim: true, default: '' },
        auteurType: { type: String, required: true, enum: ['utilisateur', 'artisan'] },
        auteurPhoto: { type: String, default: '' },
        images: {
            type: [String],
            required: true,
            validate: {
                validator: (v: string[]) => Array.isArray(v) && v.length >= 1 && v.length <= MAX_ANNONCE_IMAGES,
                message: `Vous devez ajouter entre 1 et ${MAX_ANNONCE_IMAGES} images.`,
            },
        },
        adminNote: { type: String, default: '' },
    },
    { timestamps: true }
);

const Annonce = mongoose.models.Annonce || mongoose.model<IAnnonce>('Annonce', AnnonceSchema);
export default Annonce;

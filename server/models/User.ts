import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    name: string;
    nom: string;
    prenom: string;
    sexe: string;
    adresse: string;
    ville: string;
    telephone: string;
    email: string;
    password: string;
    userType: 'utilisateur' | 'artisan';
    role: 'user' | 'admin';
    moderationStatus: 'pending' | 'approved' | 'suspended';
    cni?: string;
    cnie?: string;
    profilePhoto?: string;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        nom: { type: String, required: true, trim: true },
        prenom: { type: String, required: true, trim: true },
        sexe: { type: String, required: true, trim: true },
        adresse: { type: String, required: true, trim: true },
        ville: { type: String, required: true, trim: true },
        telephone: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        userType: { type: String, required: true, enum: ['utilisateur', 'artisan'], default: 'utilisateur' },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        moderationStatus: { type: String, enum: ['pending', 'approved', 'suspended'], default: 'pending' },
        cni: { type: String, trim: true },
        cnie: { type: String },
        profilePhoto: {
            type: String,
            trim: true,
            default: '/default-profile-avatar.svg',
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;

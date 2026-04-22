import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
    annonce: mongoose.Types.ObjectId;
    reviewer: mongoose.Types.ObjectId;
    reviewee: mongoose.Types.ObjectId;
    reviewerType: 'utilisateur' | 'artisan';
    revieweeType: 'utilisateur' | 'artisan';
    status: 'pending' | 'approved' | 'rejected';
    rating: number;
    comment?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
    {
        annonce: { type: Schema.Types.ObjectId, ref: 'Annonce', required: true },
        reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reviewee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        reviewerType: { type: String, required: true, enum: ['utilisateur', 'artisan'] },
        revieweeType: { type: String, required: true, enum: ['utilisateur', 'artisan'] },
        status: { type: String, required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true, maxlength: 500, default: '' },
    },
    { timestamps: true }
);

ReviewSchema.index({ reviewer: 1, annonce: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
export default Review;

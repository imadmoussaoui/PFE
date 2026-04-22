import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error('MONGODB_URI environment variable is required');
    }

    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
}

export async function disconnectDB(): Promise<void> {
    await mongoose.connection.close(false);
    console.log('MongoDB connection closed');
}

import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../db';
import User from '../models/User';
import Annonce from '../models/Annonce';

dotenv.config();

const DEFAULT_PROFILE_PHOTO = '/default-profile-avatar.svg';
const LEGACY_UI_AVATAR_REGEX = /^https?:\/\/ui-avatars\.com\/api\//i;

async function run() {
    try {
        await connectDB();

        const usersResult = await User.updateMany(
            { profilePhoto: { $regex: LEGACY_UI_AVATAR_REGEX } },
            { $set: { profilePhoto: DEFAULT_PROFILE_PHOTO } }
        );

        const annoncesResult = await Annonce.updateMany(
            { auteurPhoto: { $regex: LEGACY_UI_AVATAR_REGEX } },
            { $set: { auteurPhoto: DEFAULT_PROFILE_PHOTO } }
        );

        console.log('Legacy avatar migration completed.');
        console.log(`Users matched: ${usersResult.matchedCount}, updated: ${usersResult.modifiedCount}`);
        console.log(`Annonces matched: ${annoncesResult.matchedCount}, updated: ${annoncesResult.modifiedCount}`);
    } catch (error) {
        console.error('Legacy avatar migration failed:', error);
        process.exitCode = 1;
    } finally {
        await disconnectDB();
    }
}

void run();
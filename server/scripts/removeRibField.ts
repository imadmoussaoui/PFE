import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../db';
import User from '../models/User';

dotenv.config();

async function run() {
    try {
        await connectDB();

        const result = await User.updateMany(
            { rib: { $exists: true } },
            { $unset: { rib: 1 } }
        );

        console.log('RIB field removal completed.');
        console.log(`Users matched: ${result.matchedCount}, updated: ${result.modifiedCount}`);
    } catch (error) {
        console.error('RIB field removal failed:', error);
        process.exitCode = 1;
    } finally {
        await disconnectDB();
    }
}

void run();
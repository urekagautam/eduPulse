import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';
import { seedDefaultAdmin } from './seedAdmin.js';

const connectDB = async () => {
    try {
        const baseUri = process.env.MONGODB_URI || '';
        if (!baseUri) throw new Error('MONGODB_URI is not configured');
        if (!DB_NAME || /[\\/?.#\s]/.test(DB_NAME)) {
            throw new Error('DB_NAME must be a valid MongoDB database name');
        }

        // DB_NAME is the sole database selector. Replace an existing URI path
        // instead of appending another database name to it.
        const uri = new URL(baseUri);
        uri.pathname = `/${DB_NAME}`;
        const connectionInstance = await mongoose.connect(uri.toString());
        await seedDefaultAdmin();
        console.log('Connected to MongoDB');
        console.log(`\n Mongodb connected ! DB Host : ${connectionInstance.connection.host} \n`);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

export default connectDB;

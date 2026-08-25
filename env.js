// Loads .env into process.env before anything else imports the Supabase client.
// Imported first in server.js so ESM evaluates it before the api/* handlers.
import dotenv from 'dotenv';
dotenv.config();

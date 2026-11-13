/**
 * Cloud sync configuration.
 *
 * Set these in a `.env` file (see `.env.example`) or as GitHub Actions
 * variables. The publishable/anon key is safe to ship in the app — every
 * table is protected by Row Level Security (see supabase/schema.sql).
 * If they are empty the app runs fully offline.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

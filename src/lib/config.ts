/**
 * Cloud sync configuration.
 *
 * The values below are this project's Supabase URL and *publishable* key. They are
 * public by design (they ship inside every web/app build anyway); all data is
 * protected by Row Level Security — see supabase/schema.sql.
 *
 * To point a fork at your own Supabase project, set EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_KEY in `.env` (they override these defaults).
 * Never put a secret / service-role key here.
 */
const DEFAULT_URL = 'https://nqfeatwftlewcxydppvn.supabase.co';
const DEFAULT_KEY = 'sb_publishable_ILP40AlfiQShZbQO00e_OA_YI5oq6FX';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || DEFAULT_KEY;

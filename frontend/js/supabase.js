import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xwtyfuktmmoioobnatzb.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3dHlmdWt0bW1vaW9vYm5hdHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDIxNzUsImV4cCI6MjA4ODExODE3NX0.C3cF7aOGmbkfDfB728pWDu5mHDLPQEOl3mp3ZQg7S3s';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and Key must be provided in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

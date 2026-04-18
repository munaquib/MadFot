import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ieauimziqompyevwrxwo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllYXVpbXppcW9tcHlldndyeHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MDU2NDYsImV4cCI6MjA5MTQ4MTY0Nn0.p5uVLnld2d8PqX-1qXtXd57-MBI-bOYBKf_139weUPA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

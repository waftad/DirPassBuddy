import { Application } from '@nativescript/core';
import { initializeSupabase } from './services/supabase';

// Initialize Supabase client
initializeSupabase();

Application.run({ moduleName: 'app-root' });
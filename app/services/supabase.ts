import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const Tables = {
  USERS: 'users',
  PASSES: 'passes',
  TRAIL_CHECKINS: 'trail_checkins',
  PRODUCTS: 'products',
  CLASSIFIEDS: 'classifieds',
  RATINGS: 'ratings',
  ORDERS: 'orders'
};

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export { Tables }

export { getCurrentUser, signOut }
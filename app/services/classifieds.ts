import { supabase, Tables } from './supabase';

export class ClassifiedsService {
  async createListing(listing: any) {
    const { data, error } = await supabase
      .from(Tables.CLASSIFIEDS)
      .insert(listing);

    if (error) throw error;
    return data;
  }

  async getListings() {
    const { data, error } = await supabase
      .from(Tables.CLASSIFIEDS)
      .select(`
        *,
        users (
          id,
          name,
          rating
        )
      `);

    if (error) throw error;
    return data;
  }

  async rateUser(userId: string, rating: number, comment: string) {
    const { data, error } = await supabase
      .from(Tables.RATINGS)
      .insert({
        user_id: userId,
        rating,
        comment,
        created_at: new Date()
      });

    if (error) throw error;
    return data;
  }
}
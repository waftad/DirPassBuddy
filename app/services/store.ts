import { supabase, Tables } from './supabase';

export class StoreService {
  async getProducts() {
    const { data, error } = await supabase
      .from(Tables.PRODUCTS)
      .select('*');
    
    if (error) throw error;
    return data;
  }

  async updateInventory(productId: string, quantity: number) {
    const { data, error } = await supabase
      .from(Tables.PRODUCTS)
      .update({ stock: quantity })
      .eq('id', productId);

    if (error) throw error;
    return data;
  }

  async createOrder(userId: string, items: any[]) {
    const { data, error } = await supabase
      .from(Tables.ORDERS)
      .insert({
        user_id: userId,
        items,
        status: 'pending',
        order_date: new Date()
      });

    if (error) throw error;
    return data;
  }
}
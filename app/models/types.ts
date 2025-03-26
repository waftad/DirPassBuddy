export interface User {
  id: string;
  email: string;
  name: string;
  profile_picture?: string;
  rating: number;
}

export interface Pass {
  id: string;
  type: 'day' | 'week' | 'month' | 'season';
  price: number;
  active: boolean;
  user_id: string;
  purchase_date: Date;
  expiry_date: Date;
}

export interface TrailCheckIn {
  id: string;
  user_id: string;
  check_in_time: Date;
  check_out_time?: Date;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
}

export interface Classified {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  created_at: Date;
}
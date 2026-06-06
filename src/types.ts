export type Category = 'protein' | 'accompaniment' | 'potato' | 'garnish' | 'extra' | 'pastel' | 'beverage';
export type Period = 'lunch' | 'dinner';

export interface MenuItem {
  id: string;
  name: string;
  category: Category;
  description?: string;
  imageUrl?: string;
}

export interface DailyMenu {
  id: string; // date_period
  date: string; // YYYY-MM-DD
  period: Period;
  items: MenuItem[];
  status: 'open' | 'closed';
  isComboEnabled?: boolean;
}

export interface Order {
  id?: string;
  userUid?: string;
  userName: string;
  sector: string;
  items: string[];
  period: Period;
  date: string;
  timestamp: any;
  observation?: string;
  status?: 'active' | 'archived';
  deliveryType?: 'entrega' | 'retirada';
}

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  isApproved: boolean;
}

export const SECTORS = [
  'Armazém',
  'Balança',
  'Escritório'
];

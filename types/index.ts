export type Customer = {
  id: string;
  owner_id: string;
  code: number;
  name: string;
  phone: string | null;
  whatsapp_enabled: boolean;
  notes: string | null;
  default_rate: number;
  advance_balance: number;
  created_at: string;
};

export type Entry = {
  id: string;
  owner_id: string;
  customer_id: string;
  entry_date: string;           // yyyy-mm-dd
  morning_litres: number;
  evening_litres: number;
  biscuit_qty: number;
  biscuit_amount: number;
  thivanam_qty: number;
  thivanam_amount: number;
  advance_amount: number;
  created_at: string;
};

export type Inventory = {
  id: string;
  owner_id: string;
  item_type: 'thivanam' | 'biscuit';
  current_stock: number;
  unit: string;
  low_stock_alert: number;
};

export type UserSettings = {
  owner_id: string;
  language: 'ta' | 'en';
  admin_email: string | null;
  shop_name: string;
  shop_name_ta: string;
  default_milk_rate: number;
};

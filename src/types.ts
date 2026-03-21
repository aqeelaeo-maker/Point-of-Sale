export type Product = {
  id: number;
  name: string;
  barcode: string;
  unit: 'kg' | 'liter' | 'piece';
  cost_price: number;
  price_per_unit: number;
  stock: number;
  batch_number: string;
  expiry_date: string;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  loan_balance: number;
};

export type Vendor = {
  id: number;
  name: string;
  phone: string;
  balance: number;
};

export type SaleItem = {
  product_id: number;
  quantity: number;
  cost_price: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
  unit?: string;
};

export type Sale = {
  id?: number;
  customer_id: number | null;
  total_amount: number;
  paid_amount: number;
  date?: string;
  items: SaleItem[];
  customer?: Customer;
};

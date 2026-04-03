export type Product = {
  id: string;
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
  id: string;
  name: string;
  phone: string;
  loan_balance: number;
};

export type Vendor = {
  id: string;
  name: string;
  phone: string;
  balance: number;
};

export type SaleItem = {
  product_id: string;
  quantity: number;
  cost_price: number;
  unit_price: number;
  total_price: number;
  product_name?: string;
  unit?: string;
};

export type Sale = {
  id?: string;
  customer_id: string | null;
  total_amount: number;
  paid_amount: number;
  previous_loan?: number;
  total_due?: number;
  date?: string;
  items: SaleItem[];
  customer?: Customer;
};

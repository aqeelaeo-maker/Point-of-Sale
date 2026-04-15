export type Product = {
  id: string;
  name: string;
  barcode: string;
  unit: string;
  cost_price: number;
  price_per_unit: number;
  stock: number;
  batch_number: string;
  expiry_date: string;
  has_sub_unit?: boolean;
  sub_unit?: string;
  conversion_rate?: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address?: string;
  loan_balance: number;
};

export type Vendor = {
  id: string;
  name: string;
  phone: string;
  address?: string;
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
  is_sub_unit?: boolean;
  stock_deduction?: number;
};

export type Sale = {
  id?: string;
  invoice_number?: string;
  customer_id: string | null;
  total_amount: number;
  paid_amount: number;
  previous_loan?: number;
  total_due?: number;
  date?: string;
  items: SaleItem[];
  customer?: Customer;
};

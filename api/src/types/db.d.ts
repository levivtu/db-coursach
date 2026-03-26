export type UserRole = 'buyer' | 'employee';

export interface Authors {
  id: number;
  name: string;
  biography: string | null;
}

export interface Genres {
  id: number;
  title: string;
  description: string | null;
}

export interface Publishers {
  id: number;
  title: string;
  description: string | null;
}

export interface Books {
  id: number;
  isbn: string | null;
  title: string;
  description: string | null;
  price: number;
  stock_amount: number;
  author_id: number;
  genre_id: number;
  publisher_id: number;
}

export interface Users {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  user_role: UserRole;
}

export interface Buyers {
  id: number;
  user_id: number;
}

export interface Employees {
  id: number;
  user_id: number;
}

export interface Discounts {
  book_id: number;
  discount_value: number;
}

export interface Carts {
  id: number;
  buyer_id: number;
  total_price: number;
}

export interface CartsContents {
  cart_id: number;
  book_id: number;
  amount: number;
}

export interface Orders {
  id: number;
  buyer_id: number;
  total_price: number;
  created_at: Date;
}

export interface OrdersContents {
  id: number;
  order_id: number;
  book_id: number;
  amount: number;
  price_per_book: number;
}

export interface Returns {
  id: number;
  order_id: number;
  reason: string;
  returned_price: number;
  created_at: Date;
}

export interface ReturnsContents {
  return_id: number;
  order_content_id: number;
}

export interface QueryLogs {
  id: number;
  is_successful: boolean;
  query_text: string;
  user_id: number | null;
}

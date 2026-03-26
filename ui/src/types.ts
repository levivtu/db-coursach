export interface User {
  id: number;
  name: string;
  email: string;
  user_role: string;
}

export interface Book {
  id: number;
  isbn: string;
 title: string;
  description: string;
  price: number;
  stock_amount: number;
  author_id: number;
  genre_id: number;
  publisher_id: number;
  author_name: string;
  genre_title: string;
  publisher_title: string;
}

export interface CartItem {
  book_id: number;
  title: string;
  price: number;
  amount: number;
}

export interface Cart {
  id: number;
  buyer_id: number;
  contents: CartItem[];
}

export interface BookFilters {
  page?: number;
  limit?: number;
  authorId?: number | string;
  genreId?: number | string;
  publisherId?: number | string;
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { executeQueryWithLogging } from 'src/db';
import { Carts } from 'src/types/db';

@Injectable()
export class CartsService {
  async findByUserId(userId: number) {
    const result = await executeQueryWithLogging(
      `
      SELECT c.*, cc.id as content_id, cc.cart_id, cc.book_id, cc.amount, b.title, b.price
      FROM buyers b_user
      JOIN carts c ON b_user.id = c.buyer_id
      LEFT JOIN carts_contents cc ON c.id = cc.cart_id
      LEFT JOIN books b ON cc.book_id = b.id
      WHERE b_user.user_id = $1
      `,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException('Only buyers can access carts');
    }

    const cart = result.rows[0] as Carts;
    // If there are no contents, return cart with empty contents array
    if (!result.rows[0].content_id) {
      return {
        ...cart,
        contents: [],
      };
    }

    // Define type for the joined result
    interface CartWithContentsRow {
      id: number;
      buyer_id: number;
      total_price: number;
      content_id: number | null;
      cart_id: number | null;
      book_id: number | null;
      amount: number | null;
      title: string | null;
      price: number | null;
    }

    // Group the results to separate cart info from contents
    const contents = (result.rows as CartWithContentsRow[])
      .map((row) => ({
        id: row.content_id,
        cart_id: row.cart_id,
        book_id: row.book_id,
        amount: row.amount,
        title: row.title,
        price: row.price,
      }))
      .filter((content) => content.id !== null); // Filter out the main cart row if it appears

    return {
      ...cart,
      contents: contents,
    };
  }

  async addBookToCart(userId: number, bookId: number, amount: number) {
    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can access carts');
    }

    const buyerId = buyerResult.rows[0].id;

    const cartResult = await executeQueryWithLogging(
      'SELECT id FROM carts WHERE buyer_id = $1',
      [buyerId],
    );

    if (cartResult.rows.length === 0) {
      throw new NotFoundException('Cart not found');
    }

    const cartId = cartResult.rows[0].id;

    const bookResult = await executeQueryWithLogging(
      'SELECT stock_amount FROM books WHERE id = $1',
      [bookId],
    );

    if (bookResult.rows.length === 0) {
      throw new NotFoundException('Book not found');
    }

    if (bookResult.rows[0].stock_amount < amount) {
      throw new Error('Insufficient stock for this book');
    }

    const existingCartItem = await executeQueryWithLogging(
      'SELECT amount FROM carts_contents WHERE cart_id = $1 AND book_id = $2',
      [cartId, bookId],
    );

    let newAmount;
    if (existingCartItem.rows.length > 0) {
      newAmount = existingCartItem.rows[0].amount + amount;
      if (bookResult.rows[0].stock_amount < newAmount) {
        throw new Error('Adding this amount would exceed available stock');
      }

      await executeQueryWithLogging(
        'UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3',
        [newAmount, cartId, bookId],
      );
    } else {
      await executeQueryWithLogging(
        'INSERT INTO carts_contents (cart_id, book_id, amount) VALUES ($1, $2, $3)',
        [cartId, bookId, amount],
      );
    }

    return { message: 'Book added to cart successfully' };
  }

  async removeBookFromCart(userId: number, bookId: number, amount: number) {
    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can access carts');
    }

    const buyerId = buyerResult.rows[0].id;

    const cartResult = await executeQueryWithLogging(
      'SELECT id FROM carts WHERE buyer_id = $1',
      [buyerId],
    );

    if (cartResult.rows.length === 0) {
      throw new NotFoundException('Cart not found');
    }

    const cartId = cartResult.rows[0].id;

    const cartItemResult = await executeQueryWithLogging(
      'SELECT amount FROM carts_contents WHERE cart_id = $1 AND book_id = $2',
      [cartId, bookId],
    );

    if (cartItemResult.rows.length === 0) {
      throw new NotFoundException('Book not found in cart');
    }

    const currentAmount = cartItemResult.rows[0].amount;
    const newAmount = currentAmount - amount;

    if (newAmount <= 0) {
      await executeQueryWithLogging(
        'DELETE FROM carts_contents WHERE cart_id = $1 AND book_id = $2',
        [cartId, bookId],
      );
    } else {
      await executeQueryWithLogging(
        'UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3',
        [newAmount, cartId, bookId],
      );
    }

    return { message: 'Book removed from cart successfully' };
  }

  async updateBookAmount(userId: number, bookId: number, amount: number) {
    if (amount <= 0) {
      return this.removeBookFromCart(userId, bookId, amount);
    }

    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can access carts');
    }

    const buyerId = buyerResult.rows[0].id;

    const cartResult = await executeQueryWithLogging(
      'SELECT id FROM carts WHERE buyer_id = $1',
      [buyerId],
    );

    if (cartResult.rows.length === 0) {
      throw new NotFoundException('Cart not found');
    }

    const cartId = cartResult.rows[0].id;

    const bookResult = await executeQueryWithLogging(
      'SELECT stock_amount FROM books WHERE id = $1',
      [bookId],
    );

    if (bookResult.rows.length === 0) {
      throw new NotFoundException('Book not found');
    }

    if (bookResult.rows[0].stock_amount < amount) {
      throw new Error('Insufficient stock for this book');
    }

    await executeQueryWithLogging(
      'UPDATE carts_contents SET amount = $1 WHERE cart_id = $2 AND book_id = $3',
      [amount, cartId, bookId],
    );

    return { message: 'Cart updated successfully' };
  }

  async clearCart(userId: number) {
    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can access carts');
    }

    const buyerId = buyerResult.rows[0].id;

    const cartResult = await executeQueryWithLogging(
      'SELECT id FROM carts WHERE buyer_id = $1',
      [buyerId],
    );

    if (cartResult.rows.length === 0) {
      throw new NotFoundException('Cart not found');
    }

    const cartId = cartResult.rows[0].id;

    await executeQueryWithLogging(
      'DELETE FROM carts_contents WHERE cart_id = $1',
      [cartId],
    );

    return { message: 'Cart cleared successfully' };
  }
}

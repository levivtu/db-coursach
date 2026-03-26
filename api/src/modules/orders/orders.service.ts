import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { executeQueryWithLogging } from 'src/db';
import { Orders } from 'src/types/db';

@Injectable()
export class OrdersService {
  constructor() {}

  async findAllByUserId(userId: number) {
    const ordersResult = await executeQueryWithLogging(
      `
      SELECT 
        o.*,
        oc.id as content_id,
        oc.order_id,
        oc.book_id,
        oc.amount,
        oc.price_per_book,
        b.title,
        b.price as book_price
      FROM buyers b_user
      JOIN orders o ON b_user.id = o.buyer_id
      LEFT JOIN orders_contents oc ON o.id = oc.order_id
      LEFT JOIN books b ON oc.book_id = b.id
      WHERE b_user.user_id = $1
      ORDER BY o.created_at DESC
      `,
      [userId],
    );

    if (ordersResult.rows.length === 0) {
      return [];
    }

    // Define type for the joined result
    interface OrderWithContentsRow {
      id: number;
      buyer_id: number;
      total_price: number;
      created_at: string;
      content_id: number | null;
      order_id: number | null;
      book_id: number | null;
      amount: number | null;
      price_per_book: number | null;
      title: string | null;
      book_price: number | null;
    }

    // Group the results by order ID
    const ordersMap = new Map<
      number,
      {
        id: number;
        buyer_id: number;
        total_price: number;
        created_at: string;
        contents: any[];
      }
    >();

    for (const row of ordersResult.rows as OrderWithContentsRow[]) {
      if (!ordersMap.has(row.id)) {
        // Create a new order entry
        ordersMap.set(row.id, {
          id: row.id,
          buyer_id: row.buyer_id,
          total_price: row.total_price,
          created_at: row.created_at,
          contents: [],
        });
      }

      // Add content if it exists (if not a row where content fields are null)
      if (row.content_id) {
        const order = ordersMap.get(row.id)!;
        order.contents.push({
          id: row.content_id,
          order_id: row.order_id,
          book_id: row.book_id,
          amount: row.amount,
          price_per_book: row.price_per_book,
          title: row.title,
          price: row.book_price,
        });
      }
    }

    return Array.from(ordersMap.values()).map((order) => ({
      ...order,
      created_at: new Date(order.created_at), // Convert string to Date
    })) as Orders[];
  }

  async findAll() {
    const ordersResult = await executeQueryWithLogging(`
      SELECT 
        o.*,
        u.name as buyer_name,
        b.id as buyer_id
      FROM orders o
      JOIN buyers b ON o.buyer_id = b.id
      JOIN users u on b.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    const orders = ordersResult.rows;

    const ordersWithContents: any[] = [];
    for (const order of orders) {
      const contentsResult = await executeQueryWithLogging(
        `
        SELECT oc.*, b.title, b.price
        FROM orders_contents oc
        JOIN books b ON oc.book_id = b.id
        WHERE oc.order_id = $1
      `,
        [Number(order.id)],
      );

      ordersWithContents.push({
        ...order,
        contents: contentsResult.rows,
      });
    }

    return ordersWithContents as Orders[];
  }

  async findById(orderId: number, userId: number) {
    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can access orders');
    }

    const buyerId = buyerResult.rows[0].id;

    const orderResult = await executeQueryWithLogging(
      `
      SELECT * FROM orders WHERE id = $1 AND buyer_id = $2
    `,
      [orderId, buyerId],
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundException('Order not found');
    }

    const order = orderResult.rows[0] as Orders;

    const contentsResult = await executeQueryWithLogging(
      `
      SELECT oc.*, b.title, b.price
      FROM orders_contents oc
      JOIN books b ON oc.book_id = b.id
      WHERE oc.order_id = $1
    `,
      [order.id],
    );

    return {
      ...order,
      contents: contentsResult.rows,
    };
  }

  async findByIdForEmployee(orderId: number) {
    const orderResult = await executeQueryWithLogging(
      `
      SELECT * FROM orders WHERE id = $1
    `,
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundException('Order not found');
    }

    const order = orderResult.rows[0] as Orders;

    const contentsResult = await executeQueryWithLogging(
      `
      SELECT oc.*, b.title, b.price
      FROM orders_contents oc
      JOIN books b ON oc.book_id = b.id
      WHERE oc.order_id = $1
    `,
      [order.id],
    );

    return {
      ...order,
      contents: contentsResult.rows,
    };
  }

  async createOrderFromCart(userId: number) {
    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can create orders');
    }

    const buyerId = buyerResult.rows[0].id;

    const cartResult = await executeQueryWithLogging(
      'SELECT * FROM carts WHERE buyer_id = $1',
      [buyerId],
    );

    if (cartResult.rows.length === 0) {
      throw new NotFoundException('Cart not found');
    }

    const cart = cartResult.rows[0];

    const cartContentsResult = await executeQueryWithLogging(
      'SELECT * FROM carts_contents WHERE cart_id = $1',
      [cart.id],
    );

    if (cartContentsResult.rows.length === 0) {
      throw new Error('Cannot create order from empty cart');
    }

    await executeQueryWithLogging('BEGIN');

    try {
      const orderResult = await executeQueryWithLogging(
        `
        INSERT INTO orders (buyer_id, total_price, created_at)
        VALUES ($1, $2, NOW())
        RETURNING *
      `,
        [buyerId, cart.total_price],
      );

      const order = orderResult.rows[0] as Orders;
      const orderId = order.id;

      for (const item of cartContentsResult.rows) {
        const bookResult = await executeQueryWithLogging(
          'SELECT price, stock_amount FROM books WHERE id = $1',
          [item.book_id],
        );

        if (bookResult.rows.length === 0) {
          throw new NotFoundException(`Book with ID ${item.book_id} not found`);
        }

        const book = bookResult.rows[0];

        if (book.stock_amount < item.amount) {
          throw new Error(`Insufficient stock for book ID ${item.book_id}`);
        }

        await executeQueryWithLogging(
          `
          INSERT INTO orders_contents (order_id, book_id, amount, price_per_book)
          VALUES ($1, $2, $3, $4)
        `,
          [orderId, item.book_id, item.amount, book.price],
        );

        await executeQueryWithLogging(
          'UPDATE books SET stock_amount = stock_amount - $1 WHERE id = $2',
          [item.amount, item.book_id],
        );
      }

      await executeQueryWithLogging(
        'DELETE FROM carts_contents WHERE cart_id = $1',
        [cart.id],
      );

      await executeQueryWithLogging('COMMIT');

      const contentsResult = await executeQueryWithLogging(
        `
        SELECT oc.*, b.title, b.price
        FROM orders_contents oc
        JOIN books b ON oc.book_id = b.id
        WHERE oc.order_id = $1
      `,
        [orderId],
      );

      return {
        ...order,
        contents: contentsResult.rows,
      };
    } catch (error) {
      await executeQueryWithLogging('ROLLBACK');
      throw error;
    }
  }

  async cancelOrder(orderId: number, userId: number) {
    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can cancel orders');
    }

    const buyerId = buyerResult.rows[0].id;

    const orderResult = await executeQueryWithLogging(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [orderId, buyerId],
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundException('Order not found');
    }

    const order = orderResult.rows[0];

    const returnResult = await executeQueryWithLogging(
      'SELECT id FROM returns WHERE order_id = $1',
      [orderId],
    );

    if (returnResult.rows.length > 0) {
      throw new Error('Cannot cancel order that has returns');
    }

    await executeQueryWithLogging('BEGIN');

    try {
      const contentsResult = await executeQueryWithLogging(
        'SELECT book_id, amount FROM orders_contents WHERE order_id = $1',
        [orderId],
      );

      for (const item of contentsResult.rows) {
        await executeQueryWithLogging(
          'UPDATE books SET stock_amount = stock_amount + $1 WHERE id = $2',
          [item.amount, item.book_id],
        );
      }

      await executeQueryWithLogging(
        'DELETE FROM orders_contents WHERE order_id = $1',
        [orderId],
      );

      await executeQueryWithLogging('DELETE FROM orders WHERE id = $1', [
        orderId,
      ]);

      await executeQueryWithLogging('COMMIT');

      return { message: 'Order cancelled successfully' };
    } catch (error) {
      await executeQueryWithLogging('ROLLBACK');
      throw error;
    }
  }
}

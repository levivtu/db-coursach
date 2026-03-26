import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { executeQueryWithLogging } from 'src/db';
import { Orders, Returns, ReturnsContents } from 'src/types/db';

@Injectable()
export class ReturnsService {
  async findAllByUserId(userId: number) {
    const returnsResult = await executeQueryWithLogging(
      `
      SELECT 
        r.*,
        o.created_at as order_date,
        rc.id as content_id,
        rc.return_id,
        rc.order_content_id,
        oc.book_id,
        oc.amount as original_amount,
        oc.price_per_book,
        b.title
      FROM buyers b_user
      JOIN orders o ON b_user.id = o.buyer_id
      JOIN returns r ON o.id = r.order_id
      LEFT JOIN returns_contents rc ON r.id = rc.return_id
      LEFT JOIN orders_contents oc ON rc.order_content_id = oc.id
      LEFT JOIN books b ON oc.book_id = b.id
      WHERE b_user.user_id = $1
      ORDER BY r.created_at DESC
      `,
      [userId],
    );

    if (returnsResult.rows.length === 0) {
      return [];
    }

    // Define type for the joined result
    interface ReturnWithContentsRow {
      id: number;
      order_id: number;
      reason: string;
      returned_price: number;
      created_at: string;
      order_date: string;
      content_id: number | null;
      return_id: number | null;
      order_content_id: number | null;
      book_id: number | null;
      original_amount: number | null;
      price_per_book: number | null;
      title: string | null;
    }

    // Group the results by return ID
    const returnsMap = new Map<number, any>();

    for (const row of returnsResult.rows as ReturnWithContentsRow[]) {
      if (!returnsMap.has(row.id)) {
        returnsMap.set(row.id, {
          ...row,
          contents: [],
        });

        // Remove content-specific fields from the main return object
        const returnObj = returnsMap.get(row.id);
        delete returnObj.content_id;
        delete returnObj.return_id;
        delete returnObj.order_content_id;
        delete returnObj.book_id;
        delete returnObj.original_amount;
        delete returnObj.price_per_book;
        delete returnObj.title;
      }

      // Add content if it exists
      if (row.content_id) {
        const returnObj = returnsMap.get(row.id);
        returnObj.contents.push({
          id: row.content_id,
          return_id: row.return_id,
          order_content_id: row.order_content_id,
          book_id: row.book_id,
          original_amount: row.original_amount,
          price_per_book: row.price_per_book,
          title: row.title,
        });
      }
    }

    return Array.from(returnsMap.values()) as (Returns & {
      contents: ReturnsContents[];
    })[];
  }

  async findAll() {
    const returnsResult = await executeQueryWithLogging(`
      SELECT r.*, o.created_at as order_date
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      ORDER BY r.created_at DESC
    `);

    const returns = returnsResult.rows as Returns[];

    const returnsWithContents: (Returns & { contents: ReturnsContents[] })[] =
      [];
    for (const ret of returns) {
      const contentsResult = await executeQueryWithLogging(
        `
        SELECT rc.*, oc.book_id, oc.amount as original_amount, oc.price_per_book, b.title
        FROM returns_contents rc
        JOIN orders_contents oc ON rc.order_content_id = oc.id
        JOIN books b ON oc.book_id = b.id
        WHERE rc.return_id = $1
      `,
        [ret.id],
      );

      returnsWithContents.push({
        ...ret,
        contents: contentsResult.rows,
      });
    }

    return returnsWithContents;
  }

  async findById(returnId: number, userId: number) {
    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can access returns');
    }

    const buyerId = buyerResult.rows[0].id;

    const returnResult = await executeQueryWithLogging(
      `
      SELECT r.*, o.created_at as order_date
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      WHERE r.id = $1
    `,
      [returnId],
    );

    if (returnResult.rows.length === 0) {
      throw new NotFoundException('Return not found');
    }

    const ret = returnResult.rows[0] as Returns;

    const orderResult = await executeQueryWithLogging(
      'SELECT id FROM orders WHERE id = $1 AND buyer_id = $2',
      [ret.order_id, buyerId],
    );

    if (orderResult.rows.length === 0) {
      throw new ForbiddenException(
        'Return does not belong to the current user',
      );
    }

    const contentsResult = await executeQueryWithLogging(
      `
      SELECT rc.*, oc.book_id, oc.amount as original_amount, oc.price_per_book, b.title
      FROM returns_contents rc
      JOIN orders_contents oc ON rc.order_content_id = oc.id
      JOIN books b ON oc.book_id = b.id
      WHERE rc.return_id = $1
    `,
      [ret.id],
    );

    return {
      ...ret,
      contents: contentsResult.rows,
    };
  }

  async findByIdForEmployee(returnId: number) {
    const returnResult = await executeQueryWithLogging(
      `
      SELECT r.*, o.created_at as order_date
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      WHERE r.id = $1
    `,
      [returnId],
    );

    if (returnResult.rows.length === 0) {
      throw new NotFoundException('Return not found');
    }

    const ret = returnResult.rows[0] as Returns;

    const contentsResult = await executeQueryWithLogging(
      `
      SELECT rc.*, oc.book_id, oc.amount as original_amount, oc.price_per_book, b.title
      FROM returns_contents rc
      JOIN orders_contents oc ON rc.order_content_id = oc.id
      JOIN books b ON oc.book_id = b.id
      WHERE rc.return_id = $1
    `,
      [ret.id],
    );

    return {
      ...ret,
      contents: contentsResult.rows,
    };
  }

  async create(
    userId: number,
    orderId: number,
    reason: string,
    bookIds: number[],
    amounts: number[],
  ) {
    if (!bookIds || !amounts || bookIds.length !== amounts.length) {
      throw new Error('Book IDs and amounts arrays must have the same length');
    }

    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can create returns');
    }

    const buyerId = buyerResult.rows[0].id;

    const orderResult = await executeQueryWithLogging(
      'SELECT * FROM orders WHERE id = $1 AND buyer_id = $2',
      [orderId, buyerId],
    );

    if (orderResult.rows.length === 0) {
      throw new NotFoundException(
        'Order not found or does not belong to the current user',
      );
    }

    const order = orderResult.rows[0];

    for (let i = 0; i < bookIds.length; i++) {
      const bookId = bookIds[i];
      const amount = amounts[i];

      const orderContentResult = await executeQueryWithLogging(
        'SELECT id, amount FROM orders_contents WHERE order_id = $1 AND book_id = $2',
        [orderId, bookId],
      );

      if (orderContentResult.rows.length === 0) {
        throw new Error(
          `Book with ID ${bookId} is not part of order ${orderId}`,
        );
      }

      const orderContent = orderContentResult.rows[0];
      if (amount > orderContent.amount) {
        throw new Error(
          `Return amount ${amount} exceeds ordered amount ${orderContent.amount} for book ${bookId}`,
        );
      }
    }

    await executeQueryWithLogging('BEGIN');

    try {
      const returnResult = await executeQueryWithLogging(
        `
        INSERT INTO returns (order_id, reason, returned_price, created_at)
        VALUES ($1, $2, 0, NOW())  -- Price will be calculated by trigger
        RETURNING *
      `,
        [orderId, reason],
      );

      const ret = returnResult.rows[0];
      const returnId = ret.id;

      for (let i = 0; i < bookIds.length; i++) {
        const bookId = bookIds[i];

        const orderContentResult = await executeQueryWithLogging(
          'SELECT id FROM orders_contents WHERE order_id = $1 AND book_id = $2',
          [orderId, bookId],
        );

        if (orderContentResult.rows.length === 0) {
          throw new Error(
            `Could not find order content for book ${bookId} in order ${orderId}`,
          );
        }

        const orderContentId = orderContentResult.rows[0].id;

        await executeQueryWithLogging(
          `
          INSERT INTO returns_contents (return_id, order_content_id)
          VALUES ($1, $2)
        `,
          [returnId, orderContentId],
        );
      }

      await executeQueryWithLogging('COMMIT');

      return this.findById(returnId, userId) as unknown;
    } catch (error) {
      await executeQueryWithLogging('ROLLBACK');
      throw error;
    }
  }

  async delete(returnId: number, userId: number) {
    const buyerResult = await executeQueryWithLogging(
      'SELECT id FROM buyers WHERE user_id = $1',
      [userId],
    );

    if (buyerResult.rows.length === 0) {
      throw new ForbiddenException('Only buyers can delete returns');
    }

    const buyerId = buyerResult.rows[0].id;

    const returnResult = await executeQueryWithLogging(
      `
      SELECT r.*, o.buyer_id
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      WHERE r.id = $1
    `,
      [returnId],
    );

    if (returnResult.rows.length === 0) {
      throw new NotFoundException('Return not found');
    }

    const ret = returnResult.rows[0];

    if (ret.buyer_id !== buyerId) {
      throw new ForbiddenException(
        'Return does not belong to the current user',
      );
    }

    await executeQueryWithLogging('BEGIN');

    try {
      await executeQueryWithLogging(
        'DELETE FROM returns_contents WHERE return_id = $1',
        [returnId],
      );

      await executeQueryWithLogging('DELETE FROM returns WHERE id = $1', [
        returnId,
      ]);

      await executeQueryWithLogging('COMMIT');

      return { message: 'Return deleted successfully' };
    } catch (error) {
      await executeQueryWithLogging('ROLLBACK');
      throw error;
    }
  }
}

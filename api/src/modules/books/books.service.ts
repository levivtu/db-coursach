import { Injectable } from '@nestjs/common';
import { executeQueryWithLogging } from 'src/db';
import { Books } from 'src/types/db';

export interface BookFilters {
  page?: number;
  limit?: number;
  authorId?: number;
  genreId?: number;
  publisherId?: number;
}

@Injectable()
export class BooksService {
  async findAll(filters: BookFilters = {}) {
    const { page = 1, limit = 10, authorId, genreId, publisherId } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title
      FROM books b
      JOIN authors a ON b.author_id = a.id
      JOIN genres g ON b.genre_id = g.id
      JOIN publishers p ON b.publisher_id = p.id
    `;

    const queryParams: number[] = [];
    let paramIndex = 1;
    let whereClauseAdded = false;

    if (authorId) {
      query += whereClauseAdded ? ' AND' : ' WHERE';
      query += ` b.author_id = $${paramIndex}`;
      queryParams.push(authorId);
      paramIndex++;
      whereClauseAdded = true;
    }

    if (genreId) {
      query += whereClauseAdded ? ' AND' : ' WHERE';
      query += ` b.genre_id = $${paramIndex}`;
      queryParams.push(genreId);
      paramIndex++;
      whereClauseAdded = true;
    }

    if (publisherId) {
      query += whereClauseAdded ? ' AND' : ' WHERE';
      query += ` b.publisher_id = $${paramIndex}`;
      queryParams.push(publisherId);
      paramIndex++;
      whereClauseAdded = true;
    }

    query += ` ORDER BY b.id LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(Number(limit), Number(offset));

    const result = await executeQueryWithLogging(query, queryParams);

    let countQuery = 'SELECT COUNT(*) FROM books b';
    const countParams: number[] = [];
    let countParamIndex = 1;
    let countWhereClauseAdded = false;

    if (authorId) {
      countQuery += countWhereClauseAdded ? ' AND' : ' WHERE';
      countQuery += ` b.author_id = $${countParamIndex}`;
      countParams.push(authorId);
      countParamIndex++;
      countWhereClauseAdded = true;
    }

    if (genreId) {
      countQuery += countWhereClauseAdded ? ' AND' : ' WHERE';
      countQuery += ` b.genre_id = $${countParamIndex}`;
      countParams.push(genreId);
      countParamIndex++;
      countWhereClauseAdded = true;
    }

    if (publisherId) {
      countQuery += countWhereClauseAdded ? ' AND' : ' WHERE';
      countQuery += ` b.publisher_id = $${countParamIndex}`;
      countParams.push(publisherId);
      countParamIndex++;
      countWhereClauseAdded = true;
    }

    const countResult = await executeQueryWithLogging(
      countQuery,
      countParams.map((param) => Number(param)),
    );
    const totalCount = parseInt(countResult.rows[0].count);

    return {
      books: result.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    };
  }

  async findById(id: number) {
    const result = await executeQueryWithLogging(
      `
      SELECT b.*, a.name as author_name, g.title as genre_title, p.title as publisher_title
      FROM books b
      JOIN authors a ON b.author_id = a.id
      JOIN genres g ON b.genre_id = g.id
      JOIN publishers p ON b.publisher_id = p.id
      WHERE b.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error('Book not found');
    }

    return result.rows[0] as Books;
  }

  async create(bookData: any) {
    const {
      isbn,
      title,
      description,
      price,
      stock_amount,
      author_id,
      genre_id,
      publisher_id,
    } = bookData;

    const result = await executeQueryWithLogging(
      `
      INSERT INTO books (isbn, title, description, price, stock_amount, author_id, genre_id, publisher_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        isbn,
        title,
        description,
        price,
        stock_amount,
        author_id,
        genre_id,
        publisher_id,
      ],
    );

    return result.rows[0] as Books;
  }

  async update(id: number, bookData: any) {
    const {
      isbn,
      title,
      description,
      price,
      stock_amount,
      author_id,
      genre_id,
      publisher_id,
    } = bookData;

    const result = await executeQueryWithLogging(
      `
      UPDATE books
      SET isbn = $1, title = $2, description = $3, price = $4, stock_amount = $5, author_id = $6, genre_id = $7, publisher_id = $8
      WHERE id = $9
      RETURNING *
    `,
      [
        isbn,
        title,
        description,
        price,
        stock_amount,
        author_id,
        genre_id,
        publisher_id,
        id,
      ],
    );

    if (result.rows.length === 0) {
      throw new Error('Book not found');
    }

    return result.rows[0] as Books;
  }

  async delete(id: number) {
    const result = await executeQueryWithLogging(
      'DELETE FROM books WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error('Book not found');
    }

    return { message: 'Book deleted successfully', id: result.rows[0].id };
  }
}

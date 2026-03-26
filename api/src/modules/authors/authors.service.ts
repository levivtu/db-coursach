import { Injectable } from '@nestjs/common';
import { Authors } from 'src/types/db';
import { executeQueryWithLogging } from 'src/db';

@Injectable()
export class AuthorsService {
  async findAll() {
    const result = await executeQueryWithLogging(
      'SELECT * FROM authors ORDER BY id',
    );
    return result.rows as Authors[];
  }

  async findById(id: number) {
    const result = await executeQueryWithLogging(
      'SELECT * FROM authors WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error('Author not found');
    }

    return result.rows[0] as Authors;
  }

  async create(authorData: any) {
    const { name, biography } = authorData;

    const result = await executeQueryWithLogging(
      `
      INSERT INTO authors (name, biography)
      VALUES ($1, $2)
      RETURNING *
    `,
      [name, biography],
    );

    return result.rows[0] as Authors;
  }

  async update(id: number, authorData: any) {
    const { name, biography } = authorData;

    const result = await executeQueryWithLogging(
      `
      UPDATE authors
      SET name = $1, biography = $2
      WHERE id = $3
      RETURNING *
    `,
      [name, biography, id],
    );

    if (result.rows.length === 0) {
      throw new Error('Author not found');
    }

    return result.rows[0] as Authors;
  }

  async delete(id: number) {
    const result = await executeQueryWithLogging(
      'DELETE FROM authors WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error('Author not found');
    }

    return { message: 'Author deleted successfully', id: result.rows[0].id };
  }
}

import { Injectable } from '@nestjs/common';
import { executeQueryWithLogging } from 'src/db';
import { Publishers } from 'src/types/db';

@Injectable()
export class PublishersService {
  async findAll() {
    const result = await executeQueryWithLogging(
      'SELECT * FROM publishers ORDER BY id',
    );
    return result.rows as Publishers[];
  }

  async findById(id: number) {
    const result = await executeQueryWithLogging(
      'SELECT * FROM publishers WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error('Publisher not found');
    }

    return result.rows[0] as Publishers;
  }

  async create(publisherData: any) {
    const { title, description } = publisherData;

    const result = await executeQueryWithLogging(
      `
      INSERT INTO publishers (title, description)
      VALUES ($1, $2)
      RETURNING *
    `,
      [title, description],
    );

    return result.rows[0] as Publishers;
  }

  async update(id: number, publisherData: any) {
    const { title, description } = publisherData;

    const result = await executeQueryWithLogging(
      `
      UPDATE publishers
      SET title = $1, description = $2
      WHERE id = $3
      RETURNING *
    `,
      [title, description, id],
    );

    if (result.rows.length === 0) {
      throw new Error('Publisher not found');
    }

    return result.rows[0] as Publishers;
  }

  async delete(id: number) {
    const result = await executeQueryWithLogging(
      'DELETE FROM publishers WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error('Publisher not found');
    }

    return { message: 'Publisher deleted successfully', id: result.rows[0].id };
  }
}

import { Injectable } from '@nestjs/common';
import { executeQueryWithLogging } from 'src/db';
import { Genres } from 'src/types/db';

@Injectable()
export class GenresService {
  async findAll() {
    const result = await executeQueryWithLogging(
      'SELECT * FROM genres ORDER BY id',
    );
    return result.rows as Genres[];
  }

  async findById(id: number) {
    const result = await executeQueryWithLogging(
      'SELECT * FROM genres WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error('Genre not found');
    }

    return result.rows[0] as Genres;
  }

  async create(genreData: any) {
    const { title, description } = genreData;

    const result = await executeQueryWithLogging(
      `
      INSERT INTO genres (title, description)
      VALUES ($1, $2)
      RETURNING *
    `,
      [title, description],
    );

    return result.rows[0] as Genres;
  }

  async update(id: number, genreData: any) {
    const { title, description } = genreData;

    const result = await executeQueryWithLogging(
      `
      UPDATE genres
      SET title = $1, description = $2
      WHERE id = $3
      RETURNING *
    `,
      [title, description, id],
    );

    if (result.rows.length === 0) {
      throw new Error('Genre not found');
    }

    return result.rows[0] as Genres;
  }

  async delete(id: number) {
    const result = await executeQueryWithLogging(
      'DELETE FROM genres WHERE id = $1 RETURNING id',
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error('Genre not found');
    }

    return { message: 'Genre deleted successfully', id: result.rows[0].id };
  }
}

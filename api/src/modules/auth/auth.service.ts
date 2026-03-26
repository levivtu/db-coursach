import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { db, executeQueryWithLogging } from '../../db';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Users } from 'src/types/db';

@Injectable()
export class AuthService {
  private jwtSecret = process.env.JWT_SECRET || 'default_secret_key';

  async register(
    name: string,
    email: string,
    password: string,
    userRole: string,
  ) {
    const existingUser = await executeQueryWithLogging(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = crypto
      .createHash('md5')
      .update(password)
      .digest('hex');

    const result = await executeQueryWithLogging(
      'INSERT INTO users (name, email, password_hash, user_role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, user_role',
      [name, email, passwordHash, userRole],
    );

    const user = result.rows[0] as Users;

    if (userRole === 'buyer') {
      await executeQueryWithLogging(
        'INSERT INTO buyers (user_id) VALUES ($1)',
        [user.id],
      );
    } else if (userRole === 'employee') {
      await executeQueryWithLogging(
        'INSERT INTO employees (user_id) VALUES ($1)',
        [user.id],
      );
    }

    const token = jwt.sign(
      { userId: user.id, userRole: user.user_role },
      this.jwtSecret,
      { expiresIn: '24h' },
    );

    return { user, token };
  }

  async login(email: string, password: string) {
    const passwordHash = crypto
      .createHash('md5')
      .update(password)
      .digest('hex');

    const result = await executeQueryWithLogging(
      'SELECT id, name, email, user_role FROM users WHERE email = $1 AND password_hash = $2',
      [email, passwordHash],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = result.rows[0] as Users;

    const token = jwt.sign(
      { userId: user.id, userRole: user.user_role },
      this.jwtSecret,
      { expiresIn: '24h' },
    );

    return { user, token };
  }

  async deleteAccount(userId: number) {
    await executeQueryWithLogging('DELETE FROM users WHERE id = $1', [userId]);
  }

  async validateUser(userId: number) {
    const result = await executeQueryWithLogging(
      'SELECT id, name, email, user_role FROM users WHERE id = $1',
      [userId],
    );

    return (result.rows[0] as Users) || null;
  }
}

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { executeQueryWithLogging } from 'src/db';
import { readFileSync } from 'fs';
import path from 'path';

const statisticsQueriesBasePath = path.join(
  __dirname,
  '..',
  '..',
  'complex-queries',
);

const totalSalesRevenueQuery = readFileSync(
  path.join(statisticsQueriesBasePath, 'statistics-total-sales-revenue.pgsql'),
  'utf-8',
);

const topSellingBooksQuery = readFileSync(
  path.join(statisticsQueriesBasePath, 'statistics-top-selling-books.pgsql'),
  'utf-8',
);

const averageOrderValueQuery = readFileSync(
  path.join(statisticsQueriesBasePath, 'statistics-average-order-value.pgsql'),
  'utf-8',
);

@Injectable()
export class StatisticsService {
  async getTotalSalesRevenue(startDate: string, endDate: string) {
    const result = await executeQueryWithLogging(totalSalesRevenueQuery, [
      startDate,
      endDate,
    ]);

    const rows = result.rows as any[];
    const totalRevenue =
      rows.length > 0 && rows[0].total_revenue !== null
        ? parseFloat(rows[0].total_revenue)
        : 0;

    const topBuyers = rows
      .filter((row) => row.buyer_id !== null)
      .map((row) => ({
        buyerId: row.buyer_id as number,
        buyerName: row.buyer_name as string,
        totalSpent: parseFloat(row.total_spent as string),
      }));

    return {
      totalRevenue,
      topBuyers,
    };
  }

  async getTopSellingBooks(
    startDate: string,
    endDate: string,
    limitCount: number = 10,
  ) {
    const result = await executeQueryWithLogging(topSellingBooksQuery, [
      startDate,
      endDate,
      limitCount,
    ]);

    return (result.rows as any[]).map((row) => ({
      bookId: row.book_id as number,
      title: row.title as string,
      totalSold: Number(row.total_sold),
      totalRevenue: Number(row.total_revenue),
    }));
  }

  async getAverageOrderValue(startDate: string, endDate: string) {
    const result = await executeQueryWithLogging(averageOrderValueQuery, [
      startDate,
      endDate,
    ]);

    const rows = result.rows as any[];
    const averageOrderValue =
      rows.length > 0 && rows[0].avg_value !== null
        ? parseFloat(rows[0].avg_value)
        : 0;

    const mostPopularBooks = rows
      .filter((row) => row.book_id !== null)
      .map((row) => ({
        bookId: row.book_id as number,
        title: row.title as string,
        totalSold: parseInt(row.total_sold as string, 10),
        totalRevenue: parseFloat(row.total_revenue as string),
      }));

    return {
      averageOrderValue,
      mostPopularBooks,
    };
  }
}

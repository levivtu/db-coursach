import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/apiService';

type TopBuyer = {
  buyerId: number;
  buyerName: string;
  totalSpent: number;
};

type TopBook = {
  bookId: number;
  title: string;
  totalSold: number;
  totalRevenue: number;
};

type SalesRevenueResponse = {
  totalRevenue: number;
  topBuyers: TopBuyer[];
};

type AverageOrderValueResponse = {
  averageOrderValue: number;
  mostPopularBooks: TopBook[];
};

const formatMoney = (value: number) =>
  Number.isFinite(value) ? value.toFixed(2) : '0.00';

const todayAsDateInput = () => new Date().toISOString().slice(0, 10);

const startOfMonthAsDateInput = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const StatisticsDashboard: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(startOfMonthAsDateInput());
  const [endDate, setEndDate] = useState<string>(todayAsDateInput());
  const [limit, setLimit] = useState<number>(10);

  const [salesRevenue, setSalesRevenue] = useState<SalesRevenueResponse | null>(
    null,
  );
  const [topSellingBooks, setTopSellingBooks] = useState<TopBook[]>([]);
  const [averageOrderValue, setAverageOrderValue] =
    useState<AverageOrderValueResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });
    if (limit && limit !== 10) {
      params.set('limit', String(limit));
    }
    return params.toString();
  }, [startDate, endDate, limit]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [sales, topBooks, avg] = await Promise.all([
          apiService.get(`statistics/sales-revenue?${query}`),
          apiService.get(`statistics/top-selling-books?${query}`),
          apiService.get(`statistics/average-order-value?${query}`),
        ]);

        setSalesRevenue(sales as SalesRevenueResponse);
        setTopSellingBooks(topBooks as TopBook[]);
        setAverageOrderValue(avg as AverageOrderValueResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [query]);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Statistics</h2>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'end',
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        <label>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>

        <label>
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>

        <label>
          Top limit
          <input
            type="number"
            min={1}
            max={100}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ marginLeft: '0.5rem', width: '6rem' }}
          />
        </label>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}

      {salesRevenue && (
        <section style={{ marginTop: '1rem' }}>
          <h3>Total sales revenue</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>{formatMoney(salesRevenue.totalRevenue)}</strong>
          </div>

          <h4>Top 10 buyers by spend</h4>
          {salesRevenue.topBuyers?.length ? (
            <ol>
              {salesRevenue.topBuyers.map((b) => (
                <li key={b.buyerId}>
                  {b.buyerName} — {formatMoney(b.totalSpent)}
                </li>
              ))}
            </ol>
          ) : (
            <div>No buyers in this period.</div>
          )}
        </section>
      )}

      <section style={{ marginTop: '1.5rem' }}>
        <h3>Top selling books</h3>
        {topSellingBooks.length ? (
          <ol>
            {topSellingBooks.map((book) => (
              <li key={book.bookId}>
                {book.title} — {book.totalSold} sold (
                {formatMoney(book.totalRevenue)} revenue)
              </li>
            ))}
          </ol>
        ) : (
          <div>No sales in this period.</div>
        )}
      </section>

      {averageOrderValue && (
        <section style={{ marginTop: '1.5rem' }}>
          <h3>Average order value</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>{formatMoney(averageOrderValue.averageOrderValue)}</strong>
          </div>

          <h4>Most popular books bought</h4>
          {averageOrderValue.mostPopularBooks?.length ? (
            <ol>
              {averageOrderValue.mostPopularBooks.map((book) => (
                <li key={book.bookId}>
                  {book.title} — {book.totalSold} sold (
                  {formatMoney(book.totalRevenue)} revenue)
                </li>
              ))}
            </ol>
          ) : (
            <div>No books in this period.</div>
          )}
        </section>
      )}
    </div>
  );
};

export default StatisticsDashboard;


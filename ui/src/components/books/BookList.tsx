import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, BookFilters } from '../../types';
import { API_BASE_URL } from '../../config/api';

interface Author {
  id: number;
  name: string;
}

interface Publisher {
  id: number;
  title: string;
}

interface Genre {
  id: number;
  title: string;
}

const BookList: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [filters, setFilters] = useState<BookFilters>({ page: 1, limit: 10 });
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch books when filters change
  useEffect(() => {
    fetchBooks();
  }, [filters]);

  // Fetch authors, publishers, and genres on component mount
  useEffect(() => {
    fetchAuthors();
    fetchPublishers();
    fetchGenres();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', filters.page?.toString() || '1');
      params.append('limit', filters.limit?.toString() || '10');
      
      if (filters.authorId !== undefined && filters.authorId !== null && filters.authorId !== '') params.append('authorId', filters.authorId.toString());
      if (filters.genreId !== undefined && filters.genreId !== null && filters.genreId !== '') params.append('genreId', filters.genreId.toString());
      if (filters.publisherId !== undefined && filters.publisherId !== null && filters.publisherId !== '') params.append('publisherId', filters.publisherId.toString());
      
      const response = await fetch(`${API_BASE_URL}/books?${params}`);
      const data = await response.json();
      
      setBooks(data.books);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/authors`);
      const data = await response.json();
      setAuthors(data);
    } catch (error) {
      console.error('Error fetching authors:', error);
    }
  };

  const fetchPublishers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/publishers`);
      const data = await response.json();
      setPublishers(data);
    } catch (error) {
      console.error('Error fetching publishers:', error);
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/genres`);
      const data = await response.json();
      setGenres(data);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  // Use useCallback-like approach to prevent unnecessary re-renders
  const handleFilterChange = (filterName: keyof BookFilters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePerPageChange = (value: number) => {
    setFilters(prev => ({
      ...prev,
      limit: value,
      page: 1 // Reset to first page when per-page changes
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setFilters(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };

  const resetFilters = () => {
    setFilters({ page: 1, limit: 10 }); // Reset to default filters
    setSearchTerm(''); // Clear search term
  };

  const generateCoverColor = (id: number): string => {
    return "#ff6743";
  };

  if (loading) {
    return <div>Loading books...</div>;
  }

  return (
    <div>
      <h2>Book List</h2>
      
      {/* Search and Filter Controls */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Search books..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Author:</label>
            <select
              value={filters.authorId ?? ''}
              onChange={(e) => handleFilterChange('authorId', e.target.value ? Number(e.target.value) : '')}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Authors</option>
              {authors.map(author => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Genre:</label>
            <select
              value={filters.genreId ?? ''}
              onChange={(e) => handleFilterChange('genreId', e.target.value ? Number(e.target.value) : '')}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre.id} value={genre.id}>
                  {genre.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Publisher:</label>
            <select
              value={filters.publisherId ?? ''}
              onChange={(e) => handleFilterChange('publisherId', e.target.value ? Number(e.target.value) : '')}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">All Publishers</option>
              {publishers.map(publisher => (
                <option key={publisher.id} value={publisher.id}>
                  {publisher.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Per Page:</label>
            <select
              value={filters.limit}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            onClick={resetFilters}
            style={{
              padding: '8px 15px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Books Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {books
          .filter(book => 
            searchTerm === '' || 
            book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((book) => (
            <div key={book.id} style={{ border: '1px solid #ccc', padding: '10px', width: '200px' }}>
              <div 
                style={{ 
                  width: '100%', 
                  height: '150px', 
                  backgroundColor: generateCoverColor(book.id),
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                Cover
              </div>
              <h3><Link to={`/books/${book.id}`}>{book.title}</Link></h3>
              <p>Author: {book.author_name}</p>
              <p>Price: ${book.price}</p>
              <p>In Stock: {book.stock_amount}</p>
            </div>
          ))}
      </div>

      {/* Pagination */}
      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
        <button 
          onClick={() => handlePageChange(filters.page! - 1)} 
          disabled={filters.page === 1}
          style={{ padding: '8px 15px', cursor: filters.page === 1 ? 'not-allowed' : 'pointer' }}
        >
          Previous
        </button>
        <span style={{ margin: '0 10px' }}>
          Page {filters.page} of {totalPages}
        </span>
        <button 
          onClick={() => handlePageChange(filters.page! + 1)} 
          disabled={filters.page === totalPages}
          style={{ padding: '8px 15px', cursor: filters.page === totalPages ? 'not-allowed' : 'pointer' }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default BookList;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

interface Author {
  id: number;
  name: string;
}

interface Genre {
  id: number;
  title: string;
}

interface Publisher {
  id: number;
  title: string;
}

const BookCreate: React.FC = () => {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stockAmount, setStockAmount] = useState('');
  const [authorId, setAuthorId] = useState<string>('');
  const [genreId, setGenreId] = useState<string>('');
  const [publisherId, setPublisherId] = useState<string>('');
  const [authors, setAuthors] = useState<Author[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all related entities when the component mounts
    fetchAuthors();
    fetchGenres();
    fetchPublishers();
  }, []);

  const fetchAuthors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/authors`);
      if (response.ok) {
        const data = await response.json();
        setAuthors(data);
      } else {
        console.error('Error fetching authors:', await response.text());
      }
    } catch (err) {
      console.error('Error fetching authors:', err);
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/genres`);
      if (response.ok) {
        const data = await response.json();
        setGenres(data);
      } else {
        console.error('Error fetching genres:', await response.text());
      }
    } catch (err) {
      console.error('Error fetching genres:', err);
    }
  };

  const fetchPublishers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/publishers`);
      if (response.ok) {
        const data = await response.json();
        setPublishers(data);
      } else {
        console.error('Error fetching publishers:', await response.text());
      }
    } catch (err) {
      console.error('Error fetching publishers:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          isbn,
          title,
          description,
          price: parseFloat(price),
          stock_amount: parseInt(stockAmount),
          author_id: parseInt(authorId),
          genre_id: parseInt(genreId),
          publisher_id: parseInt(publisherId)
        })
      });

      if (response.ok) {
        alert('Book created successfully!');
        navigate('/books');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create book');
      }
    } catch (err) {
      setError('Error creating book');
      console.error('Error creating book:', err);
    }
  };

  return (
    <div>
      <h2>Create New Book</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>ISBN:</label>
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        
        <div>
          <label>Price:</label>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label>Stock Amount:</label>
          <input
            type="number"
            value={stockAmount}
            onChange={(e) => setStockAmount(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label>Author:</label>
          <select
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            required
          >
            <option value="">Select an author</option>
            {authors.map(author => (
              <option key={author.id} value={author.id.toString()}>
                {author.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Genre:</label>
          <select
            value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            required
          >
            <option value="">Select a genre</option>
            {genres.map(genre => (
              <option key={genre.id} value={genre.id.toString()}>
                {genre.title}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Publisher:</label>
          <select
            value={publisherId}
            onChange={(e) => setPublisherId(e.target.value)}
            required
          >
            <option value="">Select a publisher</option>
            {publishers.map(publisher => (
              <option key={publisher.id} value={publisher.id.toString()}>
                {publisher.title}
              </option>
            ))}
          </select>
        </div>
        
        <button type="submit">Create Book</button>
      </form>
    </div>
  );
};

export default BookCreate;

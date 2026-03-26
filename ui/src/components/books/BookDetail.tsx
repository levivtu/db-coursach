import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

const BookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchBook();
  }, [id]);

  const fetchBook = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/books/${id}`);
      const data = await response.json();
      setBook(data);
    } catch (error) {
      console.error('Error fetching book:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    if (!user) {
      alert('Please login to add items to cart');
      navigate('/login');
      return;
    }

    if (user.user_role !== 'buyer') {
      alert('Only buyers can add items to cart');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/carts/add-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookId: parseInt(id!),
          amount: quantity
        })
      });

      if (response.ok) {
        alert('Book added to cart successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to add book to cart');
      }
    } catch (error) {
      console.error('Error adding book to cart:', error);
      alert('Error adding book to cart');
    }
  };

  const generateCoverColor = (id: number): string => {
    // Simple hash function to generate consistent colors based on book ID
    const str = id.toString();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to hex color
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };

  if (loading) {
    return <div>Loading book...</div>;
  }

  if (!book) {
    return <div>Book not found</div>;
  }

  return (
    <div>
      <h2>{book.title}</h2>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ 
          width: '200px', 
          height: '300px', 
          backgroundColor: generateCoverColor(book.id),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold'
        }}>
          Cover
        </div>
        <div>
          <p><strong>ISBN:</strong> {book.isbn}</p>
          <p><strong>Author:</strong> {book.author_name}</p>
          <p><strong>Genre:</strong> {book.genre_title}</p>
          <p><strong>Publisher:</strong> {book.publisher_title}</p>
          <p><strong>Description:</strong> {book.description}</p>
          <p><strong>Price:</strong> ${book.price}</p>
          <p><strong>In Stock:</strong> {book.stock_amount}</p>
          
          {user && user.user_role === 'buyer' && (
            <div style={{ marginTop: '20px' }}>
              <div>
                <label>Quantity: </label>
                <input
                  type="number"
                  min="1"
                  max={book.stock_amount}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 1, book.stock_amount))}
                />
              </div>
              <button onClick={addToCart} disabled={book.stock_amount <= 0}>
                Add to Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
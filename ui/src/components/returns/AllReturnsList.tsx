import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

interface ReturnItem {
  id: number;
  order_content_id: number;
  book_id: number;
  original_amount: number;
  price_per_book: number;
  title: string;
}

interface Return {
  id: number;
  order_id: number;
  reason: string;
  returned_price: number;
  created_at: string;
  contents: ReturnItem[];
  order_date: string;
}

const AllReturnsList: React.FC = () => {
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/returns/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReturns(data);
      } else {
        console.error('Error fetching returns:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading returns...</div>;
  }

  if (returns.length === 0) {
    return <div>No returns found.</div>;
  }

  return (
    <div>
      <h2>All Returns</h2>
      <div>
        {returns.map((ret) => (
          <div key={ret.id} style={{ 
            border: '1px solid #ccc', 
            padding: '15px', 
            margin: '10px 0',
            borderRadius: '5px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Return #{ret.id}</h3>
                <p><strong>Order ID:</strong> {ret.order_id}</p>
                <p><strong>Date:</strong> {new Date(ret.created_at).toLocaleString()}</p>
                <p><strong>Reason:</strong> {ret.reason}</p>
                <p><strong>Refunded Amount:</strong> ${ret.returned_price}</p>
              </div>
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <p><strong>Returned Items:</strong></p>
              <ul style={{ paddingLeft: '20px' }}>
                {ret.contents.map((item, index) => (
                  <li key={index}>
                    {item.title} - Quantity: {item.original_amount} - ${(item.price_per_book * item.original_amount)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllReturnsList;

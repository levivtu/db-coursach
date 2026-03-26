import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api';

interface OrderItem {
  id: number;
  order_id: number;
  book_id: number;
  amount: number;
  price_per_book: number;
  title: string;
  price: number;
}

interface Order {
  id: number;
  buyer_id: number;
  total_price: number;
  created_at: string;
  contents: OrderItem[];
}

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      // Try to get the order as a buyer first
      const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      } else {
        // If that fails, try getting as an employee
        const empResponse = await fetch(`${API_BASE_URL}/orders/${id}/employee`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (empResponse.ok) {
          const data = await empResponse.json();
          setOrder(data);
        } else {
          console.error('Error fetching order:', await response.text(), await empResponse.text());
          alert('Error fetching order details');
          navigate('/orders');
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Error fetching order details');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnClick = () => {
    navigate(`/orders/${id}/return`);
  };

  if (loading) {
    return <div>Loading order...</div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div>
      <h2>Order Details #{order.id}</h2>
      <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
      <p><strong>Total Price:</strong> ${order.total_price}</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleReturnClick} style={{ 
          backgroundColor: '#dc3545', 
          color: 'white', 
          padding: '10px 15px', 
          border: 'none', 
          borderRadius: '4px', 
          cursor: 'pointer' 
        }}>
          Initiate Return
        </button>
      </div>
      
      <h3>Items in Order</h3>
      <div>
        {order.contents.map((item) => (
          <div key={item.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid #ccc',
            padding: '10px 0'
          }}>
            <div>
              <h4>{item.title}</h4>
              <p>Price per book: ${item.price_per_book}</p>
              <p>Quantity: {item.amount}</p>
            </div>
            <div>
              <strong>Total: ${(item.price_per_book * item.amount)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderDetail;

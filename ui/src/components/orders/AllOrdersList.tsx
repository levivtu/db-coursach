import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  buyer_name: string;
  total_price: number;
  created_at: string;
  contents: OrderItem[];
}

const AllOrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/all`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Error fetching orders:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (orders.length === 0) {
    return <div>No orders found.</div>;
  }

  return (
    <div>
      <h2>All Orders</h2>
      <div>
        {orders.map((order) => (
          <div key={order.id} style={{ 
            border: '1px solid #ccc', 
            padding: '15px', 
            margin: '10px 0',
            borderRadius: '5px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Order #{order.id}</h3>
                <p><strong>Buyer ID:</strong> {order.buyer_id}</p>
                <p><strong>Buyer Name:</strong> {order.buyer_name}</p>
                <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
                <p><strong>Total:</strong> ${order.total_price}</p>
              </div>
            </div>
            
            <div style={{ marginTop: '10px' }}>
              <p><strong>Items:</strong></p>
              <ul style={{ paddingLeft: '20px' }}>
                {order.contents.slice(0, 3).map((item, index) => (
                  <li key={index}>
                    {item.title} - Quantity: {item.amount} - ${(item.price_per_book * item.amount)}
                  </li>
                ))}
                {order.contents.length > 3 && (
                  <li>... and {order.contents.length - 3} more items</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllOrdersList;

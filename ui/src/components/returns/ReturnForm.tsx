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

const ReturnForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [selectedItems, setSelectedItems] = useState<{[key: number]: number}>({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
        
        // Initialize selected items with 0 for each item
        const initialSelections: {[key: number]: number} = {};
        data.contents.forEach((item: OrderItem) => {
          initialSelections[item.book_id] = 0;
        });
        setSelectedItems(initialSelections);
      } else {
        console.error('Error fetching order:', await response.text());
        alert('Error fetching order details');
        navigate('/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert('Error fetching order details');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (bookId: number, maxAmount: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 0;
    const clampedValue = Math.max(0, Math.min(maxAmount, value));
    
    setSelectedItems(prev => ({
      ...prev,
      [bookId]: clampedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Please provide a reason for the return');
      return;
    }

    // Filter out items with 0 quantity
    const bookIds: number[] = [];
    const amounts: number[] = [];

    Object.entries(selectedItems).forEach(([bookId, amount]) => {
      if (amount > 0) {
        bookIds.push(parseInt(bookId));
        amounts.push(amount);
      }
    });

    if (bookIds.length === 0) {
      alert('Please select at least one item to return');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderId: parseInt(id!),
          reason,
          bookIds,
          amounts
        })
      });

      if (response.ok) {
        alert('Return request submitted successfully!');
        navigate('/returns');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to submit return request');
      }
    } catch (error) {
      console.error('Error submitting return:', error);
      alert('Error submitting return request');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelected = Object.values(selectedItems).reduce((sum, amount) => sum + amount, 0);

  if (loading) {
    return <div>Loading order...</div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div>
      <h2>Create Return for Order #{order.id}</h2>
      <p><strong>Order Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
      <p><strong>Total Price:</strong> ${order.total_price}</p>
      
      <form onSubmit={handleSubmit}>
        <h3>Select Items to Return</h3>
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
                <p>Original quantity: {item.amount}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor={`item-${item.book_id}`}>
                  Return quantity:
                </label>
                <input
                  id={`item-${item.book_id}`}
                  type="number"
                  min="0"
                  max={item.amount}
                  value={selectedItems[item.book_id] || 0}
                  onChange={(e) => handleItemSelect(item.book_id, item.amount, e)}
                  style={{ width: '60px' }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <label htmlFor="reason">
            <strong>Reason for return:</strong>
          </label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            cols={50}
            placeholder="Enter reason for returning these items..."
            style={{ display: 'block', width: '100%', marginTop: '5px', padding: '8px' }}
            required
          />
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <p><strong>Total items to return:</strong> {totalSelected}</p>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <button type="submit" disabled={submitting || totalSelected === 0}>
            {submitting ? 'Submitting...' : 'Submit Return Request'}
          </button>
          <button type="button" onClick={() => navigate(-1)} style={{ marginLeft: '10px' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReturnForm;
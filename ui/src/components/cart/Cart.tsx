import React, { useState, useEffect } from 'react';
import { Cart as CartType, CartItem } from '../../types';
import { API_BASE_URL } from '../../config/api';
import { useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const [cart, setCart] = useState<CartType | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/carts/my`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCart(data);
      } else {
        console.error('Error fetching cart:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (bookId: number, newAmount: number) => {
    if (newAmount <= 0) {
      removeFromCart(bookId);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/carts/update-amount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookId,
          amount: newAmount
        })
      });

      if (response.ok) {
        fetchCart(); // Refresh cart
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Error updating quantity');
    }
  };

  const removeFromCart = async (bookId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/carts/remove-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          bookId,
          amount: 999999 // Remove all instances
        })
      });

      if (response.ok) {
        fetchCart(); // Refresh cart
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to remove item from cart');
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      alert('Error removing from cart');
    }
  };

  const clearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/carts/clear`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          fetchCart(); // Refresh cart
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Failed to clear cart');
        }
      } catch (error) {
        console.error('Error clearing cart:', error);
        alert('Error clearing cart');
      }
    }
  };

  const placeOrder = async () => {
    if (!cart || !cart.contents || cart.contents.length === 0) {
      alert('Your cart is empty. Add some books before placing an order.');
      return;
    }

    if (window.confirm('Are you sure you want to place this order?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/orders/create-from-cart`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const orderData = await response.json();
          alert('Order placed successfully!');
          navigate(`/orders/${orderData.id}`); // Navigate to the order details page
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Failed to place order');
        }
      } catch (error) {
        console.error('Error placing order:', error);
        alert('Error placing order');
      }
    }
  };

  const calculateTotal = () => {
    if (!cart || !cart.contents) return 0;
    return cart.contents.reduce((sum, item) => sum + (item.price * item.amount), 0);
  };

  if (loading) {
    return <div>Loading cart...</div>;
  }

  if (!cart || !cart.contents || cart.contents.length === 0) {
    return <div>Your cart is empty</div>;
  }

  return (
    <div>
      <h2>Your Cart</h2>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={clearCart} style={{ marginRight: '10px' }}>Clear Cart</button>
        <button onClick={placeOrder} style={{ backgroundColor: '#28a745', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Place Order</button>
      </div>
      
      <div>
        {cart.contents.map((item: CartItem) => (
          <div key={item.book_id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid #ccc',
            padding: '10px 0'
          }}>
            <div>
              <h3>{item.title}</h3>
              <p>Price: ${item.price}</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Quantity:</span>
              <input
                type="number"
                min="1"
                value={item.amount}
                onChange={(e) => updateQuantity(item.book_id, parseInt(e.target.value))}
                style={{ width: '60px' }}
              />
              <button onClick={() => removeFromCart(item.book_id)}>Remove</button>
            </div>
            
            <div>
              <strong>Total: ${item.price * item.amount}</strong>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ 
        marginTop: '20px', 
        paddingTop: '10px', 
        borderTop: '2px solid #ccc',
        fontSize: '1.2em',
        fontWeight: 'bold'
      }}>
        Total: ${calculateTotal()}
      </div>
    </div>
 );
};

export default Cart;

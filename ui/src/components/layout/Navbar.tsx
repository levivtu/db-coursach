import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1rem', 
      backgroundColor: '#f0f0f0',
      marginBottom: '1rem'
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>Book Shop</Link>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link 
          to="/books" 
          style={{ 
            textDecoration: location.pathname === '/books' ? 'underline' : 'none' 
          }}
        >
          Books
        </Link>
        
        {user && user.user_role === 'buyer' && (
          <>
            <Link 
              to="/cart" 
              style={{ 
                textDecoration: location.pathname === '/cart' ? 'underline' : 'none' 
              }}
            >
              Cart
            </Link>
            <Link 
              to="/orders" 
              style={{ 
                textDecoration: location.pathname.startsWith('/orders') ? 'underline' : 'none' 
              }}
            >
              My Orders
            </Link>
            <Link 
              to="/returns" 
              style={{ 
                textDecoration: location.pathname === '/returns' ? 'underline' : 'none' 
              }}
            >
              My Returns
            </Link>
          </>
        )}
        
        {user && user.user_role === 'employee' && (
          <>
            <Link 
              to="/create-book" 
              style={{ 
                textDecoration: location.pathname === '/create-book' ? 'underline' : 'none' 
              }}
            >
              Create Book
            </Link>
            <Link 
              to="/manage-entities" 
              style={{ 
                textDecoration: location.pathname === '/manage-entities' ? 'underline' : 'none' 
              }}
            >
              Manage Entities
            </Link>
            <Link 
              to="/all-orders" 
              style={{ 
                textDecoration: location.pathname === '/all-orders' ? 'underline' : 'none' 
              }}
            >
              All Orders
            </Link>
            <Link 
              to="/all-returns" 
              style={{ 
                textDecoration: location.pathname === '/all-returns' ? 'underline' : 'none' 
              }}
            >
              All Returns
            </Link>
            <Link
              to="/statistics"
              style={{
                textDecoration: location.pathname === '/statistics' ? 'underline' : 'none',
              }}
            >
              Statistics
            </Link>
          </>
        )}
        
        {user ? (
          <>
            <span>Hello, {user.name}!</span>
            <Link to="/delete-account">Delete Account</Link>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link 
              to="/login" 
              style={{ 
                textDecoration: location.pathname === '/login' ? 'underline' : 'none' 
              }}
            >
              Login
            </Link>
            <Link 
              to="/register" 
              style={{ 
                textDecoration: location.pathname === '/register' ? 'underline' : 'none' 
              }}
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

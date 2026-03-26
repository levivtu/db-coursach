import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import AccountDeletion from './components/auth/AccountDeletion';
import BookList from './components/books/BookList';
import BookDetail from './components/books/BookDetail';
import Cart from './components/cart/Cart';
import BookCreate from './components/books/BookCreate';
import OrderDetail from './components/orders/OrderDetail';
import OrdersList from './components/orders/OrdersList';
import AllOrdersList from './components/orders/AllOrdersList';
import ReturnForm from './components/returns/ReturnForm';
import ReturnsList from './components/returns/ReturnsList';
import AllReturnsList from './components/returns/AllReturnsList';
import Navbar from './components/layout/Navbar';
import EntityManagement from './components/admin/EntityManagement';
import StatisticsDashboard from './components/statistics/StatisticsDashboard';
import ManualMode from './components/admin/ManualMode';

const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.user_role)) {
    return <Navigate to="/books" />;
  }

  return children;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/books" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/delete-account" 
            element={
              <ProtectedRoute>
                <AccountDeletion />
              </ProtectedRoute>
            } 
          />
          <Route path="/books" element={<BookList />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <Cart />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/create-book" 
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <BookCreate />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <OrdersList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders/:id" 
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <OrderDetail />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/all-orders" 
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <AllOrdersList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/all-returns" 
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <AllReturnsList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/returns" 
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <ReturnsList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders/:id/return" 
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <ReturnForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/manage-entities" 
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EntityManagement />
                <ManualMode />
              </ProtectedRoute>
            } 
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <StatisticsDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  );
};

export default App;

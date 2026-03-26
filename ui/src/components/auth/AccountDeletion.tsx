import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AccountDeletion: React.FC = () => {
  const navigate = useNavigate();
  const { deleteAccount } = useAuth();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await deleteAccount();
        alert('Your account has been deleted successfully.');
        navigate('/login');
      } catch (err: any) {
        alert(err.message || 'Account deletion failed');
      }
    }
  };

  return (
    <div>
      <h2>Delete Account</h2>
      <p>Warning: Deleting your account will permanently remove all your data.</p>
      <button onClick={handleDelete} style={{ backgroundColor: 'red', color: 'white' }}>
        Delete Account
      </button>
    </div>
  );
};

export default AccountDeletion;
import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';

interface Publisher {
  id: number;
  title: string;
  description: string | null;
}

const PublisherList: React.FC = () => {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublishers = async () => {
      try {
        const data = await apiService.get('publishers');
        setPublishers(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch publishers');
        console.error('Error fetching publishers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublishers();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading publishers...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 border-b text-left">ID</th>
            <th className="py-2 px-4 border-b text-left">Title</th>
            <th className="py-2 px-4 border-b text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {publishers.map((publisher) => (
            <tr key={publisher.id} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{publisher.id}</td>
              <td className="py-2 px-4 border-b">{publisher.title}</td>
              <td className="py-2 px-4 border-b">{publisher.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PublisherList;
import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';

interface Author {
  id: number;
  name: string;
  biography: string | null;
}

const AuthorList: React.FC = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const data = await apiService.get('authors');
        setAuthors(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch authors');
        console.error('Error fetching authors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuthors();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading authors...</div>;
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
            <th className="py-2 px-4 border-b text-left">Name</th>
            <th className="py-2 px-4 border-b text-left">Biography</th>
          </tr>
        </thead>
        <tbody>
          {authors.map((author) => (
            <tr key={author.id} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b">{author.id}</td>
              <td className="py-2 px-4 border-b">{author.name}</td>
              <td className="py-2 px-4 border-b">{author.biography || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AuthorList;
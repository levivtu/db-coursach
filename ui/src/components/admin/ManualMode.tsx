import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config/api';

interface ReserveCopy {
  filename: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

interface QueryResult {
  rows: any[];
  rowCount: number;
  fields: string[];
  command?: string;
}

const ManualMode: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reserveCopies, setReserveCopies] = useState<ReserveCopy[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [loadingReserve, setLoadingReserve] = useState<boolean>(true);
  const [reserveError, setReserveError] = useState<string | null>(null);
  
  const token = localStorage.getItem('token');

  const makeApiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API call failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  const fetchReserveCopies = async () => {
    try {
      setLoadingReserve(true);
      const data = await makeApiCall('/reserve-copying/list');
      setReserveCopies(data);
      setReserveError(null);
    } catch (err: any) {
      setReserveError(err.message || 'Failed to fetch reserve copies');
      console.error('Error fetching reserve copies:', err);
    } finally {
      setLoadingReserve(false);
    }
  };

  useEffect(() => {
    fetchReserveCopies();
  }, []);

  const handleRunQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await makeApiCall('/remote-sql/query', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
      
      setResults(response);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunQueryWithBackup = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await makeApiCall('/remote-sql/query-with-backup', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
      
      setResults(response);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDump = async () => {
    try {
      await makeApiCall('/reserve-copying/create-dump', {
        method: 'POST'
      });
      fetchReserveCopies(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to create dump');
    }
  };

  const handleRestoreDump = async (filename: string) => {
    try {
      await makeApiCall(`/reserve-copying/restore/${filename}`, {
        method: 'POST'
      });
      setError('Restore operation initiated. This may take a moment.');
    } catch (err: any) {
      setError(err.message || 'Failed to restore dump');
    }
  };

  const handleDeleteDump = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      await makeApiCall(`/reserve-copying/${filename}`, {
        method: 'DELETE'
      });
      fetchReserveCopies(); // Refresh the list
    } catch (err: any) {
      setError(err.message || 'Failed to delete dump');
    }
  };

  // Calculate pagination
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = results?.rows ? results.rows.slice(startIndex, startIndex + rowsPerPage) : [];
  const totalPages = results?.rows ? Math.ceil(results.rows.length / rowsPerPage) : 0;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  // Helper function to render cell content based on data type
  const renderCellContent = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">NULL</span>;
    }

    // Handle different data types appropriately
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      // For JSON objects/arrays, show a preview
      return <span className="text-blue-600 font-mono">{JSON.stringify(value)}</span>;
    }

    // For strings, check if it looks like a date/time
    if (typeof value === 'string') {
      // Check if it's a date string (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return new Date(value).toLocaleDateString();
      }
      // Check if it's a datetime string
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return new Date(value).toLocaleString();
      }
      // For long strings, truncate with ellipsis
      if (value.length > 50) {
        return (
          <span title={value}>
            {value.substring(0, 50)}...
          </span>
        );
      }
    }

    return String(value);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Manual Mode</h2>
      
      {/* SQL Query Runner Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">SQL Query Runner</h3>
        
        <div className="mb-4">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here (SELECT statements only)..."
            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={handleRunQuery}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Query'}
          </button>
          
          <button
            onClick={handleRunQueryWithBackup}
            disabled={loading}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Query with Backup'}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {results && (
          <div className="mt-6">
            <h4 className="text-lg font-medium mb-2">Results ({results.rowCount} rows)</h4>
            
            {/* Pagination Controls */}
            {results.rows && results.rows.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="rowsPerPage">Rows per page:</label>
                  <select
                    id="rowsPerPage"
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                    className="p-1 border border-gray-300 rounded"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  Page {currentPage} of {totalPages}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            
            {/* Results Table */}
            {paginatedRows.length > 0 && results.fields && (
              <div className="overflow-x-auto rounded border border-gray-300 max-h-[60vh] overflow-y-auto">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr>
                      {results.fields.map((field, index) => (
                        <th key={index} className="border-b border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {results.fields?.map((field, fieldIndex) => (
                          <td key={fieldIndex} className="border-b border-gray-300 px-4 py-2 text-sm align-top max-w-xs break-words">
                            {renderCellContent(row[field])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {results.rows && results.rows.length === 0 && (
              <p className="text-gray-500 italic">No results found.</p>
            )}
          </div>
        )}
      </div>
      
      {/* Database Backup Management Section */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Database Backup Management</h3>
        
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={handleCreateDump}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
          >
            Create Manual Dump
          </button>
          
          <button
            onClick={fetchReserveCopies}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
          >
            Refresh List
          </button>
        </div>
        
        {reserveError && (
          <div className="mt-2 p-3 bg-red-100 text-red-700 rounded-md">
            {reserveError}
          </div>
        )}
        
        {loadingReserve ? (
          <p className="text-gray-500">Loading reserve copies...</p>
        ) : (
          <div>
            <h4 className="text-lg font-medium mb-2">Available Dumps</h4>
            
            {reserveCopies.length === 0 ? (
              <p className="text-gray-500 italic">No reserve copies available.</p>
            ) : (
              <div className="overflow-x-auto rounded border border-gray-300">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border-b border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Filename</th>
                      <th className="border-b border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Size (bytes)</th>
                      <th className="border-b border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Created At</th>
                      <th className="border-b border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reserveCopies.map((copy, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border-b border-gray-300 px-4 py-2 text-sm">{copy.filename}</td>
                        <td className="border-b border-gray-300 px-4 py-2 text-sm">{copy.size}</td>
                        <td className="border-b border-gray-300 px-4 py-2 text-sm">
                          {new Date(copy.createdAt).toLocaleString()}
                        </td>
                        <td className="border-b border-gray-300 px-4 py-2 text-sm">
                          <button
                            onClick={() => handleRestoreDump(copy.filename)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm mr-2"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handleDeleteDump(copy.filename)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualMode;

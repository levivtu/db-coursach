import React, { useState } from 'react';
import AuthorCreate from '../authors/AuthorCreate';
import PublisherCreate from '../publishers/PublisherCreate';
import GenreCreate from '../genres/GenreCreate';
import AuthorList from '../authors/AuthorList';
import PublisherList from '../publishers/PublisherList';
import GenreList from '../genres/GenreList';

const EntityManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'author' | 'publisher' | 'genre'>('author');
  const [activeSection, setActiveSection] = useState<'create' | 'list'>('create'); // For each entity type

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Entities</h1>
      
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('author')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'author'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Authors
          </button>
          <button
            onClick={() => setActiveTab('publisher')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'publisher'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Publishers
          </button>
          <button
            onClick={() => setActiveTab('genre')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'genre'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Genres
          </button>
        </nav>
      </div>

      {/* Section navigation for create/list */}
      <div className="mb-6">
        <button
          onClick={() => setActiveSection('create')}
          className={`mr-4 py-2 px-4 border-b-2 font-medium text-sm ${
            activeSection === 'create'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Create
        </button>
        <button
          onClick={() => setActiveSection('list')}
          className={`py-2 px-4 border-b-2 font-medium text-sm ${
            activeSection === 'list'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          List
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'author' && (
          <>
            {activeSection === 'create' && <AuthorCreate />}
            {activeSection === 'list' && <AuthorList />}
          </>
        )}
        {activeTab === 'publisher' && (
          <>
            {activeSection === 'create' && <PublisherCreate />}
            {activeSection === 'list' && <PublisherList />}
          </>
        )}
        {activeTab === 'genre' && (
          <>
            {activeSection === 'create' && <GenreCreate />}
            {activeSection === 'list' && <GenreList />}
          </>
        )}
      </div>
    </div>
  );
};

export default EntityManagement;

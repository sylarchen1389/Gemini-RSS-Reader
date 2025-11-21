import React from 'react';
import { Clock, Search } from 'lucide-react';
import { Article, Feed } from '../types';

interface ArticleListProps {
  articles: Article[];
  feeds: Feed[];
  selectedArticleId: string | null;
  onSelectArticle: (article: Article) => void;
  isLoading: boolean;
  filterText: string;
  onFilterChange: (text: string) => void;
}

export const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  feeds,
  selectedArticleId,
  onSelectArticle,
  isLoading,
  filterText,
  onFilterChange
}) => {
  const getFeedTitle = (feedId: string) => {
    return feeds.find(f => f.id === feedId)?.title || 'Unknown Feed';
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(filterText.toLowerCase()) || 
    a.contentSnippet.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="w-full md:w-96 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search articles..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-full bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-32 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-500">Syncing feeds...</span>
          </div>
        )}

        {!isLoading && filteredArticles.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            No articles found.
          </div>
        )}

        {filteredArticles.map(article => (
          <div
            key={article.id}
            onClick={() => onSelectArticle(article)}
            className={`
              mb-2 p-4 rounded-lg cursor-pointer transition-all border
              ${selectedArticleId === article.id
                ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-900 shadow-sm ring-1 ring-indigo-500/20'
                : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-slate-800/50'
              }
            `}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 truncate max-w-[70%]">
                {getFeedTitle(article.feedId)}
              </span>
              <span className="text-xs text-gray-400 flex items-center">
                {formatDate(article.pubDate)}
              </span>
            </div>
            
            <h3 className={`text-sm font-semibold mb-1 line-clamp-2 ${selectedArticleId === article.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-800 dark:text-gray-200'}`}>
              {article.title}
            </h3>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {article.contentSnippet}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Plus, Rss, Trash2, LayoutGrid, Settings } from 'lucide-react';
import { Feed } from '../types';

interface SidebarProps {
  feeds: Feed[];
  selectedFeedId: string | null;
  onSelectFeed: (id: string | null) => void;
  onAddFeed: (url: string) => Promise<void>;
  onDeleteFeed: (id: string) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  feeds, 
  selectedFeedId, 
  onSelectFeed, 
  onAddFeed,
  onDeleteFeed,
  onOpenSettings
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedFeed = selectedFeedId ? feeds.find(f => f.id === selectedFeedId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    
    setIsLoading(true);
    try {
      await onAddFeed(newUrl);
      setNewUrl('');
      setIsAdding(false);
    } catch (err) {
      alert("Failed to add feed. Please check the URL.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
          <LayoutGrid size={24} />
          <span>Folo</span>
        </div>
        <div className="flex space-x-1">
          <button 
            onClick={onOpenSettings}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Settings"
            title="Import / Settings"
          >
            <Settings size={20} />
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors text-gray-600 dark:text-gray-400"
            aria-label="Add Feed"
            title="Add RSS Feed"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Add Feed Input */}
      {isAdding && (
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 animate-in slide-in-from-top-2">
          <form onSubmit={handleSubmit}>
            <input
              type="url"
              placeholder="https://site.com/rss"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              autoFocus
              disabled={isLoading}
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div 
          onClick={() => onSelectFeed(null)}
          className={`
            mx-2 mt-2 px-3 py-2 rounded-md cursor-pointer flex items-center space-x-3 transition-colors
            ${selectedFeedId === null 
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
            }
          `}
        >
          <LayoutGrid size={18} />
          <span className="text-sm font-medium">All Articles</span>
        </div>

        <div className="mt-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Subscriptions
        </div>

        {feeds.length === 0 && (
          <div className="px-4 py-4 text-sm text-gray-400 text-center italic">
            No feeds yet. Import OPML or add one.
          </div>
        )}

        <div className="space-y-0.5 mx-2 pb-4">
          {feeds.map(feed => (
            <div 
              key={feed.id}
              className={`
                group px-3 py-2 rounded-md cursor-pointer flex items-center justify-between transition-colors
                ${selectedFeedId === feed.id 
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                }
              `}
              onClick={() => onSelectFeed(feed.id)}
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="min-w-[16px] flex justify-center">
                  {feed.icon ? (
                    <img 
                      src={feed.icon} 
                      alt="" 
                      className="w-4 h-4 rounded-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }} 
                    />
                  ) : null}
                  <Rss size={16} className={`${feed.icon ? 'hidden' : ''}`} />
                </div>
                <span className="text-sm font-medium truncate">{feed.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFeed(feed.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-gray-400 hover:text-red-600 transition-all"
                title="Unsubscribe"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Feed Description */}
      {selectedFeed && selectedFeed.description && (
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/30 backdrop-blur-sm">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1">About Feed</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {selectedFeed.description}
          </p>
        </div>
      )}
    </div>
  );
};

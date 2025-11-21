import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ArticleList } from './components/ArticleList';
import { Reader } from './components/Reader';
import { SettingsModal } from './components/SettingsModal';
import { Feed, Article } from './types';
import { fetchRSS } from './services/rss';

const App: React.FC = () => {
  const [feeds, setFeeds] = useState<Feed[]>(() => {
    const saved = localStorage.getItem('folo_feeds');
    return saved ? JSON.parse(saved) : [
        { id: '1', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', title: 'NYT Technology' }
    ];
  });
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Persist feeds
  useEffect(() => {
    localStorage.setItem('folo_feeds', JSON.stringify(feeds));
  }, [feeds]);

  // Fetch Articles logic
  const refreshFeeds = async () => {
    setIsLoading(true);
    const allArticles: Article[] = [];
    
    const feedsToFetch = selectedFeedId 
      ? feeds.filter(f => f.id === selectedFeedId)
      : feeds;

    if (feedsToFetch.length === 0) {
      setArticles([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch in parallel but limit concurrency slightly if needed
      const promises = feedsToFetch.map(async (feed) => {
        try {
          const data = await fetchRSS(feed.url);
          
          const feedArticles: Article[] = data.items.map((item, idx) => ({
            id: `${feed.id}-${idx}-${item.link}`, // More unique ID
            feedId: feed.id,
            title: item.title,
            link: item.link,
            content: item.content,
            contentSnippet: item.contentSnippet,
            pubDate: item.pubDate,
            author: item.author,
            isRead: false
          }));
          allArticles.push(...feedArticles);
        } catch (e) {
          console.warn(`Failed to fetch ${feed.title}:`, e);
        }
      });

      await Promise.all(promises);

      // Sort by date descending
      allArticles.sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
      });
      
      setArticles(allArticles);
    } catch (err) {
      console.error("Global fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when selection changes or feeds change
  useEffect(() => {
    refreshFeeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeedId, feeds.length]); 

  const handleAddFeed = async (url: string) => {
    const data = await fetchRSS(url);
    const newFeed: Feed = {
      id: Date.now().toString(),
      url,
      title: data.title || 'Untitled Feed',
      description: data.description,
      icon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`
    };
    setFeeds(prev => [...prev, newFeed]);
  };

  const handleImportFeeds = (importedFeeds: { title: string, url: string }[]) => {
    const newFeeds: Feed[] = importedFeeds.map((f, index) => ({
      id: `${Date.now()}-${index}`,
      url: f.url,
      title: f.title,
      icon: `https://www.google.com/s2/favicons?domain=${new URL(f.url).hostname}`
    }));
    
    // Avoid duplicates by URL
    setFeeds(prev => {
      const existingUrls = new Set(prev.map(p => p.url));
      const uniqueNewFeeds = newFeeds.filter(nf => !existingUrls.has(nf.url));
      return [...prev, ...uniqueNewFeeds];
    });
  };

  const handleDeleteFeed = (id: string) => {
    setFeeds(prev => prev.filter(f => f.id !== id));
    if (selectedFeedId === id) setSelectedFeedId(null);
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticleId(article.id);
  };

  const handleUpdateArticle = (updated: Article) => {
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const selectedArticle = articles.find(a => a.id === selectedArticleId) || null;

  return (
    <div className="flex h-screen w-screen bg-gray-100 dark:bg-slate-950 overflow-hidden">
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onImportFeeds={handleImportFeeds}
        feeds={feeds}
      />

      {/* Pane 1: Sidebar */}
      <div className="hidden md:block h-full flex-shrink-0">
        <Sidebar 
          feeds={feeds}
          selectedFeedId={selectedFeedId}
          onSelectFeed={setSelectedFeedId}
          onAddFeed={handleAddFeed}
          onDeleteFeed={handleDeleteFeed}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* Pane 2: Article List */}
      <div className={`${selectedArticleId ? 'hidden lg:block' : 'w-full'} md:w-auto h-full flex-shrink-0`}>
        <ArticleList 
          feeds={feeds}
          articles={articles}
          selectedArticleId={selectedArticleId}
          onSelectArticle={handleSelectArticle}
          isLoading={isLoading}
          filterText={filterText}
          onFilterChange={setFilterText}
        />
      </div>

      {/* Pane 3: Reader */}
      <div className={`${!selectedArticleId ? 'hidden lg:block' : 'w-full'} flex-1 h-full relative`}>
         {/* Mobile Back Button */}
        {selectedArticleId && (
          <button 
            onClick={() => setSelectedArticleId(null)}
            className="lg:hidden absolute top-4 left-4 z-10 bg-white/80 dark:bg-black/50 backdrop-blur-sm p-2 rounded-full shadow-sm border border-gray-200 dark:border-slate-700"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}
        <Reader 
          article={selectedArticle} 
          onUpdateArticle={handleUpdateArticle}
        />
      </div>
    </div>
  );
};

export default App;

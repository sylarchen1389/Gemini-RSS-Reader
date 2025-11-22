import { useState, useEffect, useCallback } from 'react';
import { Feed, Article } from '../types';
import { api } from '../services/api';
import { fetchRSS } from '../services/rss';

export const useFolo = () => {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Initial Data Load (Feeds + Article Snapshots)
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      // Load feeds
      const loadedFeeds = await api.getFeeds();
      setFeeds(loadedFeeds);
      
      // Load stored articles immediately (Snapshot) for fast render
      const cachedArticles = await api.getArticles();
      setArticles(cachedArticles);
      
      setIsLoading(false);

      // If no feeds, seed default
      if (loadedFeeds.length === 0) {
         // ... (keep default seed logic if needed, or skip)
      } else {
        // Trigger background refresh to get latest data
        backgroundSync(loadedFeeds);
      }
    };
    init();
  }, []);

  // 2. Background Sync Logic
  const backgroundSync = async (currentFeeds: Feed[]) => {
      // Trigger server to update DB
      // We can use the batch cron endpoint or iterate
      // For better UX, we do it silently
      try {
         await Promise.all(currentFeeds.map(f => api.refreshFeed(f.id, f.url)));
         // After sync, reload articles from DB
         const freshArticles = await api.getArticles();
         setArticles(freshArticles);
      } catch (e) {
          console.error("Background sync failed", e);
      }
  };

  // 3. Manual Refresh
  const refreshFeeds = useCallback(async () => {
    setIsLoading(true);
    try {
        // Trigger server update
        await api.refreshAll(); 
        // Re-fetch snapshots
        const fresh = await api.getArticles();
        setArticles(fresh);
    } catch (e) {
        console.error("Manual refresh failed", e);
    } finally {
        setIsLoading(false);
    }
  }, []);

  // Actions
  const addFeed = async (inputUrl: string) => {
    let url = inputUrl.trim();
    if (!url.match(/^[a-zA-Z]+:\/\//)) url = `https://${url}`;

    // Validate first (Don't save garbage)
    const data = await fetchRSS(url);
    
    let icon = '';
    try {
        const siteUrl = (data as any).link || url;
        const safeSiteUrl = siteUrl.startsWith('http') ? siteUrl : url.replace('rsshub://', 'https://');
        const hostname = new URL(safeSiteUrl).hostname;
        icon = `https://www.google.com/s2/favicons?domain=${hostname}`;
    } catch (e) {}

    const newFeed: Feed = {
      id: Date.now().toString(),
      url,
      title: data.title || 'Untitled Feed',
      description: data.description,
      icon
    };
    
    // Saves feed AND triggers background snapshot
    await api.saveFeed(newFeed);
    setFeeds(prev => [...prev, newFeed]);
    
    // Wait a bit for the background snapshot to likely finish, then reload articles
    setTimeout(async () => {
        const fresh = await api.getArticles();
        setArticles(fresh);
    }, 2000);
  };

  const importFeeds = async (imported: { title: string, url: string }[]) => {
    const newFeeds: Feed[] = imported.map((f, i) => {
        let icon = '';
        try {
             const domainUrl = f.url.startsWith('http') ? f.url : `https://${f.url}`;
             const hostname = new URL(domainUrl.replace('rsshub://', 'https://')).hostname;
             icon = `https://www.google.com/s2/favicons?domain=${hostname}`;
        } catch (e) {}
        return {
            id: `${Date.now()}-${i}`,
            url: f.url,
            title: f.title,
            icon
        };
    });
    await api.saveFeed(newFeeds);
    setFeeds(await api.getFeeds());
    // Background sync will happen on next reload or manual refresh, 
    // or we can trigger it now:
    api.refreshAll().then(() => api.getArticles().then(setArticles));
  };

  const deleteFeed = async (id: string) => {
    await api.deleteFeed(id);
    setFeeds(prev => prev.filter(f => f.id !== id));
    setArticles(prev => prev.filter(a => a.feedId !== id));
    if (selectedFeedId === id) setSelectedFeedId(null);
  };

  const updateArticle = (updated: Article) => {
    setArticles(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const displayedArticles = selectedFeedId 
    ? articles.filter(a => a.feedId === selectedFeedId)
    : articles;

  return {
    state: {
      feeds,
      articles: displayedArticles,
      selectedFeedId,
      selectedArticleId,
      selectedArticle: articles.find(a => a.id === selectedArticleId) || null,
      isLoading,
      filterText,
      isSettingsOpen
    },
    actions: {
      setSelectedFeedId,
      setSelectedArticleId,
      setFilterText,
      setIsSettingsOpen,
      addFeed,
      deleteFeed,
      importFeeds,
      updateArticle,
      refreshFeeds
    }
  };
};
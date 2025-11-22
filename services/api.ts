
import { Feed, Article } from '../types';

// Repository Pattern Implementation

const STORAGE_KEY = 'folo_feeds';

// Local Storage helpers for offline/fallback configuration
const getLocalFeeds = (): Feed[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalFeeds = (feeds: Feed[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
  } catch (e) {}
};

export const api = {
  // --- Feeds ---
  getFeeds: async (): Promise<Feed[]> => {
    try {
      const res = await fetch('/api/feeds');
      if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
      const remoteFeeds = await res.json();
      saveLocalFeeds(remoteFeeds);
      return remoteFeeds;
    } catch (e) {
      console.warn("Using local feeds fallback");
      return getLocalFeeds();
    }
  },

  saveFeed: async (feed: Feed | Feed[]) => {
    const feedsToAdd = Array.isArray(feed) ? feed : [feed];
    
    // 1. Save to DB
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedsToAdd)
      });
      if (!res.ok) throw new Error(res.statusText);
    } catch (e) {
      console.error("Failed to save feed to server", e);
      // Update local anyway so UI feels responsive
      const current = getLocalFeeds();
      const newUnique = feedsToAdd.filter(f => !current.some(c => c.url === f.url));
      saveLocalFeeds([...current, ...newUnique]);
      return;
    }

    // 2. Trigger immediate background fetch for these new feeds (Snapshotting)
    feedsToAdd.forEach(f => {
        api.refreshFeed(f.id, f.url).catch(console.error);
    });
  },

  deleteFeed: async (id: string) => {
    const current = getLocalFeeds();
    saveLocalFeeds(current.filter(f => f.id !== id));
    try {
      await fetch(`/api/feeds?id=${id}`, { method: 'DELETE' });
    } catch (e) { console.warn(e); }
  },

  // --- Articles (Snapshots) ---
  
  // Get articles directly from DB (fast)
  getArticles: async (feedId?: string): Promise<Article[]> => {
    try {
        const params = feedId ? `?feedId=${feedId}` : '';
        const res = await fetch(`/api/articles${params}`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Failed to fetch article snapshots", e);
        return [];
    }
  },

  // Trigger backend to fetch RSS -> Parse -> Save to DB
  refreshFeed: async (feedId: string, url: string): Promise<void> => {
      await fetch('/api/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedId, url })
      });
  },

  // Trigger global refresh (Cron simulation)
  refreshAll: async (): Promise<void> => {
      await fetch('/api/cron');
  }
};
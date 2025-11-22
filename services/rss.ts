import { FeedData } from '../types';
import { parseFeedServer } from '../utils/rss-parser';

// Helper to parse OPML (Client side is fine)
export const parseOPML = (xmlText: string): { title: string, url: string }[] => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const outlines = doc.querySelectorAll('outline[xmlUrl]');
    const feeds: { title: string, url: string }[] = [];
    
    outlines.forEach(outline => {
      const url = outline.getAttribute('xmlUrl');
      const title = outline.getAttribute('title') || outline.getAttribute('text') || 'Untitled Feed';
      if (url) {
        feeds.push({ title, url });
      }
    });
    return feeds;
  } catch (e) {
    console.error("Failed to parse OPML", e);
    return [];
  }
};

// Validate RSS URL and get metadata (Validation Mode)
export const fetchRSS = async (url: string): Promise<FeedData> => {
  let fetchUrl = url;
  if (fetchUrl.startsWith('rsshub://')) {
    fetchUrl = fetchUrl.replace('rsshub://', 'https://rsshub.app/');
  }

  // Use the backend API for validation (GET mode)
  const res = await fetch(`/api/refresh?url=${encodeURIComponent(fetchUrl)}`);
  
  if (!res.ok) {
      throw new Error("Failed to reach feed server or parse XML.");
  }

  return await res.json();
};
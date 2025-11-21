export interface Feed {
  id: string;
  url: string;
  title: string;
  description?: string;
  icon?: string;
}

export interface Article {
  id: string;
  feedId: string;
  title: string;
  link: string;
  content: string;
  contentSnippet: string;
  pubDate: string; // ISO string
  author?: string;
  isRead: boolean;
  summary?: string; // AI Summary
}

export interface FeedData {
  title: string;
  description: string;
  items: {
    title: string;
    link: string;
    content: string;
    contentSnippet: string;
    pubDate: string;
    author?: string;
  }[];
}

export enum ViewState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}
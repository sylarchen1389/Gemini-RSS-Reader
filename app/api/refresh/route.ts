import { NextResponse } from 'next/server';
import { parseFeedServer, fixRelativeUrls } from '../../../utils/rss-parser';

export const runtime = 'edge';

interface D1Database {
  prepare: (query: string) => any;
  batch: (statements: any[]) => Promise<any>;
}

const getDb = (): D1Database | undefined => process.env.DB as unknown as D1Database;

// Initialize articles table if not exists
const ensureTableExists = async (db: D1Database) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      feed_id TEXT,
      title TEXT,
      link TEXT,
      content TEXT,
      content_snippet TEXT,
      pub_date TEXT,
      author TEXT,
      created_at INTEGER
    );
  `).run();
  // Separate index creation to avoid syntax errors in some D1 contexts if batched improperly
  try {
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);`).run();
  } catch (e) {} 
  try {
      await db.prepare(`CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date DESC);`).run();
  } catch (e) {}
};

async function fetchAndParseFeed(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Folo/1.0; +https://github.com/RSSNext/Folo)',
        'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml;q=0.9, */*;q=0.8'
      },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    clearTimeout(timeoutId);

    const data = parseFeedServer(text);
    
    // Post-process URLs
    let feedOrigin = '';
    try { feedOrigin = new URL(url).origin; } catch (e) {}
    
    if (feedOrigin) {
      data.items = data.items.map((item: any) => ({
        ...item,
        content: fixRelativeUrls(item.content, feedOrigin)
      }));
    }
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET(req: Request) {
  // Validation Mode (No DB write)
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  try {
    const data = await fetchAndParseFeed(url);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // Sync Mode (Write to DB)
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB not found' }, { status: 500 });

    await ensureTableExists(db);

    const { feedId, url } = await req.json();
    if (!feedId || !url) return NextResponse.json({ error: 'feedId and url required' }, { status: 400 });

    const data = await fetchAndParseFeed(url);

    // Prepare Batch Insert
    // We use a deterministic ID (feedId + itemLink) to prevent duplicates
    // Use INSERT OR REPLACE to update content if it changed
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO articles 
      (id, feed_id, title, link, content, content_snippet, pub_date, author, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = data.items.map((item: any) => {
      // Simple hash or composite key
      const articleId = `${feedId}-${btoa(item.link).slice(0, 32)}`;
      return stmt.bind(
        articleId,
        feedId,
        item.title,
        item.link,
        item.content,
        item.contentSnippet,
        item.pubDate,
        item.author || '',
        Date.now()
      );
    });

    await db.batch(batch);

    return NextResponse.json({ success: true, count: batch.length });
  } catch (error: any) {
    console.error("Refresh Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
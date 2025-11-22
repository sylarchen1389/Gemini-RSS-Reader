import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface D1Database {
  prepare: (query: string) => any;
}

const getDb = (): D1Database | undefined => process.env.DB as unknown as D1Database;

export async function GET(req: Request) {
  try {
    const db = getDb();
    if (!db) return NextResponse.json([]); // Fallback empty

    const { searchParams } = new URL(req.url);
    const feedId = searchParams.get('feedId');
    const limit = 100; // Hard limit for now

    let query = "SELECT * FROM articles";
    const params = [];

    if (feedId) {
      query += " WHERE feed_id = ?";
      params.push(feedId);
    }

    query += " ORDER BY pub_date DESC LIMIT ?";
    params.push(limit);

    try {
        const { results } = await db.prepare(query).bind(...params).all();
        
        // Map snake_case DB columns to camelCase frontend types if necessary
        // But let's just ensure the frontend handles the mapping or we map here.
        // Our D1 insert used snake_case, let's map back to match 'Article' interface.
        const mapped = (results || []).map((r: any) => ({
            id: r.id,
            feedId: r.feed_id,
            title: r.title,
            link: r.link,
            content: r.content,
            contentSnippet: r.content_snippet,
            pubDate: r.pub_date,
            author: r.author,
            isRead: false // Local state, default false
        }));

        return NextResponse.json(mapped);
    } catch (e: any) {
        // Table might not exist yet if no feeds added
        if (e.message && e.message.includes('no such table')) {
            return NextResponse.json([]);
        }
        throw e;
    }

  } catch (e: any) {
    console.error("Articles GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
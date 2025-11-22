
import { NextResponse } from 'next/server';

// Define the interface for the Cloudflare D1 binding
interface D1Database {
  prepare: (query: string) => any;
  batch: (statements: any[]) => Promise<any>;
}

// Helper to get the DB binding from the environment
const getDb = (): D1Database | undefined => {
  // In Cloudflare Pages/Workers, bindings are attached to process.env or the global scope
  // Ensure your `wrangler.toml` or Dashboard has a binding named 'DB'
  return process.env.DB as unknown as D1Database;
};

export const runtime = 'edge';

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      // Graceful fallback if DB isn't bound (e.g., during local dev without wrangler)
      console.warn("Database binding 'DB' not found. Returning empty list.");
      return NextResponse.json([]);
    }
    const { results } = await db.prepare("SELECT * FROM feeds ORDER BY created_at DESC").all();
    return NextResponse.json(results || []);
  } catch (e: any) {
    console.error("Database GET Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database binding not found' }, { status: 500 });
    }

    const body = await req.json();
    // Handle both single feed and array of feeds (import)
    const feeds = Array.isArray(body) ? body : [body];

    if (feeds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const stmt = db.prepare(
      "INSERT OR REPLACE INTO feeds (id, url, title, description, icon, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const batch = feeds.map((f: any) => stmt.bind(
      f.id, 
      f.url, 
      f.title, 
      f.description || '', 
      f.icon || '', 
      Date.now()
    ));

    await db.batch(batch);
    return NextResponse.json({ success: true, count: feeds.length });
  } catch (e: any) {
    console.error("Database POST Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database binding not found' }, { status: 500 });
    }

    await db.prepare("DELETE FROM feeds WHERE id = ?").bind(id).run();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Database DELETE Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

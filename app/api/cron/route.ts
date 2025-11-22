import { NextResponse } from 'next/server';
import { POST as refreshPost } from '../refresh/route';

export const runtime = 'edge';

interface D1Database {
  prepare: (query: string) => any;
}

const getDb = (): D1Database | undefined => process.env.DB as unknown as D1Database;

export async function GET() {
  // Cron trigger entry point (or manual bulk refresh)
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ error: 'DB not found' }, { status: 500 });

    const { results } = await db.prepare("SELECT id, url FROM feeds").all();
    const feeds = results || [];

    if (feeds.length === 0) return NextResponse.json({ message: 'No feeds to refresh' });

    // Execute refreshes in parallel (be mindful of subrequest limits on Workers)
    // In a real production env with many feeds, this should be queued.
    const report = await Promise.allSettled(feeds.map(async (feed: any) => {
       // Reuse the logic from Refresh route
       // We construct a mock request to call the exported POST function directly
       // or simpler: just call the fetch logic if extracted. 
       // To keep it clean, let's make an internal fetch call to our own API or duplicate logic?
       // Best practice in App Router: Extract logic to a service function.
       // For now, we will fetch our own API endpoint to reuse the exact code path.
       
       const baseUrl = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
       const res = await fetch(`${baseUrl.origin}/api/refresh`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ feedId: feed.id, url: feed.url })
       });
       return res.ok ? 'OK' : 'Failed';
    }));

    const success = report.filter(r => r.status === 'fulfilled' && r.value === 'OK').length;

    return NextResponse.json({ 
        success: true, 
        total: feeds.length, 
        updated: success 
    });

  } catch (e: any) {
    console.error("Cron Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
import { FeedData } from '../types';

// Helper to parse XML text
const parseXML = (xmlText: string): Document => {
  const parser = new DOMParser();
  return parser.parseFromString(xmlText.trim(), "text/xml");
};

// Helper to get text content safely
const getVal = (el: Element | null, tag: string): string => {
  if (!el) return '';
  
  // 1. Try finding by exact tag name (works for standard tags and sometimes namespaced ones depending on parser)
  let nodes = el.getElementsByTagName(tag);
  if (nodes && nodes.length > 0) {
    return (nodes[0].textContent || '').trim();
  }

  // 2. If tag has a colon, try finding by local name with wildcard namespace
  if (tag.includes(':')) {
    const localName = tag.split(':')[1];
    nodes = el.getElementsByTagNameNS("*", localName);
    if (nodes && nodes.length > 0) {
      return (nodes[0].textContent || '').trim();
    }
  }

  return '';
};

// Helper to get content from CDATA or text
const getContent = (el: Element, tags: string[]): string => {
  for (const tag of tags) {
    // Try exact match first
    let node = el.getElementsByTagName(tag)[0];
    
    // Try namespace agnostic match
    if (!node) {
        node = el.getElementsByTagNameNS("*", tag)[0];
    }

    if (node && node.textContent) {
      return node.textContent.trim();
    }
  }
  return '';
};

export const parseOPML = (xmlText: string): { title: string, url: string }[] => {
  try {
    const doc = parseXML(xmlText);
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

// Fetch and Parse Logic
export const fetchRSS = async (url: string): Promise<FeedData> => {
  let xmlString: string | null = null;
  let fetchError: any = null;

  // Strategy 1: Try AllOrigins (returns JSON with contents)
  // Good for avoiding CORS, handles HTTP->HTTPS well
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&t=${Date.now()}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.contents) {
        xmlString = data.contents;
      }
    }
  } catch (e) {
    console.warn(`AllOrigins proxy failed for ${url}`, e);
    fetchError = e;
  }

  // Strategy 2: Fallback to CorsProxy.io (returns raw text)
  // Good alternative if AllOrigins is down or blocking specific content
  if (!xmlString) {
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (response.ok) {
        xmlString = await response.text();
      }
    } catch (e) {
      console.warn(`CorsProxy failed for ${url}`, e);
      fetchError = e;
    }
  }

  // Strategy 3: Direct fetch (rarely works due to CORS, but good for local or compatible servers)
  if (!xmlString) {
     try {
       const response = await fetch(url);
       if (response.ok) {
         xmlString = await response.text();
       }
     } catch (e) {
       // Ignore direct fetch errors usually
     }
  }

  if (!xmlString) {
    throw new Error(`Failed to fetch RSS feed content. The feed might be blocking proxies. Error: ${fetchError?.message || 'Unknown'}`);
  }

  try {
    const xmlDoc = parseXML(xmlString);
    const isAtom = xmlDoc.querySelector('feed') !== null;
    
    let title = '';
    let description = '';
    let items: FeedData['items'] = [];

    if (isAtom) {
      const feed = xmlDoc.querySelector('feed');
      title = getVal(feed, 'title');
      description = getVal(feed, 'subtitle');
      
      const entries = xmlDoc.querySelectorAll('entry');
      entries.forEach(entry => {
        const entryTitle = getVal(entry, 'title');
        // Atom links
        const linkRel = entry.querySelector('link[rel="alternate"]');
        const entryLink = linkRel ? linkRel.getAttribute('href') || '' : getVal(entry, 'link');
        
        // Content priority: content -> summary
        const entryContent = getContent(entry, ['content', 'summary']);
        
        const entryPubDate = getVal(entry, 'published') || getVal(entry, 'updated');
        const entryAuthor = getVal(entry, 'author name') || getVal(entry, 'author');

        items.push({
          title: entryTitle,
          link: entryLink,
          content: fixRelativeUrls(entryContent, entryLink),
          contentSnippet: stripHtml(entryContent).substring(0, 150) + '...',
          pubDate: entryPubDate,
          author: entryAuthor
        });
      });
    } else {
      // RSS 2.0
      const channel = xmlDoc.querySelector('channel');
      title = getVal(channel, 'title');
      description = getVal(channel, 'description');

      const resItems = xmlDoc.querySelectorAll('item');
      resItems.forEach(item => {
        const itemTitle = getVal(item, 'title');
        const itemLink = getVal(item, 'link');
        
        // Content priority: content:encoded -> description
        const itemContent = getContent(item, ['encoded', 'content', 'description']);
        
        const itemPubDate = getVal(item, 'pubDate') || getVal(item, 'dc:date');
        const itemAuthor = getVal(item, 'author') || getVal(item, 'dc:creator');

        items.push({
          title: itemTitle,
          link: itemLink,
          content: fixRelativeUrls(itemContent, itemLink),
          contentSnippet: stripHtml(itemContent).substring(0, 150) + '...',
          pubDate: itemPubDate,
          author: itemAuthor
        });
      });
    }

    return { title, description, items };

  } catch (error) {
    console.error("RSS Parse Error:", error);
    throw new Error("Failed to parse RSS feed content");
  }
};

// Utilities
const stripHtml = (html: string) => {
  if (!html) return "";
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const fixRelativeUrls = (html: string, baseUrl: string) => {
  if (!html || !baseUrl) return html;
  try {
    const urlObj = new URL(baseUrl);
    const origin = urlObj.origin;
    return html.replace(/src="\/([^"]*)"/g, `src="${origin}/$1"`)
               .replace(/href="\/([^"]*)"/g, `href="${origin}/$1"`);
  } catch (e) {
    return html;
  }
};
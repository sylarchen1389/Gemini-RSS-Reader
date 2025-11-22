
// Helper to strip CDATA wrappers and decode entities
const cleanText = (text: string): string => {
  if (!text) return '';
  let cleaned = text.trim();
  // Remove CDATA
  cleaned = cleaned.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1');
  // Basic entity decoding
  cleaned = cleaned
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return cleaned.trim();
};

const getTagValue = (xml: string, tag: string): string => {
  // Match <tag>value</tag> or <tag ...>value</tag>
  // Handle namespaces like <dc:date> by matching (?:[a-zA-Z0-9]+:)?
  const regex = new RegExp(`<((?:[a-zA-Z0-9]+:)?${tag})(?:[^>]*)>(.*?)<\\/\\1>`, 'is');
  const match = xml.match(regex);
  return match ? cleanText(match[2]) : '';
};

const getAttrValue = (xml: string, tag: string, attr: string): string => {
  const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']*)["'][^>]*>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
};

export const fixRelativeUrls = (html: string, origin: string) => {
  if (!html) return "";
  return html
    .replace(/src="\/(?!\/)/g, `src="${origin}/`)
    .replace(/href="\/(?!\/)/g, `href="${origin}/`);
};

export const parseFeedServer = (xml: string) => {
  // Detect type
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');
  
  let title = '';
  let description = '';
  let items: any[] = [];

  if (isAtom) {
    // Atom
    title = getTagValue(xml, 'title');
    description = getTagValue(xml, 'subtitle');
    
    // Extract entries
    const entryRegex = /<entry[^>]*>(.*?)<\/entry>/gs;
    let match;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];
      const entryTitle = getTagValue(entryXml, 'title');
      let entryLink = getAttrValue(entryXml, 'link', 'href');
      if (!entryLink) entryLink = getTagValue(entryXml, 'id'); // Fallback
      
      const content = getTagValue(entryXml, 'content') || getTagValue(entryXml, 'summary');
      const pubDate = getTagValue(entryXml, 'published') || getTagValue(entryXml, 'updated');
      const author = getTagValue(entryXml, 'name') || getTagValue(entryXml, 'author'); // Simplified

      items.push({
        title: entryTitle,
        link: entryLink,
        content: content,
        contentSnippet: content.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
        pubDate: pubDate,
        author: author
      });
    }
  } else {
    // RSS 2.0
    const channelMatch = xml.match(/<channel[^>]*>(.*?)<\/channel>/s);
    if (channelMatch) {
      const channelXml = channelMatch[1];
      title = getTagValue(channelXml, 'title');
      description = getTagValue(channelXml, 'description');
    }

    // Extract items
    const itemRegex = /<item[^>]*>(.*?)<\/item>/gs;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const itemTitle = getTagValue(itemXml, 'title');
      const itemLink = getTagValue(itemXml, 'link');
      
      // Content: encoded > description
      let content = getTagValue(itemXml, 'encoded'); // content:encoded
      if (!content) content = getTagValue(itemXml, 'description');
      
      const pubDate = getTagValue(itemXml, 'pubDate') || getTagValue(itemXml, 'date'); // dc:date
      const author = getTagValue(itemXml, 'creator') || getTagValue(itemXml, 'author'); // dc:creator

      items.push({
        title: itemTitle,
        link: itemLink,
        content: content,
        contentSnippet: content.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
        pubDate: pubDate,
        author: author
      });
    }
  }

  return { title, description, items };
};

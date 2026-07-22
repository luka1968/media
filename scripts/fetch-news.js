import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Parser from 'rss-parser';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsZero/1.0 RSS Reader'
  }
});

const FEEDS = [
  {
    source: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/'
  },
  {
    source: 'Bitcoin Magazine',
    url: 'https://bitcoinmagazine.com/feed'
  },
  {
    source: 'Bitcoin.com News',
    url: 'https://news.bitcoin.com/feed/'
  },
  {
    source: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss'
  },
  {
    source: 'Finance Magnates',
    url: 'https://www.financemagnates.com/feed/'
  },
  {
    source: 'NewsBTC',
    url: 'https://www.newsbtc.com/feed/'
  },
  {
    source: 'CryptoNinjas',
    url: 'https://www.cryptoninjas.net/feed/'
  },
  {
    source: 'Brave New Coin',
    url: 'https://bravenewcoin.com/feed'
  }
];

function formatTime(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) dateObj = new Date();
  const utc8 = new Date(dateObj.getTime() + 8 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${utc8.getUTCFullYear()}-${pad(utc8.getUTCMonth() + 1)}-${pad(utc8.getUTCDate())} ${pad(utc8.getUTCHours())}:${pad(utc8.getUTCMinutes())}:${pad(utc8.getUTCSeconds())} +0800`;
}

function truncateHtml(htmlString) {
  if (!htmlString) return '';
  try {
    const contentDoc = new JSDOM(htmlString);
    const body = contentDoc.window.document.body;
    const children = Array.from(body.children);
    
    if (children.length > 2) {
      const keepCount = Math.ceil(children.length / 2);
      for (let i = keepCount; i < children.length; i++) {
        children[i].remove();
      }
      
      const ellipsis = contentDoc.window.document.createElement('p');
      ellipsis.style.color = '#888';
      ellipsis.style.fontStyle = 'italic';
      ellipsis.style.marginTop = '20px';
      ellipsis.textContent = '... [Article truncated. Click "Read Original Article" to read the full story on the original website]';
      body.appendChild(ellipsis);
      return body.innerHTML;
    }
    return htmlString;
  } catch (e) {
    return htmlString;
  }
}

async function fetchFullContent(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsZero/1.0 RSS Reader' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return null;
    const html = await response.text();
    const doc = new JSDOM(html, { url });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    return article ? article.content : null;
  } catch (err) {
    console.error(`Error fetching full content for ${url}:`, err.message);
    return null;
  }
}

async function fetchAllNews() {
  console.log('开始抓取 Crypto RSS 新闻数据...');
  const allNews = [];

  for (const feedConfig of FEEDS) {
    try {
      console.log(`正在抓取 [${feedConfig.source}]: ${feedConfig.url}`);
      let feedStr = '';
      try {
        const res = await fetch(feedConfig.url, { signal: AbortSignal.timeout(10000) });
        feedStr = (await res.text()).trim();
      } catch (e) {
        console.warn(`Fetch text fallback failed for ${feedConfig.source}: ${e.message}`);
      }
      
      let feed;
      if (feedStr) {
        feed = await parser.parseString(feedStr);
      } else {
        feed = await parser.parseURL(feedConfig.url);
      }

      const rawItems = (feed.items || []).slice(0, 8); // 取前8条以加快读取速度
      console.log(`获取到 ${rawItems.length} 条，开始提取全文...`);
      
      for (const item of rawItems) {
        const dateObj = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : new Date());
        const title = (item.title || '').trim();
        const url = item.link || '#';
        const id = crypto.createHash('md5').update(url).digest('hex').substring(0, 12);
        
        let imageUrl = null;
        if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('image/')) {
          imageUrl = item.enclosure.url;
        } else {
          const contentToSearch = item.content || item.contentSnippet || '';
          const imgMatch = contentToSearch.match(/<img[^>]+src="([^">]+)"/i);
          if (imgMatch) {
            imageUrl = imgMatch[1];
          }
        }

        let summary = (item.contentSnippet || item.content || '').trim();
        summary = summary.replace(/<[^>]*>?/gm, '');
        if (summary.length > 300) summary = summary.substring(0, 300) + '...';

        let fullContent = await fetchFullContent(url);
        if (!fullContent) fullContent = item.content || `<p>${summary}</p>`;
        
        // 强制所有内容（无论是抓取的还是 RSS 自带的）都只保留 50%
        fullContent = truncateHtml(fullContent);

        allNews.push({
          id,
          title,
          source: feedConfig.source,
          url,
          summary,
          content: fullContent,
          imageUrl,
          time: formatTime(dateObj),
          _timestamp: dateObj.getTime()
        });
      }
      console.log(`成功从 [${feedConfig.source}] 获取 ${rawItems.length} 条新闻 (含正文)`);
    } catch (error) {
      console.error(`抓取 [${feedConfig.source}] 失败:`, error.message);
    }
  }

  allNews.sort((a, b) => b._timestamp - a._timestamp);
  const formattedNews = allNews.map(({ _timestamp, ...rest }) => rest);

  const outputDirPublic = path.resolve(process.cwd(), 'public');
  const outputDirSrc    = path.resolve(process.cwd(), 'src/data');
  if (!fs.existsSync(outputDirPublic)) fs.mkdirSync(outputDirPublic, { recursive: true });
  if (!fs.existsSync(outputDirSrc))    fs.mkdirSync(outputDirSrc,    { recursive: true });

  const outputPathPublic = path.join(outputDirPublic, 'news.json');
  const outputPathSrc    = path.join(outputDirSrc,    'news.json');

  if (formattedNews.length === 0 && fs.existsSync(outputPathPublic)) {
    console.warn('本次抓取为 0 条，保留已有数据');
    return;
  }

  const jsonStr = JSON.stringify(formattedNews, null, 2);
  fs.writeFileSync(outputPathPublic, jsonStr, 'utf-8');
  fs.writeFileSync(outputPathSrc,    jsonStr, 'utf-8');
  console.log(`成功生成新闻数据: ${outputPathPublic} (共 ${formattedNews.length} 条)`);
}

fetchAllNews();

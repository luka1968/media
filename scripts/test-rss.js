import Parser from 'rss-parser';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NewsZero/1.0 RSS Reader'
  }
});

const feeds = [
  'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml',
  'https://www.rfi.fr/cn/rss',
  'https://rss.dw.com/xml/rss-chi',
  'https://cn.nytimes.com/rss/',
  'https://china.kyodonews.net/rss/news.xml',
  'https://cn.yna.co.kr/RSS/news.xml',
  'https://rthk.hk/rthk/news/rss/c_expressnews_clocal.xml'
];

async function testFeeds() {
  for (const f of feeds) {
    try {
      const feed = await parser.parseURL(f);
      const item = feed.items[0];
      console.log(`\n--- ${feed.title} ---`);
      console.log(`Title: ${item?.title}`);
      console.log(`Has content: ${!!item?.content}`);
      console.log(`Content length: ${item?.content?.length || 0}`);
      if (item?.content) {
        console.log(`Preview: ${item.content.substring(0, 150)}...`);
      }
    } catch (e) {
      console.log(`Failed to fetch ${f}: ${e.message}`);
    }
  }
}

testFeeds();

import newsJsonData from './news.json';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  summary: string;
  time: string;
}

export function getNewsItems(): NewsItem[] {
  if (Array.isArray(newsJsonData)) {
    return newsJsonData as NewsItem[];
  }
  return [];
}

export const newsItems: NewsItem[] = getNewsItems();

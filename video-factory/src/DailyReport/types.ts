export interface ProductItem {
  name: string;
  change: number;
  currentPrice: number;
  note?: string;
}

export interface SeriesItem {
  label: string;
  color: string;
  points: { date: string; price: number }[];
  startPrice: number;
  endPrice: number;
  change: number;
  changePct: number;
}

export interface CategorySection {
  directionLabel: string;
  directionType: "up" | "down" | "mixed" | "flat";
  totalChanged: number;
  upCount: number;
  downCount: number;
  avgChange?: number;
  downProducts: ProductItem[];
  upProducts: ProductItem[];
  compare?: {
    title: string;
    days: number;
    series: SeriesItem[];
  };
  summary: string;
  warning?: string;
}

export interface NewsItem {
  headline: string;
  content: string;
  stat?: string;
  statLabel?: string;
}

export interface DailyReportProps {
  date: string;
  ram: CategorySection;
  cpu: CategorySection;
  disk: CategorySection;
  gpu: CategorySection;
  news: NewsItem[];
}

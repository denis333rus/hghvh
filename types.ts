export enum SiteStatus {
  NORMAL = 'NORMAL',
  SLOWED = 'SLOWED',
  BLOCKED = 'BLOCKED',
  CONTENT_REMOVED = 'CONTENT_REMOVED',
  UNDER_APPEAL = 'UNDER_APPEAL'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface CourtVerdict {
  verdict: 'UPHOLD' | 'OVERTURN';
  reasoning: string;
  judgeName: string;
}

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  history: string[];
  historyIndex: number;
  content: string | null;
  status: SiteStatus;
  chatHistory: ChatMessage[];
  error: string | null;
}

export interface BrowserState {
  tabs: BrowserTab[];
  activeTabId: string;
}
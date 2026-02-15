import React, { useState, useEffect } from 'react';
import { SiteStatus, SearchResult, ChatMessage, BrowserTab, CourtVerdict } from './types';
import { searchWeb, chatWithSiteOwner, generatePageContent, judgeCourtCase } from './services/geminiService';
import { Browser } from './components/Browser';
import { RKNPanel } from './components/RKNPanel';
import { ChatWindow } from './components/ChatWindow';
import { CourtWindow } from './components/CourtWindow';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface CachedSiteData {
  url: string;
  title: string;
  content: string | null;
  status: SiteStatus;
  chatHistory: ChatMessage[];
  lastVisited: number;
}

export default function App() {
  // --- PERSISTENT STORAGE ---
  const [siteCache, setSiteCache] = useState<Record<string, CachedSiteData>>(() => {
    if (typeof window !== 'undefined') {
        try {
            const saved = localStorage.getItem('rkn_site_db');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to load cache", e);
            return {};
        }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('rkn_site_db', JSON.stringify(siteCache));
  }, [siteCache]);

  const updateCache = (url: string, data: Partial<CachedSiteData>) => {
      setSiteCache(prev => {
          const existing = prev[url] || {
              url,
              title: new URL(url).hostname,
              content: null,
              status: SiteStatus.NORMAL,
              chatHistory: [],
              lastVisited: Date.now()
          };
          return { 
              ...prev, 
              [url]: { ...existing, ...data, lastVisited: Date.now() } 
          };
      });
  };

  // --- BROWSER STATE ---
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: generateId(),
      url: 'about:home',
      title: 'Новая вкладка',
      isLoading: false,
      history: ['about:home'],
      historyIndex: 0,
      content: null,
      status: SiteStatus.NORMAL,
      chatHistory: [],
      error: null
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Court State
  const [isCourtOpen, setIsCourtOpen] = useState(false);
  const [currentVerdict, setCurrentVerdict] = useState<CourtVerdict | null>(null);
  const [isCourtLoading, setIsCourtLoading] = useState(false);

  // --- TAB HELPERS ---

  const getActiveTab = () => tabs.find(t => t.id === activeTabId)!;

  const updateTab = (id: string, updates: Partial<BrowserTab>) => {
    setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, ...updates } : tab));
  };

  const updateActiveTab = (updates: Partial<BrowserTab>) => {
    updateTab(activeTabId, updates);
  };

  // --- ACTIONS ---

  const handleNewTab = () => {
    const newTab: BrowserTab = {
      id: generateId(),
      url: 'about:home',
      title: 'Новая вкладка',
      isLoading: false,
      history: ['about:home'],
      historyIndex: 0,
      content: null,
      status: SiteStatus.NORMAL,
      chatHistory: [],
      error: null
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  const handleNavigate = async (url: string, newTabId?: string) => {
    const targetTabId = newTabId || activeTabId;
    const targetTab = tabs.find(t => t.id === targetTabId);
    if (!targetTab) return;

    if (url === 'about:home') {
        updateTab(targetTabId, {
            url: 'about:home',
            title: 'Новая вкладка',
            content: null,
            error: null,
            history: [...targetTab.history.slice(0, targetTab.historyIndex + 1), 'about:home'],
            historyIndex: targetTab.historyIndex + 1
        });
        return;
    }

    const cachedSite = siteCache[url];
    
    updateTab(targetTabId, {
        url,
        title: cachedSite ? cachedSite.title : url,
        isLoading: true,
        error: null,
        status: cachedSite ? cachedSite.status : SiteStatus.NORMAL,
        chatHistory: cachedSite ? cachedSite.chatHistory : [],
        history: [...targetTab.history.slice(0, targetTab.historyIndex + 1), url],
        historyIndex: targetTab.historyIndex + 1
    });

    setIsChatOpen(false);

    const currentStatus = cachedSite ? cachedSite.status : SiteStatus.NORMAL;
    const isBlocked = currentStatus === SiteStatus.BLOCKED;
    const isSlowed = currentStatus === SiteStatus.SLOWED;

    if (isBlocked) {
        setTimeout(() => {
            updateTab(targetTabId, {
                isLoading: false,
                error: 'ERR_CONNECTION_RESET'
            });
        }, 800);
        return;
    }

    if (cachedSite && cachedSite.content) {
        setTimeout(() => {
            updateTab(targetTabId, {
                isLoading: false,
                content: cachedSite.content,
                title: cachedSite.title
            });
        }, isSlowed ? 5000 : 300);
        return;
    }

    const delay = isSlowed ? 15000 : 1000;

    try {
        const title = new URL(url).hostname;
        const html = await generatePageContent(url, title, currentStatus === SiteStatus.CONTENT_REMOVED);
        
        updateCache(url, {
            content: html,
            title: title,
            status: SiteStatus.NORMAL 
        });

        setTimeout(() => {
            updateTab(targetTabId, {
                isLoading: false,
                content: html,
                title: title
            });
        }, delay);

    } catch (e) {
        setTimeout(() => {
            updateTab(targetTabId, {
                isLoading: false,
                error: 'ERR_CONNECTION_TIMED_OUT'
            });
        }, 1000);
    }
  };

  const reloadTab = async () => {
      const tab = getActiveTab();
      if (tab.url === 'about:home') return;
      
      const cachedSite = siteCache[tab.url];
      const currentStatus = cachedSite ? cachedSite.status : tab.status;

      updateActiveTab({ isLoading: true, error: null, status: currentStatus });
      
      const isBlocked = currentStatus === SiteStatus.BLOCKED;
      const isSlowed = currentStatus === SiteStatus.SLOWED;

      if (isBlocked) {
          setTimeout(() => updateActiveTab({ isLoading: false, error: 'ERR_CONNECTION_RESET' }), 800);
          return;
      }

      if (cachedSite && cachedSite.content) {
          setTimeout(() => {
              updateActiveTab({ isLoading: false, content: cachedSite.content });
          }, isSlowed ? 5000 : 500);
          return;
      }

      try {
        const html = await generatePageContent(tab.url, new URL(tab.url).hostname, currentStatus === SiteStatus.CONTENT_REMOVED);
        updateCache(tab.url, { content: html });
        setTimeout(() => {
            updateActiveTab({ isLoading: false, content: html });
        }, isSlowed ? 15000 : 1000);
      } catch (e) {
          updateActiveTab({ isLoading: false, error: 'ERR_FAILED' });
      }
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    const active = getActiveTab();
    if (active.url !== 'about:home') {
        await handleNavigate('about:home');
    }
    
    setSearchResults([]);
    const data = await searchWeb(query);
    setSearchResults(data);
    setIsSearching(false);
  };

  const handleBack = () => {
    const tab = getActiveTab();
    if (tab.historyIndex > 0) {
        const newIndex = tab.historyIndex - 1;
        const prevUrl = tab.history[newIndex];
        updateActiveTab({ historyIndex: newIndex, url: prevUrl });
        if (prevUrl === 'about:home') {
            updateActiveTab({ content: null, error: null, title: 'Новая вкладка' });
        } else {
            reloadContentForUrl(prevUrl, tab.id);
        }
    }
  };

  const handleForward = () => {
    const tab = getActiveTab();
    if (tab.historyIndex < tab.history.length - 1) {
        const newIndex = tab.historyIndex + 1;
        const nextUrl = tab.history[newIndex];
        updateActiveTab({ historyIndex: newIndex, url: nextUrl });
        if (nextUrl === 'about:home') {
            updateActiveTab({ content: null, error: null, title: 'Новая вкладка' });
        } else {
            reloadContentForUrl(nextUrl, tab.id);
        }
    }
  };

  const reloadContentForUrl = async (url: string, tabId: string) => {
     const tab = tabs.find(t => t.id === tabId);
     if (!tab) return;
     
     const cachedSite = siteCache[url];
     const currentStatus = cachedSite ? cachedSite.status : tab.status;

     updateTab(tabId, { isLoading: true, error: null, status: currentStatus });
     
     if (currentStatus === SiteStatus.BLOCKED) {
         setTimeout(() => updateTab(tabId, { isLoading: false, error: 'ERR_CONNECTION_RESET' }), 500);
         return;
     }

     if (cachedSite && cachedSite.content) {
         setTimeout(() => {
             updateTab(tabId, { isLoading: false, content: cachedSite.content, title: cachedSite.title });
         }, currentStatus === SiteStatus.SLOWED ? 5000 : 200);
         return;
     }

     try {
         const html = await generatePageContent(url, new URL(url).hostname, currentStatus === SiteStatus.CONTENT_REMOVED);
         updateCache(url, { content: html });
         setTimeout(() => {
             updateTab(tabId, { isLoading: false, content: html, title: new URL(url).hostname });
         }, currentStatus === SiteStatus.SLOWED ? 15000 : 1000);
     } catch (e) {
         updateTab(tabId, { isLoading: false, error: 'ERR_LOAD' });
     }
  };

  // --- RKN ACTIONS ---

  const handleBlock = () => {
    const active = getActiveTab();
    if(active.url === 'about:home') return;

    // 40% chance of appeal immediately on block
    const willAppeal = Math.random() < 0.4;
    const newStatus = willAppeal ? SiteStatus.UNDER_APPEAL : SiteStatus.BLOCKED;

    updateCache(active.url, { status: newStatus });
    updateActiveTab({ status: newStatus });
    reloadContentForUrl(active.url, active.id);
    
    if (willAppeal) {
        alert("Владелец сайта подал экстренную апелляцию в Верховный Цифровой Суд!");
    }
  };

  const handleSlow = () => {
    const active = getActiveTab();
    if(active.url === 'about:home') return;

    updateCache(active.url, { status: SiteStatus.SLOWED });
    updateActiveTab({ status: SiteStatus.SLOWED });
    reloadContentForUrl(active.url, active.id);
  };

  const handleUnrestrict = () => {
    const active = getActiveTab();
    if(active.url === 'about:home') return;

    updateCache(active.url, { status: SiteStatus.NORMAL });
    updateActiveTab({ status: SiteStatus.NORMAL });
    reloadContentForUrl(active.url, active.id);
  };

  // --- COURT ACTIONS ---

  const handleOpenCourt = async () => {
    const active = getActiveTab();
    if (active.status !== SiteStatus.UNDER_APPEAL) return;

    setIsCourtOpen(true);
    setIsCourtLoading(true);
    setCurrentVerdict(null);

    const verdict = await judgeCourtCase(
        active.title, 
        active.content || "Empty content", 
        active.chatHistory
    );

    setCurrentVerdict(verdict);
    setIsCourtLoading(false);
  };

  const handleCourtClose = (finalVerdict: 'UPHOLD' | 'OVERTURN') => {
    const active = getActiveTab();
    const newStatus = finalVerdict === 'UPHOLD' ? SiteStatus.BLOCKED : SiteStatus.NORMAL;
    
    updateCache(active.url, { status: newStatus });
    updateActiveTab({ status: newStatus });
    
    setIsCourtOpen(false);
    reloadContentForUrl(active.url, active.id);
  };

  const handleChatSendMessage = async (text: string) => {
    const tab = getActiveTab();
    if (tab.url === 'about:home') return;

    const currentHistory = tab.chatHistory;
    const newHistory = [
      ...currentHistory,
      { role: 'user', text, timestamp: Date.now() } as ChatMessage
    ];

    updateActiveTab({ chatHistory: newHistory });
    updateCache(tab.url, { chatHistory: newHistory });
    
    setIsChatTyping(true);

    const { reply, agreedToRemove } = await chatWithSiteOwner(tab.url, newHistory, text);
    setIsChatTyping(false);

    const finalHistory = [
      ...newHistory,
      { role: 'model', text: reply, timestamp: Date.now() } as ChatMessage
    ];

    let statusUpdates: Partial<CachedSiteData> = { chatHistory: finalHistory };
    if (agreedToRemove) {
        statusUpdates.status = SiteStatus.CONTENT_REMOVED;
        statusUpdates.content = null; 
    }

    updateCache(tab.url, statusUpdates);
    updateActiveTab({ 
        chatHistory: finalHistory,
        ...(agreedToRemove ? { status: SiteStatus.CONTENT_REMOVED } : {})
    });
    
    if (agreedToRemove) {
        reloadContentForUrl(tab.url, tab.id);
    }
  };

  const activeTab = getActiveTab();

  return (
    <div className="h-screen w-screen bg-gray-50 flex overflow-hidden font-sans">
      
      <div className="flex-1 flex flex-col h-full relative z-0 p-2">
        <Browser 
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitchTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={handleNewTab}
            onNavigate={handleNavigate}
            onBack={handleBack}
            onForward={handleForward}
            onReload={reloadTab}
            onSearch={handleSearch}
            isSearching={isSearching}
            searchResults={searchResults}
        />
      </div>

      <RKNPanel 
        currentUrl={activeTab.url === 'about:home' ? '' : activeTab.url}
        currentStatus={activeTab.status}
        onBlock={handleBlock}
        onSlow={handleSlow}
        onContact={() => setIsChatOpen(true)}
        onUnrestrict={handleUnrestrict}
        onOpenCourt={handleOpenCourt}
      />

      {isChatOpen && activeTab.url !== 'about:home' && (
        <ChatWindow 
            ownerName={new URL(activeTab.url).hostname}
            messages={activeTab.chatHistory}
            onSendMessage={handleChatSendMessage}
            onClose={() => setIsChatOpen(false)}
            isTyping={isChatTyping}
        />
      )}

      {isCourtOpen && (
        <CourtWindow 
            siteTitle={activeTab.title}
            verdict={currentVerdict}
            chatHistory={activeTab.chatHistory}
            onClose={handleCourtClose}
            isLoading={isCourtLoading}
        />
      )}

    </div>
  );
}
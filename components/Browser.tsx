import React, { useState, useEffect, useRef } from 'react';
import { BrowserTab, SiteStatus, SearchResult } from '../types';

interface BrowserProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onSearch: (query: string) => void; // Triggered from the internal search page
  isSearching: boolean; // For the search page spinner
  searchResults: SearchResult[]; // For the search page results
}

export const Browser: React.FC<BrowserProps> = ({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onNewTab,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onSearch,
  isSearching,
  searchResults
}) => {
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const [addressBarInput, setAddressBarInput] = useState(activeTab?.url || "");
  const [progress, setProgress] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Sync address bar when active tab or its URL changes
  useEffect(() => {
    if (activeTab) {
        setAddressBarInput(activeTab.url === 'about:home' ? '' : activeTab.url);
        // Reset scroll on new content
        if (viewportRef.current) viewportRef.current.scrollTop = 0;
    }
  }, [activeTab?.id, activeTab?.url]);

  // Fake progress bar logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeTab?.isLoading) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress(p => (p < 90 ? p + (activeTab.status === SiteStatus.SLOWED ? 0.5 : 5) : p));
      }, 100);
    } else {
      setProgress(100);
      setTimeout(() => setProgress(0), 500);
    }
    return () => clearInterval(interval);
  }, [activeTab?.isLoading, activeTab?.status]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      let url = addressBarInput.trim();
      if (!url) return;
      
      // Basic heuristic: if it has no dot and spaces, it's a search
      if (!url.includes('.') || url.includes(' ')) {
        onSearch(url); // This will trigger search results in the current tab (conceptually)
      } else {
        if (!url.startsWith('http')) url = 'https://' + url;
        onNavigate(url);
      }
    }
  };

  const resolveUrl = (href: string) => {
    if (!href || href === '#' || href === 'javascript:void(0)' || href.startsWith('javascript:')) return null;
    
    // Absolute HTTP/HTTPS
    if (href.startsWith('http')) return href;

    // Relative path
    try {
        const currentUrl = activeTab.url;
        // If current is pseudo-url, use a dummy base
        const base = currentUrl.startsWith('http') ? currentUrl : 'https://example.com';
        const urlObj = new URL(href, base);
        return urlObj.href;
    } catch (e) {
        // Fallback: Just append to example.com if something fails
        return `https://example.com/${href.replace(/^\//, '')}`;
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // 1. Check for Anchor
    const anchor = target.closest('a');
    if (anchor) {
        e.preventDefault();
        const href = anchor.getAttribute('href');
        if (href) {
             const resolved = resolveUrl(href);
             if (resolved) onNavigate(resolved);
        }
        return;
    }

    // 2. Check for Button (Simulate navigation)
    const button = target.closest('button');
    if (button) {
        e.preventDefault();
        // Generate a fake URL based on button text
        const text = button.innerText.trim().slice(0, 30).replace(/[^a-zA-Z0-9а-яА-Я\s]/g, '').replace(/\s+/g, '-').toLowerCase();
        // If empty text, assume it's an icon button or something, default to 'action'
        const fakePath = text ? `/${text}` : '/action';
        
        const resolved = resolveUrl(fakePath);
        if (resolved) onNavigate(resolved);
    }
  };

  if (!activeTab) return <div className="bg-gray-200 h-full flex items-center justify-center">No Tabs Open</div>;

  return (
    <div className="flex flex-col h-full bg-gray-100 shadow-2xl rounded-lg overflow-hidden border border-gray-400">
      
      {/* 1. Tab Bar */}
      <div className="bg-[#dee1e6] flex items-end px-2 pt-2 gap-1 overflow-x-auto select-none">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => onSwitchTab(tab.id)}
            className={`group relative flex items-center gap-2 px-3 py-2 text-xs max-w-[200px] min-w-[120px] rounded-t-lg cursor-pointer transition-colors ${
              tab.id === activeTabId 
                ? 'bg-white text-gray-800 shadow-sm z-10' 
                : 'bg-transparent text-gray-600 hover:bg-gray-200'
            }`}
          >
            <i className={`fas ${tab.url === 'about:home' ? 'fa-search' : 'fa-globe'} text-gray-400`}></i>
            <span className="truncate flex-1 font-medium">
              {tab.url === 'about:home' ? 'Новая вкладка' : tab.title || tab.url}
            </span>
            <div 
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
              className="w-4 h-4 rounded-full hover:bg-gray-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <i className="fas fa-times text-[10px]"></i>
            </div>
            
            {/* Tab separator */}
            {tab.id !== activeTabId && <div className="absolute right-0 h-4 w-[1px] bg-gray-400 top-1/2 -translate-y-1/2"></div>}
          </div>
        ))}
        <button 
          onClick={onNewTab}
          className="p-2 hover:bg-gray-300 rounded-full w-8 h-8 flex items-center justify-center ml-1 mb-1 transition-colors"
        >
          <i className="fas fa-plus text-gray-600 text-sm"></i>
        </button>
      </div>

      {/* 2. Navigation & Address Bar */}
      <div className="bg-white border-b border-gray-200 p-2 flex items-center gap-2 z-20 shadow-sm relative">
        <div className="flex gap-1 text-gray-600">
            <button 
                onClick={onBack} 
                disabled={activeTab.historyIndex <= 0}
                className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
            >
                <i className="fas fa-arrow-left"></i>
            </button>
            <button 
                onClick={onForward} 
                disabled={activeTab.historyIndex >= activeTab.history.length - 1}
                className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center disabled:opacity-30 transition-colors"
            >
                <i className="fas fa-arrow-right"></i>
            </button>
            <button 
                onClick={onReload} 
                className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
            >
                <i className={`fas fa-rotate-right ${activeTab.isLoading ? 'animate-spin' : ''}`}></i>
            </button>
             <button 
                onClick={() => onNavigate('about:home')} 
                className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors"
            >
                <i className="fas fa-home"></i>
            </button>
        </div>

        {/* Address Input */}
        <div className="flex-1 relative">
            <div className={`absolute inset-y-0 left-3 flex items-center pointer-events-none ${
                activeTab.status === SiteStatus.BLOCKED ? 'text-red-500' : 
                activeTab.url.startsWith('https') ? 'text-green-600' : 'text-gray-400'
            }`}>
                {activeTab.status === SiteStatus.BLOCKED ? <i className="fas fa-ban"></i> : 
                 activeTab.url === 'about:home' ? <i className="fas fa-search"></i> : <i className="fas fa-lock"></i>}
            </div>
            <input 
                type="text"
                value={addressBarInput}
                onChange={(e) => setAddressBarInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={(e) => e.target.select()}
                className="w-full bg-gray-100 hover:bg-gray-200 focus:bg-white border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-full py-2 pl-10 pr-4 text-sm transition-all outline-none text-gray-700"
                placeholder="Введите поисковый запрос или URL"
            />
        </div>

        {/* Browser Menu placeholder */}
        <div className="w-8 h-8 hover:bg-gray-100 rounded-full flex items-center justify-center cursor-pointer text-gray-600">
            <i className="fas fa-ellipsis-vertical"></i>
        </div>

        {/* Loading Line */}
        {activeTab.isLoading && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-100">
                <div 
                    className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        )}
      </div>

      {/* 3. Content Area */}
      <div 
        ref={viewportRef}
        className="flex-1 bg-white overflow-y-auto relative scroll-smooth"
      >
        {/* CASE A: New Tab / Home Page */}
        {activeTab.url === 'about:home' && (
            <div className="min-h-full flex flex-col items-center justify-center p-4 bg-white">
                <div className="w-full max-w-2xl text-center -mt-20">
                    <div className="mb-8 relative select-none cursor-default">
                        <h1 className="text-7xl font-bold tracking-tighter inline-block">
                            <span className="text-blue-500">G</span>
                            <span className="text-red-500">o</span>
                            <span className="text-yellow-500">o</span>
                            <span className="text-blue-500">g</span>
                            <span className="text-green-500">l</span>
                            <span className="text-red-500">e</span>
                        </h1>
                         <div className="absolute -top-6 -right-12 rotate-12 bg-gray-900 text-white text-xs px-2 py-1 rounded font-mono">
                            КОНТРОЛИРУЕТСЯ РКН
                        </div>
                    </div>
                    
                    <div className="relative group max-w-xl mx-auto">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <i className="fas fa-search text-gray-400"></i>
                        </div>
                        <input 
                            type="text" 
                            className="w-full p-3 pl-10 rounded-full border border-gray-200 shadow-sm focus:shadow-md focus:outline-none focus:ring-1 focus:ring-gray-200 transition-shadow"
                            placeholder="Поиск в интернете..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onSearch((e.target as HTMLInputElement).value);
                                }
                            }}
                        />
                    </div>

                    {/* Search Results */}
                    {isSearching && (
                        <div className="mt-8">
                             <i className="fas fa-circle-notch fa-spin text-blue-500 text-2xl"></i>
                        </div>
                    )}

                    {!isSearching && searchResults.length > 0 && (
                        <div className="mt-8 w-full text-left space-y-6 max-w-2xl mx-auto">
                            {searchResults.map((result, idx) => (
                                <div key={idx} className="group font-sans">
                                    <div className="flex items-center gap-2 mb-1 text-sm text-gray-700">
                                        <div className="bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center text-xs">
                                            <i className="fas fa-globe text-gray-500"></i>
                                        </div>
                                        <span className="truncate">{result.url}</span>
                                    </div>
                                    <h3 
                                        onClick={() => onNavigate(result.url)}
                                        className="text-xl text-blue-800 hover:underline cursor-pointer visited:text-purple-900 font-medium"
                                    >
                                        {result.title}
                                    </h3>
                                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">
                                        {result.snippet}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* CASE B: Active Site Render */}
        {activeTab.url !== 'about:home' && (
            <>
                {/* Error State */}
                {activeTab.error && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 p-8 bg-white select-none">
                        <i className="fas fa-wifi text-6xl mb-4 text-gray-400"></i>
                        <h2 className="text-2xl font-bold mb-2">Не удается получить доступ к сайту</h2>
                        <p className="mb-4 text-sm font-mono text-gray-500">{activeTab.error}</p>
                        <div className="text-sm text-gray-500 max-w-md text-center">
                            {activeTab.status === SiteStatus.BLOCKED ? 
                                "Доступ к информационному ресурсу ограничен на основании Федерального закона." : 
                                "Соединение было сброшено. Проверьте подключение к сети."}
                        </div>
                    </div>
                )}

                {/* Loading State for Slowed/Normal */}
                {!activeTab.error && !activeTab.content && activeTab.isLoading && (
                    <div className="flex items-center justify-center h-full bg-white">
                        {activeTab.status === SiteStatus.SLOWED && (
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                                <p className="text-gray-500 animate-pulse">Установка защищенного соединения... (Замедление)</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Rendered Content */}
                {!activeTab.error && activeTab.content && !activeTab.isLoading && (
                    <div 
                        className="prose max-w-none w-full min-h-full" 
                        dangerouslySetInnerHTML={{ __html: activeTab.content }} 
                        onClick={handleContentClick}
                    />
                )}
            </>
        )}
      </div>
    </div>
  );
};
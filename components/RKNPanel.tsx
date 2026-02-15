import React from 'react';
import { SiteStatus } from '../types';

interface RKNPanelProps {
  currentUrl: string;
  currentStatus: SiteStatus;
  onBlock: () => void;
  onSlow: () => void;
  onContact: () => void;
  onUnrestrict: () => void;
  onOpenCourt: () => void;
}

const statusMap: Record<SiteStatus, string> = {
  [SiteStatus.NORMAL]: 'НОРМА',
  [SiteStatus.SLOWED]: 'ЗАМЕДЛЕНО',
  [SiteStatus.BLOCKED]: 'ЗАБЛОКИРОВАНО',
  [SiteStatus.CONTENT_REMOVED]: 'КОНТЕНТ УДАЛЕН',
  [SiteStatus.UNDER_APPEAL]: 'В СУДЕ'
};

export const RKNPanel: React.FC<RKNPanelProps> = ({ 
  currentUrl, 
  currentStatus, 
  onBlock, 
  onSlow, 
  onContact,
  onUnrestrict,
  onOpenCourt
}) => {
  const isLocked = currentStatus === SiteStatus.UNDER_APPEAL;

  return (
    <div className="bg-gray-900 text-white w-64 flex flex-col border-l border-gray-700 shadow-2xl z-50">
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-red-700 rounded flex items-center justify-center font-bold border border-red-500">
                РК
            </div>
            <h2 className="font-bold text-lg tracking-wider">ТСПУ</h2>
        </div>
        <p className="text-xs text-gray-400 uppercase">Система управления трафиком</p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="mb-6">
            <label className="text-xs text-gray-500 uppercase font-bold block mb-2">ЦЕЛЬ</label>
            <div className="bg-black/50 p-2 rounded border border-gray-700 font-mono text-xs break-all text-green-400">
                {currentUrl || "НЕТ АКТИВНОЙ ЦЕЛИ"}
            </div>
        </div>

        <div className="mb-6">
             <label className="text-xs text-gray-500 uppercase font-bold block mb-2">ТЕКУЩИЙ СТАТУС</label>
             <div className={`p-2 rounded text-center font-bold text-sm border relative overflow-hidden ${
                 currentStatus === SiteStatus.NORMAL ? 'bg-green-900/30 border-green-600 text-green-400' :
                 currentStatus === SiteStatus.SLOWED ? 'bg-yellow-900/30 border-yellow-600 text-yellow-400' :
                 currentStatus === SiteStatus.BLOCKED ? 'bg-red-900/30 border-red-600 text-red-400' :
                 currentStatus === SiteStatus.UNDER_APPEAL ? 'bg-purple-900/30 border-purple-600 text-purple-400 animate-pulse' :
                 'bg-blue-900/30 border-blue-600 text-blue-400'
             }`}>
                 {statusMap[currentStatus]}
                 {currentStatus === SiteStatus.UNDER_APPEAL && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 animate-[shimmer_2s_infinite]"></div>
                 )}
             </div>
        </div>

        <div className="space-y-3">
            <label className="text-xs text-gray-500 uppercase font-bold block">ДЕЙСТВИЯ</label>
            
            {currentStatus === SiteStatus.UNDER_APPEAL ? (
                <button 
                    onClick={onOpenCourt}
                    className="w-full flex items-center justify-between p-4 bg-purple-800 hover:bg-purple-700 rounded border border-purple-500 transition-all shadow-lg shadow-purple-900/20"
                >
                    <span className="text-sm font-bold">ЯВИТЬСЯ В СУД</span>
                    <i className="fas fa-gavel text-white animate-bounce"></i>
                </button>
            ) : (
                <>
                    <button 
                        onClick={onSlow}
                        disabled={isLocked || currentStatus === SiteStatus.SLOWED || !currentUrl}
                        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                    >
                        <span className="text-sm font-medium">Замедление</span>
                        <i className="fas fa-gauge-high text-yellow-500 group-hover:scale-110 transition-transform"></i>
                    </button>

                    <button 
                        onClick={onBlock}
                        disabled={isLocked || currentStatus === SiteStatus.BLOCKED || !currentUrl}
                        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                    >
                        <span className="text-sm font-medium">Блокировка</span>
                        <i className="fas fa-ban text-red-500 group-hover:scale-110 transition-transform"></i>
                    </button>

                    <button 
                        onClick={onContact}
                        disabled={isLocked || !currentUrl}
                        className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                    >
                        <span className="text-sm font-medium">Связаться</span>
                        <i className="fas fa-comments text-blue-500 group-hover:scale-110 transition-transform"></i>
                    </button>

                    {(currentStatus === SiteStatus.BLOCKED || currentStatus === SiteStatus.SLOWED) && (
                        <button 
                            onClick={onUnrestrict}
                            className="w-full flex items-center justify-between p-3 bg-green-900/20 hover:bg-green-900/40 rounded border border-green-800 transition-all mt-4"
                        >
                            <span className="text-sm font-medium text-green-400">Восстановить доступ</span>
                            <i className="fas fa-check text-green-400"></i>
                        </button>
                    )}
                </>
            )}
        </div>
      </div>

      <div className="p-4 bg-gray-950 border-t border-gray-800 text-xs text-gray-600 font-mono">
        ВРЕМЯ_РАБОТЫ: 99.9%<br/>
        УЗЕЛ: МОСКВА_ЦЕНТР
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { CourtVerdict, ChatMessage } from '../types';

interface CourtWindowProps {
  siteTitle: string;
  verdict: CourtVerdict | null;
  chatHistory: ChatMessage[];
  onClose: (finalVerdict: 'UPHOLD' | 'OVERTURN') => void;
  isLoading: boolean;
}

export const CourtWindow: React.FC<CourtWindowProps> = ({ 
  siteTitle, 
  verdict, 
  chatHistory, 
  onClose,
  isLoading
}) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!isLoading && stage < 3) {
      const timer = setTimeout(() => setStage(s => s + 1), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, stage]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-[#f4f1ea] w-full max-w-4xl max-h-[90vh] rounded shadow-2xl overflow-hidden border-8 border-[#3d2b1f] flex flex-col font-serif">
        
        {/* Header */}
        <div className="bg-[#3d2b1f] text-white p-6 flex items-center justify-between border-b-4 border-[#d4af37]">
          <div className="flex items-center gap-4">
            <i className="fas fa-gavel text-4xl text-[#d4af37]"></i>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ВЕРХОВНЫЙ ЦИФРОВОЙ СУД</h1>
              <p className="text-xs uppercase tracking-widest text-[#d4af37]">Апелляционное производство №{Math.floor(Math.random()*9000)+1000}</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-sm font-bold">{new Date().toLocaleDateString('ru-RU')}</div>
             <div className="text-[10px] uppercase">Москва, Кремлевская наб.</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Section 1: Introduction */}
          <div className={`transition-opacity duration-1000 ${stage >= 0 ? 'opacity-100' : 'opacity-0'}`}>
            <h2 className="text-xl font-bold border-b border-gray-400 pb-2 mb-4">I. СТОРОНЫ ДЕЛА</h2>
            <div className="grid grid-cols-2 gap-8 text-sm">
              <div className="bg-white/50 p-4 rounded border border-gray-300">
                <p className="font-bold text-gray-500 mb-1">ОТВЕТЧИК (РКН):</p>
                <p className="text-lg">Государственный инспектор</p>
              </div>
              <div className="bg-white/50 p-4 rounded border border-gray-300">
                <p className="font-bold text-gray-500 mb-1">ИСТЕЦ (ЗАЯВИТЕЛЬ):</p>
                <p className="text-lg">{siteTitle}</p>
              </div>
            </div>
          </div>

          {/* Section 2: Evidence Analysis */}
          <div className={`transition-opacity duration-1000 ${stage >= 1 ? 'opacity-100' : 'opacity-0'}`}>
             <h2 className="text-xl font-bold border-b border-gray-400 pb-2 mb-4">II. ИЗУЧЕНИЕ МАТЕРИАЛОВ</h2>
             <div className="space-y-4">
                <div className="bg-gray-200 p-4 rounded font-mono text-xs max-h-40 overflow-y-auto">
                    <p className="font-bold mb-2 uppercase text-gray-600 border-b border-gray-300 pb-1">Протокол переговоров:</p>
                    {chatHistory.length > 0 ? chatHistory.map((m, i) => (
                        <div key={i} className="mb-1">
                            <span className={m.role === 'user' ? 'text-blue-700' : 'text-red-700'}>
                                [{m.role === 'user' ? 'РКН' : 'ИСТЕЦ'}]:
                            </span> {m.text}
                        </div>
                    )) : <p className="italic">Переговоры не велись.</p>}
                </div>
                <p className="text-sm italic">Суд изучил содержимое веб-страниц на предмет нарушения ФЗ-139 и ФЗ-149...</p>
             </div>
          </div>

          {/* Section 3: Verdict */}
          <div className={`transition-opacity duration-1000 ${stage >= 2 ? 'opacity-100' : 'opacity-0'}`}>
             <h2 className="text-xl font-bold border-b border-gray-400 pb-2 mb-4">III. РЕШЕНИЕ СУДА</h2>
             {isLoading ? (
                <div className="flex flex-col items-center py-10">
                    <i className="fas fa-circle-notch fa-spin text-4xl text-[#3d2b1f] mb-4"></i>
                    <p className="animate-pulse">Судья удалился в совещательную комнату...</p>
                </div>
             ) : (
                <div className="bg-white p-8 border-4 border-double border-[#3d2b1f] relative">
                    <div className="absolute -top-4 -right-4 bg-[#d4af37] text-[#3d2b1f] font-bold px-4 py-2 transform rotate-12 shadow-lg border-2 border-[#3d2b1f]">
                        {verdict?.verdict === 'UPHOLD' ? 'ОТКАЗАНО' : 'УДОВЛЕТВОРЕНО'}
                    </div>
                    
                    <p className="text-lg leading-relaxed mb-6 first-letter:text-4xl first-letter:font-bold">
                        {verdict?.reasoning}
                    </p>
                    
                    <div className="flex justify-between items-end mt-12">
                        <div className="text-center italic">
                            <div className="border-b border-black w-48 mb-1"></div>
                            <div className="text-xs">подпись секретаря</div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold">Судья: {verdict?.judgeName}</p>
                            <p className="text-xs opacity-70">Печать установлена в электронном виде</p>
                        </div>
                    </div>
                </div>
             )}
          </div>

        </div>

        {/* Footer Actions */}
        {stage >= 3 && !isLoading && (
          <div className="bg-[#3d2b1f]/10 p-6 flex justify-center">
            <button 
                onClick={() => verdict && onClose(verdict.verdict)}
                className="bg-[#3d2b1f] text-white px-12 py-3 rounded font-bold hover:bg-[#5a4030] transition-colors shadow-lg uppercase tracking-widest"
            >
              Принять к исполнению
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

interface ChatWindowProps {
  ownerName: string;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClose: () => void;
  isTyping: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  ownerName, 
  messages, 
  onSendMessage, 
  onClose,
  isTyping
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput("");
  };

  return (
    <div className="absolute bottom-4 right-72 w-96 h-[500px] bg-white rounded-t-lg shadow-2xl flex flex-col border border-gray-300 z-50 font-sans">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="font-bold text-sm truncate max-w-[200px]">Владелец: {ownerName}</span>
        </div>
        <button onClick={onClose} className="hover:text-gray-200">
            <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
        {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-10">
                <i className="fas fa-shield-alt text-4xl mb-2 text-gray-300"></i>
                <p>Официальный канал связи открыт.</p>
                <p>Четко сформулируйте требования.</p>
            </div>
        )}
        
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
                className={`max-w-[80%] p-3 rounded-lg text-sm shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                }`}
            >
                {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
            <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-lg rounded-bl-none shadow-sm flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Введите требование..."
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            disabled={isTyping}
        />
        <button 
            type="submit" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            disabled={!input.trim() || isTyping}
        >
            <i className="fas fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};
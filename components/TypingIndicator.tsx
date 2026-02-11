import React from 'react';
import { Bot } from 'lucide-react';

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex w-full justify-start mb-6 animate-fade-in-up">
      <div className="flex max-w-[80%] gap-3">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
          <Bot size={16} />
        </div>
        <div className="bg-white border border-slate-200 px-4 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5 h-12">
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Sender, QuerySource } from '../types';
import { User, Database, FileText, Code } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === Sender.User;

  return (
    <div
      className={`flex w-full ${
        isUser ? 'justify-end' : 'justify-start'
      } mb-6 animate-fade-in-up`}
    >
      <div
        className={`flex max-w-[85%] gap-3 ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600 overflow-hidden'
          }`}
        >
          {isUser ? (
            <User size={16} />
          ) : (
            <img 
              src="/domo-square-logo.png" 
              alt="Bot" 
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col gap-1 min-w-0 max-w-full">
          <div
            className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed ${
              isUser
                ? 'bg-brand-600 text-white rounded-tr-none'
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
            }`}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.text}</div>
            ) : (
              <div className="prose prose-sm prose-slate max-w-none 
                  prose-headings:font-semibold prose-headings:text-slate-800 prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0
                  prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-3 last:prose-p:mb-0
                  prose-strong:text-slate-900 prose-strong:font-semibold
                  prose-ul:my-3 prose-ul:list-disc prose-ul:pl-4
                  prose-li:text-slate-700 prose-li:mb-1
                  prose-code:text-brand-700 prose-code:bg-brand-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:text-slate-800 prose-pre:rounded-lg
                  prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown>
                  {message.text}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Query Source Badge (Bot only) */}
          {!isUser && message.querySource && (
            <div className="flex flex-wrap gap-2 mt-2 ml-1">
              {message.querySource === QuerySource.Dataset ? (
                <div className="flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-200">
                  <Database size={12} className="mr-1.5" />
                  <span className="font-medium">Dataset Query</span>
                  {message.datasetUsed && (
                    <span className="ml-1 text-blue-600">• {message.datasetUsed}</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-200">
                  <FileText size={12} className="mr-1.5" />
                  <span className="font-medium">Document Search</span>
                </div>
              )}
            </div>
          )}

          {/* SQL Query Display (Dataset queries only) */}
          {!isUser && message.sqlGenerated && (
            <details className="mt-2 ml-1 text-xs">
              <summary className="cursor-pointer flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors">
                <Code size={12} />
                <span className="font-medium">View SQL Query</span>
              </summary>
              <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md font-mono text-[11px] text-slate-700 overflow-x-auto">
                {message.sqlGenerated}
              </div>
            </details>
          )}

          {/* Sources Footnote (Document queries only) */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 ml-1">
              {message.sources.map((source, idx) => (
                <div
                  key={idx}
                  className="flex items-center text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200"
                >
                  <FileText size={10} className="mr-1" />
                  <span className="truncate max-w-[150px]">{source}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Timestamp */}
          <span className={`text-[10px] text-slate-400 ${isUser ? 'text-right' : 'text-left'} px-1`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2, Database, FileText } from 'lucide-react';
import { Message, Sender, Fileset, QuerySource } from './types';
import { handleSmartQuery, getFilesets } from './services/domoService';
import ChatBubble from './components/ChatBubble';
import TypingIndicator from './components/TypingIndicator';

// Logo configuration - update this path to use your custom logo
// Place your logo file in the public/ directory and update the path below
// Example: '/my-logo.png' or '/logo.png'
const LOGO_PATH = '/Turo.png';
const LOGO_ALT_TEXT = 'Logo';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: 'Hello! I can answer questions about your datasets using natural language, or help you find information in your documents. How can I help you today?',
      sender: Sender.Bot,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [filesets, setFilesets] = useState<Fileset[]>([]);
  const [selectedFileSet, setSelectedFileSet] = useState<string>('');
  const [isLoadingFilesets, setIsLoadingFilesets] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load filesets on mount
  useEffect(() => {
    const loadFilesets = async () => {
      setIsLoadingFilesets(true);
      try {
        const fetchedFilesets = await getFilesets();
        if (fetchedFilesets.length > 0) {
          // Transform API response to Fileset type
          const mappedFilesets: Fileset[] = fetchedFilesets.map((fs: any) => ({
            id: fs.id, 
            name: fs.name || fs.displayName || 'Unnamed FileSet'
          }));
          
          setFilesets(mappedFilesets);
          // Set first fileset as selected if none selected
          if (!selectedFileSet && mappedFilesets.length > 0) {
            setSelectedFileSet(mappedFilesets[0].id);
          }
        } else {
          // No filesets available
          setFilesets([]);
          setSelectedFileSet('');
        }
      } catch (error) {
        console.error('Error loading filesets:', error);
        setFilesets([]);
        setSelectedFileSet('');
      } finally {
        setIsLoadingFilesets(false);
      }
    };
    loadFilesets();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    // Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: Sender.User,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Process with Smart Query (auto-detects dataset vs fileset)
      const response = await handleSmartQuery(userText, selectedFileSet);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.text,
        sender: Sender.Bot,
        timestamp: new Date(),
        sources: response.sources,
        querySource: response.querySource,
        datasetUsed: response.dataset,
        sqlGenerated: response.sql,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error('Query error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: `I'm sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: Sender.Bot,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      // Keep focus on input for power users
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] absolute inset-0 bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 text-brand-600">
          <img 
            src={LOGO_PATH} 
            alt={LOGO_ALT_TEXT} 
            className="h-10 w-auto object-contain"
            onError={(e) => {
              // Fallback if logo doesn't load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg">
            <Database size={14} className="text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">Datasets</span>
          </div>
          {filesets.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg">
              <FileText size={14} className="text-purple-600" />
              <span className="text-xs text-purple-700 font-medium">Documents</span>
            </div>
          )}
        </div>
      </header>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="overflow-y-auto p-4 scroll-smooth bg-gradient-to-b from-slate-50 to-white min-h-0" 
        id="chat-container"
      >
        <div className="max-w-3xl mx-auto pt-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 mt-20">
              <MessageSquare size={48} className="mb-4 opacity-50" />
              <p>Start a conversation...</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 pb-6 z-20">
        <div className="max-w-3xl mx-auto">
          <form 
            onSubmit={handleSendMessage}
            className="relative flex items-center shadow-lg rounded-2xl ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-brand-500/50 transition-all duration-300 bg-slate-50 focus-within:bg-white focus-within:shadow-xl"
          >
            <div className="pl-5 text-slate-400">
              <MessageSquare size={20} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 outline-none focus:outline-none py-4 px-4 text-slate-700 placeholder-slate-400 text-base"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`mr-3 p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${
                input.trim() && !isLoading
                  ? 'bg-brand-600 text-white shadow-md hover:bg-brand-700 transform hover:scale-105 active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </form>
          <div className="text-center mt-3 px-4">
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
              <span>Ask about your data or documents - I'll route your query automatically</span>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default App;
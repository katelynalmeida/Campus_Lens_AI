import React, { useState, useRef, useEffect } from 'react';
import { askAssistant } from '../api/client';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  RefreshCw, 
  Trash2, 
  Info, 
  ArrowRight,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

export default function Assistant({ setCurrentTab, setSelectedIssueId }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: "Hello! I am the **CampusLens Facility Intelligence Assistant**.\n\nI have direct access to our live campus SQLite maintenance database. Ask me anything about pending tickets, urgent repairs, campus locations with faults, or how to submit a photo-based maintenance report.",
      suggestedPrompts: [
        "How many issues are pending right now?",
        "Are there any high-priority or critical issues?",
        "How do I report a broken ceiling fan?",
        "What is the status of issue ISS-1001?",
        "Which campus locations have reported issues?"
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const message = (textToSend || inputValue).trim();
    if (!message || loading) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setError(null);
    setLoading(true);

    try {
      const response = await askAssistant(message);
      const assistantMessage = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: response.reply,
        suggestedPrompts: response.suggested_prompts || [],
        relevantIssues: response.relevant_issues || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        assistantType: response.assistant_type
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message || "Failed to reach campus assistant service.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: Date.now(),
        sender: 'assistant',
        text: "Conversation cleared. How can I help you with campus maintenance today?",
        suggestedPrompts: [
          "How many issues are pending right now?",
          "Are there any high-priority or critical issues?",
          "How do I report a broken fan?"
        ],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper to render markdown-like formatting (bold and lists)
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;
          
          // Parse bold (**text**) and code (`text`)
          const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
          return (
            <p key={idx} className="leading-relaxed">
              {parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={pIdx} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                  return (
                    <code key={pIdx} className="font-mono bg-slate-200/70 text-brand-800 px-1 py-0.5 rounded text-xs">
                      {part.slice(1, -1)}
                    </code>
                  );
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header bar */}
      <div className="p-4 bg-white rounded-t-2xl border border-b-0 border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">CampusLens Facility Assistant</h2>
              <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-200">
                Rule-Based • Real DB
              </span>
            </div>
            <p className="text-xs text-slate-500">Live SQLite maintenance queries without paid external APIs</p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          title="Clear conversation"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 border-x border-slate-200/80 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                isUser 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-brand-600 text-white shadow-sm'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2">
                <div className={`p-4 rounded-2xl text-xs sm:text-sm shadow-sm ${
                  isUser
                    ? 'bg-brand-600 text-white rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                }`}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    renderFormattedText(msg.text)
                  )}
                  <span className={`block text-[10px] mt-1.5 ${isUser ? 'text-brand-200 text-right' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Relevant Issues Cards if present */}
                {!isUser && msg.relevantIssues && msg.relevantIssues.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Matched Tickets in Database:
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.relevantIssues.map((issue) => (
                        <div
                          key={issue.id}
                          onClick={() => {
                            if (setSelectedIssueId) setSelectedIssueId(issue.id);
                            setCurrentTab('tracking');
                          }}
                          className="p-2.5 bg-white rounded-xl border border-slate-200/80 hover:border-brand-400 transition cursor-pointer flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono font-bold text-brand-600 text-[11px]">{issue.id}</span>
                              <PriorityBadge priority={issue.priority} />
                            </div>
                            <p className="font-semibold text-slate-800 truncate">{issue.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">{issue.location}</p>
                          </div>
                          <StatusBadge status={issue.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Prompts if assistant message */}
                {!isUser && msg.suggestedPrompts && msg.suggestedPrompts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-white hover:bg-brand-50 hover:text-brand-700 text-slate-600 border border-slate-200 shadow-2xs transition"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {loading && (
          <div className="flex gap-3 max-w-[75%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white shrink-0 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-white rounded-2xl rounded-tl-none border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 text-brand-600 animate-spin" />
              <span>Querying campus records and formatting response...</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 text-center">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div className="p-4 bg-white rounded-b-2xl border border-slate-200/80 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about pending issues, high priority items, or reporting instructions..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/30 transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

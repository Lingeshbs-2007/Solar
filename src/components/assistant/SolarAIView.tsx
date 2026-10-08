import React, { useState } from 'react';
import { ImpactSummary } from '../../models/impact';
import { HouseholdConfig } from '../../models/household';
import {
  askSolarAssistant,
  ChatMessage,
  SUGGESTED_QUESTIONS,
} from '../../services/solarAssistant';
import {
  Bot,
  Send,
  Sparkles,
  User,
  ShieldCheck,
  HelpCircle,
  Sun,
  Zap,
} from 'lucide-react';

interface SolarAIViewProps {
  impact: ImpactSummary | null;
  household: HouseholdConfig;
}

const renderFormattedText = (text: string) => {
  return text.split('\n').map((line, lineIdx) => {
    const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('• ') || line.trim().startsWith('- ');
    const cleanLine = isBullet ? line.trim().replace(/^[*•-]\s+/, '') : line;
    const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);

    const renderedLine = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 my-1">
          <span className="text-emerald-600 font-bold shrink-0">•</span>
          <span>{renderedLine}</span>
        </div>
      );
    }

    return (
      <p key={lineIdx} className={line.trim() === '' ? 'h-2' : 'my-1'}>
        {renderedLine}
      </p>
    );
  });
};

export const SolarAIView: React.FC<SolarAIViewProps> = ({ impact, household }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your Solar Energy & Photovoltaics Expert AI. You can ask me ANY question about solar panels, photovoltaic technology, monocrystalline vs polycrystalline, inverters, battery storage, cleaning and maintenance, lifespan, net metering, or how rooftop solar works. What would you like to know?`,
      timestamp: 'Just now',
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleSend = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || isAsking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: 'Just now',
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputQuestion('');
    setIsAsking(true);

    try {
      const answer = await askSolarAssistant(q, impact, household, newMessages);
      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: answer,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'I could not answer that right now. Please try asking again.',
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Bot className="w-7 h-7 text-emerald-600" />
          Solar AI Assistant
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          General solar energy knowledge consultant — ask any question about solar panels, inverters, PV physics, cleaning, or technology.
        </p>
      </div>

      {/* Suggested Questions Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Frequently Asked Solar Questions
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSend(q)}
              disabled={isAsking}
              className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200/80 transition-colors cursor-pointer text-left"
            >
              &ldquo;{q}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 min-h-[380px] flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-slate-800 text-white'
                    : 'bg-emerald-600 text-white shadow-2xs'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-800 border border-slate-200/80'
                }`}
              >
                {renderFormattedText(msg.text)}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-xs text-slate-500">
                Consulting solar energy knowledge base...
              </div>
            </div>
          )}
        </div>

        {/* Question Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputQuestion);
          }}
          className="pt-3 border-t border-slate-100 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask any question about solar panels, inverters, battery storage, cleaning, degradation..."
            disabled={isAsking}
            className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-colors"
          />

          <button
            type="submit"
            disabled={isAsking || !inputQuestion.trim()}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Broad Solar Knowledge Expert • Answers questions on any PV hardware, physics, or installation topic</span>
      </div>
    </div>
  );
};

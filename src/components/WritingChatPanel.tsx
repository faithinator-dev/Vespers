import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  Copy,
  FilePlus2,
  MessageSquareText,
  RotateCcw,
} from 'lucide-react';
import { MoodKey } from '../types/journal';

export interface WritingChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

interface WritingChatPanelProps {
  draftTitle: string;
  draftPlainText: string;
  draftMood: MoodKey;
  onInsertIntoEditor: (text: string) => void;
}

const QUICK_STARTERS: { label: string; prompt: string }[] = [
  {
    label: 'Help me start',
    prompt:
      'Give me 3 gentle opening lines I can adapt to start writing tonight based on my current mood.',
  },
  {
    label: 'Polish my draft',
    prompt:
      'Read my current draft and suggest a smoother, warmer way to phrase it while keeping my natural voice.',
  },
  {
    label: 'Suggest a title',
    prompt:
      'Suggest 4 quiet, evocative titles that fit what I have written so far.',
  },
  {
    label: 'Deepen reflection',
    prompt:
      'Ask me 2 thoughtful follow-up questions to help me explore what I wrote a little more deeply.',
  },
];

export function WritingChatPanel({
  draftTitle,
  draftPlainText,
  draftMood,
  onInsertIntoEditor,
}: WritingChatPanelProps) {
  const [messages, setMessages] = useState<WritingChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'companion' | 'quick'>('companion');
  const [shareDraft, setShareDraft] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isSending]);

  const sendMessage = async (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || isSending) return;

    const userMsg: WritingChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const priorHistory = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setErrorMsg(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/writing-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: priorHistory,
          mode,
          draftContext: {
            shareDraft,
            title: draftTitle,
            mood: draftMood,
            excerpt: draftPlainText,
          },
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        model?: string;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'Unable to get a writing suggestion.');
      }

      const modelMsg: WritingChatMessage = {
        id: `model_${Date.now()}`,
        role: 'model',
        text: data.reply,
        modelUsed: data.model,
      };
      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not reach the writing companion.',
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleInsert = (id: string, text: string) => {
    onInsertIntoEditor(text);
    setInsertedId(id);
    window.setTimeout(() => setInsertedId((cur) => (cur === id ? null : cur)), 1800);
  };

  const handleReset = () => {
    setMessages([]);
    setErrorMsg(null);
  };

  return (
    <div className="flex flex-col h-[560px]">
      {/* Mode & Context Controls */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#d99b52]/12">
        <div
          role="group"
          aria-label="Writing companion speed"
          className="flex items-center gap-1 p-1 rounded-xl bg-[#140e0a] border border-[#d99b52]/12"
        >
          <button
            type="button"
            onClick={() => setMode('companion')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'companion'
                ? 'bg-[#2e231b] text-[#f5ecdb] border border-[#d99b52]/30'
                : 'text-[#9e8d78] hover:text-[#e8dbc6] border border-transparent'
            }`}
          >
            Thoughtful
          </button>
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'quick'
                ? 'bg-[#2e231b] text-[#f5ecdb] border border-[#d99b52]/30'
                : 'text-[#9e8d78] hover:text-[#e8dbc6] border border-transparent'
            }`}
          >
            Quick Spark
          </button>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              title="Start a fresh conversation"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#a89782] hover:text-[#f5ecdb] hover:bg-[#271d17] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              <span>New chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Share Draft Checkbox */}
      <label className="mt-2.5 mb-3 flex items-center gap-2 text-xs text-[#b9a791] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={shareDraft}
          onChange={(e) => setShareDraft(e.target.checked)}
          className="rounded accent-[#d99b52] cursor-pointer"
        />
        <span>Share open page context for tailored feedback</span>
      </label>

      {/* Scrollable Conversation Thread */}
      <div
        role="log"
        aria-label="Writing companion conversation"
        className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3"
      >
        {messages.length === 0 ? (
          <div className="my-auto py-4 flex flex-col gap-4">
            <div className="rounded-2xl bg-[#18120e] border border-[#d99b52]/14 p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[#d99b52] mb-1.5">
                <MessageSquareText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Writing Companion</span>
              </div>
              <p className="text-xs text-[#c8b9a2] leading-relaxed">
                Ask for opening lines, gentle reflection prompts, phrasing edits, or title ideas. Everything stays focused on your writing.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {QUICK_STARTERS.map((starter) => (
                <button
                  key={starter.label}
                  type="button"
                  disabled={isSending}
                  onClick={() => void sendMessage(starter.prompt)}
                  className="text-left px-3.5 py-2.5 rounded-xl bg-[#18120e] border border-[#d99b52]/14 hover:border-[#d99b52]/38 text-xs text-[#e8dbc6] transition-colors cursor-pointer"
                >
                  {starter.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#35261b] text-[#f7efe0] border border-[#d99b52]/25'
                      : 'bg-[#17110d] text-[#e6dac6] border border-[#d99b52]/14'
                  }`}
                >
                  {msg.text}
                </div>

                {!isUser && (
                  <div className="mt-1.5 flex items-center gap-3 px-1 text-[11px] text-[#9e8d78]">
                    <button
                      type="button"
                      onClick={() => void handleCopy(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 hover:text-[#f3ead8] transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#8fb996]" aria-hidden="true" />
                          <span className="text-[#8fb996]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" aria-hidden="true" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsert(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 hover:text-[#d99b52] transition-colors cursor-pointer"
                    >
                      {insertedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-[#8fb996]" aria-hidden="true" />
                          <span className="text-[#8fb996]">Inserted</span>
                        </>
                      ) : (
                        <>
                          <FilePlus2 className="w-3 h-3" aria-hidden="true" />
                          <span>Insert into page</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {isSending && (
          <div className="self-start rounded-2xl px-3.5 py-2.5 bg-[#17110d] border border-[#d99b52]/14 text-xs text-[#a89782]">
            Composing a suggestion…
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      {errorMsg && (
        <div className="mt-2 rounded-xl bg-[#40201a] border border-[#c97b63]/40 px-3 py-2 text-xs text-[#f2c8bc]">
          {errorMsg}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendMessage(input);
        }}
        className="mt-3 pt-3 border-t border-[#d99b52]/12 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendMessage(input);
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="Ask for phrasing help, a prompt, or feedback…"
          aria-label="Message the writing companion"
          className="flex-1 rounded-xl bg-[#150f0b] border border-[#d99b52]/18 px-3 py-2 text-xs sm:text-sm text-[#f3ead8] placeholder:text-[#7c6c5a] focus:border-[#d99b52]/50 focus:outline-none resize-none"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          aria-label="Send writing request"
          className="w-10 h-10 rounded-xl bg-[#d99b52] text-[#1a110b] flex items-center justify-center hover:bg-[#e5a860] disabled:opacity-45 transition-colors shrink-0 cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

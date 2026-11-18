import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Check,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  MessageSquareText,
  Plus,
  Quote,
  Redo2,
  Sparkles,
  Trash2,
  Underline,
  Undo2,
} from 'lucide-react';
import {
  EVENING_PROMPTS,
  JournalEntry,
  MOODS,
  MOOD_MAP,
  MoodKey,
  SCHEMA_LIMITS,
} from '../types/journal';
import { formatShortDate, formatTimeFromMs } from '../utils/dates';
import { countWords, extractPlainText, sanitizeJournalHtml } from '../utils/sanitize';
import { MoodIcon } from './MoodIcon';
import { WritingChatPanel } from './WritingChatPanel';

interface JournalEditorProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  selectedDateKey: string;
  onSelectEntry: (entry: JournalEntry) => void;
  onCreateNew: (dateKey?: string) => void;
  onSaveEntry: (payload: {
    id?: string;
    dateKey: string;
    title: string;
    contentHtml: string;
    mood: MoodKey;
    promptUsed?: string;
  }) => Promise<string>;
  onDeleteEntry: (entryId: string) => Promise<void>;
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  ul: boolean;
  ol: boolean;
  heading: boolean;
  quote: boolean;
}

export function JournalEditor({
  entries,
  activeEntryId,
  selectedDateKey,
  onSelectEntry,
  onCreateNew,
  onSaveEntry,
  onDeleteEntry,
}: JournalEditorProps) {
  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeEntryId) || null,
    [entries, activeEntryId],
  );

  const [entryDateKey, setEntryDateKey] = useState(selectedDateKey);
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState<MoodKey>('reflective');
  const [promptUsed, setPromptUsed] = useState<string>('');
  const [promptIndex, setPromptIndex] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [draftPlainText, setDraftPlainText] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'companion' | 'recent'>('companion');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formats, setFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
    heading: false,
    quote: false,
  });

  const editorRef = useRef<HTMLDivElement | null>(null);

  // Sync editor fields when switching entries or starting a new page
  useEffect(() => {
    if (activeEntry) {
      setEntryDateKey(activeEntry.dateKey);
      setTitle(activeEntry.title);
      setMood(activeEntry.mood);
      setPromptUsed(activeEntry.promptUsed || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = sanitizeJournalHtml(activeEntry.contentHtml);
      }
      setWordCount(activeEntry.wordCount);
      setDraftPlainText(activeEntry.plainText);
      setIsDirty(false);
      setSaveFeedback(null);
      setErrorMsg(null);
    } else {
      setEntryDateKey(selectedDateKey);
      setTitle('');
      setMood('reflective');
      setPromptUsed('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      setWordCount(0);
      setDraftPlainText('');
      setIsDirty(false);
      setSaveFeedback(null);
      setErrorMsg(null);
    }
  }, [activeEntry, selectedDateKey]);

  const refreshFormatState = useCallback(() => {
    try {
      const block = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
      setFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        heading: block === 'h2' || block === 'h3',
        quote: block === 'blockquote',
      });
    } catch {
      // Ignore queryCommandState errors when selection is outside
    }
  }, []);

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML || '';
    const plain = extractPlainText(html);
    setDraftPlainText(plain);
    setWordCount(countWords(plain));
    setIsDirty(true);
    setSaveFeedback(null);
    refreshFormatState();
  };

  const handleInsertSuggestion = (text: string) => {
    const el = editorRef.current;
    if (!el) return;
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const para of paragraphs) {
      const pNode = document.createElement('p');
      pNode.textContent = para;
      el.appendChild(pNode);
    }
    handleEditorInput();
  };

  const execFormat = (command: string, value?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    if (command === 'formatBlock') {
      const currentBlock = String(document.queryCommandValue('formatBlock') || '').toLowerCase();
      const target = (value || '').replace(/[<>]/g, '').toLowerCase();
      document.execCommand('formatBlock', false, currentBlock === target ? 'P' : value);
    } else if (command === 'highlight') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const parentMark =
          range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? (range.commonAncestorContainer as HTMLElement).closest('mark')
            : range.commonAncestorContainer.parentElement?.closest('mark');
        if (parentMark) {
          const textNode = document.createTextNode(parentMark.textContent || '');
          parentMark.replaceWith(textNode);
        } else {
          const mark = document.createElement('mark');
          try {
            range.surroundContents(mark);
          } catch {
            document.execCommand('insertHTML', false, `<mark>${sel.toString()}</mark>`);
          }
        }
      }
    } else {
      document.execCommand(command, false, value);
    }

    handleEditorInput();
  };

  const handleCyclePrompt = () => {
    const nextIndex = (promptIndex + 1) % EVENING_PROMPTS.length;
    setPromptIndex(nextIndex);
    setPromptUsed(EVENING_PROMPTS[promptIndex]);
    setIsDirty(true);
  };

  const handleSave = async () => {
    const rawHtml = editorRef.current?.innerHTML || '';
    const sanitized = sanitizeJournalHtml(rawHtml);
    const plain = extractPlainText(sanitized);

    if (!title.trim() && !plain.trim()) {
      setErrorMsg('Write a title or a few lines before saving.');
      return;
    }

    if (sanitized.length > SCHEMA_LIMITS.CONTENT_HTML_MAX_LEN) {
      setErrorMsg('This entry exceeds the maximum length for a single page.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onSaveEntry({
        id: activeEntry?.id,
        dateKey: entryDateKey,
        title: title.trim() || 'Untitled Evening',
        contentHtml: sanitized || '<p></p>',
        mood,
        promptUsed: promptUsed || undefined,
      });
      setIsDirty(false);
      setSaveFeedback('Saved');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!activeEntry) return;
    setIsDeleting(true);
    try {
      await onDeleteEntry(activeEntry.id);
      setConfirmDeleteOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to delete entry.');
    } finally {
      setIsDeleting(false);
    }
  };

  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Writing Desk */}
      <section
        aria-label="Journal rich-text editor"
        className="lg:col-span-8 rounded-3xl bg-[#1f1712]/94 border border-[#d99b52]/20 shadow-2xl overflow-hidden"
      >
        {/* Top Metadata & Mood Bar */}
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-[#d99b52]/12 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="entry-date-input">
                Entry date
              </label>
              <input
                id="entry-date-input"
                type="date"
                value={entryDateKey}
                onChange={(e) => {
                  setEntryDateKey(e.target.value);
                  setIsDirty(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#16100c] border border-[#d99b52]/20 text-xs font-mono tabular-nums text-[#e8dbc6] hover:border-[#d99b52]/40 transition-colors cursor-pointer"
              />
              <button
                type="button"
                onClick={handleCyclePrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#271d17] border border-[#d99b52]/18 text-xs text-[#d99b52] hover:bg-[#31241c] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Evening prompt</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('companion')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  sidebarTab === 'companion'
                    ? 'bg-[#d99b52]/16 border-[#d99b52]/40 text-[#f5ecdb]'
                    : 'bg-[#271d17] border-[#d99b52]/18 text-[#c8b9a2] hover:text-[#f5ecdb]'
                }`}
              >
                <MessageSquareText className="w-3.5 h-3.5 text-[#d99b52]" aria-hidden="true" />
                <span>Writing Aid</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#9e8d78] font-mono tabular-nums">
              <span>{wordCount} words</span>
              <span aria-hidden="true">·</span>
              <span>{wordCount > 0 ? `${readingMinutes} min read` : 'New page'}</span>
              {saveFeedback && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-[#8fb996] font-sans">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    {saveFeedback}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Mood Selector */}
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Select your evening mood">
            <span className="text-xs text-[#9e8d78] mr-1">Mood:</span>
            {MOODS.map((m) => {
              const selected = mood === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    setMood(m.key);
                    setIsDirty(true);
                  }}
                  style={
                    selected
                      ? {
                          backgroundColor: m.softBg,
                          borderColor: m.borderHex,
                          color: '#f8f1e3',
                        }
                      : undefined
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? ''
                      : 'bg-[#17110d] border-[#d99b52]/12 text-[#a89782] hover:text-[#f3ead8] hover:border-[#d99b52]/28'
                  }`}
                >
                  <span style={{ color: m.accentHex }}>
                    <MoodIcon mood={m.key} className="w-3.5 h-3.5" />
                  </span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rich-Text Formatting Toolbar */}
        <div
          role="toolbar"
          aria-label="Text formatting"
          className="px-6 sm:px-8 py-2.5 bg-[#18120e] border-b border-[#d99b52]/12 flex flex-wrap items-center gap-1"
        >
          <ToolbarButton
            label="Bold"
            active={formats.bold}
            onClick={() => execFormat('bold')}
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={formats.italic}
            onClick={() => execFormat('italic')}
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={formats.underline}
            onClick={() => execFormat('underline')}
          >
            <Underline className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-[#d99b52]/15 mx-1.5" aria-hidden="true" />

          <ToolbarButton
            label="Section Heading"
            active={formats.heading}
            onClick={() => execFormat('formatBlock', '<H2>')}
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Quote"
            active={formats.quote}
            onClick={() => execFormat('formatBlock', '<BLOCKQUOTE>')}
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet List"
            active={formats.ul}
            onClick={() => execFormat('insertUnorderedList')}
          >
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered List"
            active={formats.ol}
            onClick={() => execFormat('insertOrderedList')}
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Amber Highlight"
            active={false}
            onClick={() => execFormat('highlight')}
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-[#d99b52]/15 mx-1.5" aria-hidden="true" />

          <ToolbarButton label="Undo" active={false} onClick={() => execFormat('undo')}>
            <Undo2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" active={false} onClick={() => execFormat('redo')}>
            <Redo2 className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Paper Surface */}
        <div className="px-6 sm:px-9 py-7">
          {promptUsed && (
            <div className="mb-5 rounded-xl bg-[#271d16] border border-[#d99b52]/18 px-4 py-3 flex items-start justify-between gap-3">
              <p className="font-display italic text-sm text-[#e8d5b7] leading-relaxed">
                “{promptUsed}”
              </p>
              <button
                type="button"
                onClick={() => setPromptUsed('')}
                className="text-xs text-[#8f7e6a] hover:text-[#f3ead8] shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <input
            type="text"
            value={title}
            maxLength={SCHEMA_LIMITS.TITLE_MAX_LEN}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
              setSaveFeedback(null);
            }}
            placeholder="Give tonight’s page a title…"
            aria-label="Journal entry title"
            className="w-full bg-transparent font-display text-2xl sm:text-3xl text-[#f7efe0] placeholder:text-[#6b5b4a] border-0 focus:outline-none mb-5"
          />

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Journal entry body"
            data-placeholder="Let your thoughts settle onto the page…"
            onInput={handleEditorInput}
            onKeyUp={refreshFormatState}
            onMouseUp={refreshFormatState}
            className="journal-prose min-h-[300px] sm:min-h-[360px]"
          />

          {errorMsg && (
            <div className="mt-4 rounded-xl bg-[#40201a] border border-[#c97b63]/40 px-4 py-2.5 text-xs text-[#f2c8bc]">
              {errorMsg}
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-8 pt-5 border-t border-[#d99b52]/12 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {activeEntry && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-[#c97b63] hover:bg-[#3a201b] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Delete</span>
                </button>
              )}
              {isDirty && (
                <span className="text-xs text-[#d99b52]">Unsaved changes</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeEntry && (
                <button
                  type="button"
                  onClick={() => onCreateNew(entryDateKey)}
                  className="px-4 py-2.5 rounded-xl bg-[#271d17] text-[#e8dbc6] text-xs sm:text-sm font-medium border border-[#d99b52]/20 hover:border-[#d99b52]/40 transition-colors cursor-pointer"
                >
                  New Page
                </button>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-[#d99b52] text-[#1a110b] text-xs sm:text-sm font-semibold hover:bg-[#e5a860] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isSaving ? 'Saving…' : activeEntry ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Side Column: Writing Aid Chatbot & Recent Pages */}
      <aside
        aria-label="Writing companion and recent pages"
        className="lg:col-span-4 rounded-3xl bg-[#1c140f]/94 border border-[#d99b52]/18 p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#140e0a] border border-[#d99b52]/12">
            <button
              type="button"
              onClick={() => setSidebarTab('companion')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sidebarTab === 'companion'
                  ? 'bg-[#d99b52] text-[#1a110b] font-semibold'
                  : 'text-[#a89782] hover:text-[#f3ead8]'
              }`}
            >
              Writing Aid
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                sidebarTab === 'recent'
                  ? 'bg-[#d99b52] text-[#1a110b] font-semibold'
                  : 'text-[#a89782] hover:text-[#f3ead8]'
              }`}
            >
              Recent Pages
            </button>
          </div>

          {sidebarTab === 'recent' && (
            <button
              type="button"
              onClick={() => onCreateNew()}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#d99b52] hover:text-[#ebb573] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Fresh page</span>
            </button>
          )}
        </div>

        {sidebarTab === 'companion' ? (
          <WritingChatPanel
            draftTitle={title}
            draftPlainText={draftPlainText}
            draftMood={mood}
            onInsertIntoEditor={handleInsertSuggestion}
          />
        ) : entries.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[#a89782] leading-relaxed">
              Your first page is ready. Once saved, your late-night entries will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[#d99b52]/10 max-h-[540px] overflow-y-auto pr-1">
            {entries.slice(0, 14).map((entry) => {
              const isSelected = entry.id === activeEntryId;
              const moodInfo = MOOD_MAP[entry.mood] || MOOD_MAP.reflective;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className={`text-left py-3.5 px-3 -mx-2 rounded-xl transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2c2119] border border-[#d99b52]/28'
                      : 'hover:bg-[#251b15] border border-transparent'
                  }`}
                >
                  <div className="font-display text-base text-[#f5ecdb] truncate mb-1">
                    {entry.title || 'Untitled Evening'}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#9e8d78] mb-1.5">
                    <span className="font-mono tabular-nums">
                      {formatShortDate(entry.dateKey)}
                    </span>
                    {entry.createdAtMs > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          {formatTimeFromMs(entry.createdAtMs)}
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span
                      className="inline-flex items-center gap-1"
                      style={{ color: moodInfo.accentHex }}
                    >
                      <MoodIcon mood={entry.mood} className="w-3 h-3" />
                      <span>{moodInfo.label}</span>
                    </span>
                  </div>
                  {entry.plainText && (
                    <p className="text-xs text-[#b5a48e] line-clamp-2 leading-relaxed">
                      {entry.plainText}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Delete Confirmation Modal */}
      {confirmDeleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5"
        >
          <div className="max-w-sm w-full rounded-2xl bg-[#221913] border border-[#d99b52]/25 p-6 shadow-2xl">
            <h3 id="delete-modal-title" className="font-display text-xl text-[#f5ecdb] mb-2">
              Delete this page?
            </h3>
            <p className="text-sm text-[#c8b9a2] leading-relaxed mb-6">
              This will permanently remove “{activeEntry?.title || 'Untitled Evening'}” from your journal.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#2d221b] text-xs font-medium text-[#e8dbc6] hover:bg-[#382b22] transition-colors cursor-pointer"
              >
                Keep Page
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-[#b85d47] text-xs font-semibold text-[#fdf6ee] hover:bg-[#ca6b53] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting…' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, active, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
        active
          ? 'bg-[#d99b52]/24 text-[#f5ecdb] border border-[#d99b52]/40'
          : 'text-[#b5a48e] hover:text-[#f5ecdb] hover:bg-[#271d17] border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}

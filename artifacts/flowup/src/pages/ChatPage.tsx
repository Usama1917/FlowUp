import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Users, ChevronLeft, ChevronRight, PanelRightOpen, ChevronUp, ChevronDown, X, Search } from 'lucide-react';
import { RoomList } from '@/components/chat/RoomList';
import { MessageItem } from '@/components/chat/MessageItem';
import { TaskDetailsPanel } from '@/components/tasks/TaskDetailsPanel';
import { SendTaskModal } from '@/components/modals/SendTaskModal';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { getRoomDisplayName } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

type MobileView = 'rooms' | 'chat' | 'task';

const ROOMS_MIN = 200;
const ROOMS_MAX = 640;
const ROOMS_DEFAULT = 432;

export function ChatPage() {
  const { lang, dir, allMessages, allRooms, allUsers, allSubjects, allTasks, selectedRoomId, setSelectedRoomId, setSelectedTaskId, selectedTaskId, currentRole, sendMessage, currentUser, chatSearch, setChatSearch, jumpMessageId, setJumpMessageId } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();

  const [messageText, setMessageText] = useState('');
  // Which subject a message belongs to in the merged "by designer" view (required before sending).
  const [composeSubjectId, setComposeSubjectId] = useState<string | null>(null);
  const [showSendTask, setShowSendTask] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(true);
  const [mobileView, setMobileView] = useState<MobileView>('rooms');

  // Resizable rooms pane
  const [roomsWidth, setRoomsWidth] = useState(ROOMS_DEFAULT);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(ROOMS_DEFAULT);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const room = selectedRoomId ? allRooms.find(r => r.id === selectedRoomId) : null;
  const selectedTask = selectedTaskId ? allTasks.find(t => t.id === selectedTaskId) : null;
  const roomName = room ? getRoomDisplayName(room, currentUser, lang, allUsers, allSubjects) : '';
  const isFeed = room?.type === 'feed';
  // Merged "by designer" room (scientific supervisor): aggregates every message from this
  // designer's subject chats under the current supervisor, and is writable per-subject.
  const isMerge = room?.type === 'subject_merge';
  // The feed / merged view aggregates messages from several subject chats at once.
  const roomMessages = (() => {
    if (isFeed && room) {
      const ids = new Set(allRooms.filter(r => r.type === 'subject' && r.designerId === room.designerId).map(r => r.id));
      return allMessages.filter(m => ids.has(m.roomId)).slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    if (isMerge && room) {
      const ids = new Set((room.subjectIds ?? []).map(sid => `asg_${sid}_${room.designerId}`));
      return allMessages.filter(m => ids.has(m.roomId)).slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    return allMessages.filter(m => m.roomId === selectedRoomId);
  })();
  // In the feed / merged view, each message is tinted with its subject's color.
  const subjectColorForMsg = (m: { roomId: string }) => {
    const r = allRooms.find(rr => rr.id === m.roomId);
    if (!r || !r.subjectId) return undefined;
    return allSubjects.find(s => s.id === r.subjectId)?.color;
  };
  // Task sending needs a single concrete room — disabled in the merged view.
  const canSendTask = currentRole !== 'designer' && !isMerge;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length]);

  // Focus the composer as soon as a writable chat opens (desktop only) — type right away, no extra click
  useEffect(() => {
    if (room && !isFeed && window.innerWidth >= 1024) composerRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, isFeed]);

  // Reset the compose subject on room change; auto-select when a merged chat has only one subject.
  useEffect(() => {
    if (isMerge && room?.subjectIds?.length === 1) setComposeSubjectId(room.subjectIds[0]);
    else setComposeSubjectId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId]);

  // Drag handlers — work correctly for both RTL and LTR
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = roomsWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [roomsWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dir === 'rtl'
        ? dragStartX.current - e.clientX   // RTL: drag left → wider
        : e.clientX - dragStartX.current;  // LTR: drag right → wider
      const next = Math.min(ROOMS_MAX, Math.max(ROOMS_MIN, dragStartWidth.current + delta));
      setRoomsWidth(next);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dir]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedRoomId) return;
    // In the merged view the message must be routed to a specific subject chat.
    let targetRoomId = selectedRoomId;
    if (isMerge && room) {
      if (!composeSubjectId) { toast({ title: tr.selectSubjectFirst }); return; }
      targetRoomId = `asg_${composeSubjectId}_${room.designerId}`;
    }
    sendMessage(targetRoomId, messageText.trim(), messageText.trim(), 'text');
    setMessageText('');
    toast({ title: tr.messageSentSuccess });
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskPanel(true);
    if (window.innerWidth < 1024) setMobileView('task');
  };

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setMobileView('chat');
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: typeof roomMessages }[] = [];
    let lastDate = '';
    for (const msg of roomMessages) {
      const d = msg.timestamp.toDateString();
      if (d !== lastDate) {
        lastDate = d;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const label = d === today ? tr.today : d === yesterday ? tr.yesterday : msg.timestamp.toLocaleDateString('en-GB');
        groups.push({ date: label, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  // --- In-chat search (Telegram-style): highlight + navigate between matches ---
  const term = chatSearch.trim().toLowerCase();
  const matches = term
    ? roomMessages.filter(m => ((lang === 'ar' ? m.text : m.textEn) || '').toLowerCase().includes(term))
    : [];
  const [activeMatch, setActiveMatch] = useState(0);
  const activeMatchId = matches[activeMatch]?.id;

  const scrollToMsg = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Reset the active match whenever the room or the term changes
  useEffect(() => { setActiveMatch(0); }, [selectedRoomId, term]);

  // Jump to the specific message a search result pointed at, then consume the request
  useEffect(() => {
    if (!jumpMessageId) return;
    const idx = matches.findIndex(m => m.id === jumpMessageId);
    if (idx >= 0) setActiveMatch(idx);
    const id = jumpMessageId;
    const t = setTimeout(() => scrollToMsg(id), 80);
    setJumpMessageId(null);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpMessageId, selectedRoomId]);

  const goMatch = (delta: number) => {
    if (matches.length === 0) return;
    const next = (activeMatch + delta + matches.length) % matches.length;
    setActiveMatch(next);
    scrollToMsg(matches[next].id);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ROOMS PANE — desktop: resizable, mobile: toggle */}
      <div
        className={`${mobileView === 'rooms' ? 'flex' : 'hidden'} lg:flex flex-shrink-0 flex-col overflow-hidden`}
        style={{ width: roomsWidth }}
      >
        <RoomList onRoomSelect={handleRoomSelect} />
      </div>

      {/* DRAG HANDLE — desktop only */}
      <div
        onMouseDown={onDragStart}
        className="hidden lg:flex w-1 flex-shrink-0 cursor-col-resize items-center justify-center group relative"
        data-testid="rooms-resize-handle"
      >
        <div className="absolute inset-y-0 -inset-x-1 group-hover:bg-secondary/15 transition-colors duration-150 rounded" />
        <div className="w-0.5 h-10 bg-border rounded-full group-hover:bg-secondary/50 transition-colors duration-150" />
      </div>

      {/* CHAT PANE */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 bg-background`}>
        {!room ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">{tr.noRooms}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {lang === 'ar' ? 'اختر غرفة من القائمة للبدء' : 'Select a room to start chatting'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileView('rooms')}
                  className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  {dir === 'rtl' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold">
                  {roomName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{roomName}</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1 rtl:space-x-reverse">
                      {room.participantIds.slice(0, 3).map(uid => {
                        const u = allUsers.find(x => x.id === uid);
                        return u ? (
                          <div key={uid} title={lang === 'ar' ? u.name : u.nameEn} className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white" style={{ fontSize: '7px' }}>
                            {u.avatar.charAt(0)}
                          </div>
                        ) : null;
                      })}
                    </div>
                    <span className="text-xs text-muted-foreground">{isFeed ? (lang === 'ar' ? 'للقراءة فقط' : 'Read-only') : `${room.participantIds.length} ${tr.participants}`}</span>
                    {room.activeTaskCount > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{room.activeTaskCount} {tr.activeTasksCount}</span>
                    )}
                  </div>
                </div>
              </div>
              {selectedTask && (
                <button
                  onClick={() => setShowTaskPanel(!showTaskPanel)}
                  className="hidden lg:flex p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  data-testid="toggle-task-panel"
                >
                  <PanelRightOpen size={16} />
                </button>
              )}
            </div>

            {/* In-chat search bar — appears when a search term was carried in */}
            {term && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/5">
                <Search size={14} className="text-secondary flex-shrink-0" />
                <span dir="auto" className="flex-1 text-xs text-foreground truncate">
                  «{chatSearch.trim()}»
                  <span className="text-muted-foreground ms-2 ltr-value">
                    {matches.length ? `${activeMatch + 1}/${matches.length}` : tr.noMatches}
                  </span>
                </span>
                <button
                  onClick={() => goMatch(-1)}
                  disabled={matches.length === 0}
                  className="p-1 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                  data-testid="search-prev"
                  title={lang === 'ar' ? 'السابق' : 'Previous'}
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  onClick={() => goMatch(1)}
                  disabled={matches.length === 0}
                  className="p-1 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
                  data-testid="search-next"
                  title={lang === 'ar' ? 'التالي' : 'Next'}
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  onClick={() => setChatSearch('')}
                  className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  data-testid="search-close"
                  title={lang === 'ar' ? 'إغلاق البحث' : 'Close search'}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-3">
              {roomMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 rounded-3xl bg-muted flex items-center justify-center mb-3">
                    <Send size={22} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{tr.noMessages}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tr.noMessagesDesc}</p>
                </div>
              ) : (
                <>
                  {messageGroups.map(group => (
                    <div key={group.date}>
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground px-2">{group.date}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {group.messages.map(msg => (
                        <div
                          key={msg.id}
                          id={`msg-${msg.id}`}
                          className={`rounded-2xl transition-colors duration-300 ${msg.id === activeMatchId ? 'bg-secondary/10 ring-1 ring-secondary/40' : ''}`}
                        >
                          <MessageItem message={msg} onTaskClick={handleTaskClick} tintColor={(isFeed || isMerge) ? subjectColorForMsg(msg) : undefined} highlight={term ? chatSearch.trim() : undefined} />
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Composer (hidden in the read-only feed) */}
            {isFeed ? (
              <div className="px-4 py-3 border-t border-border bg-card/80 text-center text-xs text-muted-foreground">
                {lang === 'ar' ? 'قناة للقراءة فقط — بتجمّع رسائل كل موادك' : 'Read-only channel — aggregates all your subjects'}
              </div>
            ) : (
            <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
              {/* Merged "by designer" view — pick which subject the message is about before sending */}
              {isMerge && room && (room.subjectIds?.length ?? 0) > 1 && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">{tr.subjectLabel}</span>
                  {(room.subjectIds ?? []).map(sid => {
                    const s = allSubjects.find(x => x.id === sid);
                    if (!s) return null;
                    const active = composeSubjectId === sid;
                    return (
                      <button
                        key={sid}
                        onClick={() => setComposeSubjectId(sid)}
                        data-testid={`compose-subject-${sid}`}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${active ? 'text-white border-transparent' : 'bg-muted/50 text-foreground border-transparent hover:bg-muted'}`}
                        style={active ? { backgroundColor: s.color } : undefined}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? '#fff' : s.color }} />
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-end gap-2">
                {canSendTask && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setShowSendTask(true)}
                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center hover:bg-secondary/20 transition-colors"
                    data-testid="open-send-task"
                  >
                    <Plus size={16} />
                  </motion.button>
                )}
                <div className="flex-1">
                  <textarea
                    ref={composerRef}
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={isMerge && !composeSubjectId ? tr.selectSubjectFirst : tr.typeMessage}
                    rows={1}
                    className="w-full resize-none bg-muted/60 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all max-h-32 overflow-auto"
                    data-testid="message-input"
                    style={{ minHeight: '40px' }}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleSend}
                  disabled={!messageText.trim() || (isMerge && !composeSubjectId)}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all"
                  data-testid="send-message-btn"
                >
                  {dir === 'rtl'
                    ? <Send size={15} style={{ transform: 'scaleX(-1)' }} />
                    : <Send size={15} />
                  }
                </motion.button>
              </div>
            </div>
            )}
          </>
        )}
      </div>

      {/* TASK DETAILS PANEL — only when a task is actually selected */}
      <AnimatePresence>
        {selectedTask && (showTaskPanel || mobileView === 'task') && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: mobileView === 'task' ? '100%' : 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className={`${mobileView === 'task' ? 'fixed inset-0 lg:relative lg:inset-auto' : 'hidden lg:block'} flex-shrink-0 overflow-hidden`}
            style={{ width: mobileView === 'task' ? undefined : 320 }}
          >
            <TaskDetailsPanel onClose={() => { setShowTaskPanel(false); if (mobileView === 'task') setMobileView('chat'); }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: back button */}
      {mobileView === 'chat' && (
        <div className="lg:hidden fixed bottom-20 start-4">
          <button
            onClick={() => setMobileView('rooms')}
            className="bg-card border border-border shadow-lg rounded-full p-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      )}

      {showSendTask && selectedRoomId && (
        <AnimatePresence>
          <SendTaskModal roomId={selectedRoomId} onClose={() => setShowSendTask(false)} />
        </AnimatePresence>
      )}
    </div>
  );
}

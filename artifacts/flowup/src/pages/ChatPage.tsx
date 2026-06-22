import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Users, ChevronLeft, ChevronRight, PanelRightOpen, ChevronUp, ChevronDown, X, Search, CornerUpLeft, ImageIcon, Video, ClipboardList } from 'lucide-react';
import { RoomList } from '@/components/chat/RoomList';
import { MessageItem, tint } from '@/components/chat/MessageItem';
import { TaskDetailsPanel } from '@/components/tasks/TaskDetailsPanel';
import { SendTaskModal } from '@/components/modals/SendTaskModal';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { getRoomDisplayName } from '@/data/mockData';
import type { Message } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

type MobileView = 'rooms' | 'chat' | 'task';

// Midpoint between two #rrggbb colors — used to blend adjacent subject bands into one another.
function mixHex(a: string, b: string): string {
  const p = (h: string) => { const x = h.replace('#', ''); return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]; };
  const [ar, ag, ab] = p(a), [br, bg, bb] = p(b);
  const c = (x: number) => Math.round(x).toString(16).padStart(2, '0');
  return `#${c((ar + br) / 2)}${c((ag + bg) / 2)}${c((ab + bb) / 2)}`;
}

const ROOMS_MIN = 200;
const ROOMS_MAX = 640;
const ROOMS_DEFAULT = 432;

export function ChatPage() {
  const { lang, dir, allMessages, allRooms, allUsers, allSubjects, allTasks, allDepartments, selectedRoomId, setSelectedRoomId, setSelectedTaskId, selectedTaskId, currentRole, sendMessage, currentUser, chatSearch, setChatSearch, jumpMessageId, setJumpMessageId, setSciViewMode, clearRoomFilters } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();

  const [messageText, setMessageText] = useState('');
  // Which subject a message belongs to in the merged "by designer" view (required before sending).
  const [composeSubjectId, setComposeSubjectId] = useState<string | null>(null);
  const [showSendTask, setShowSendTask] = useState(false);
  // Composer "+" attach menu (image / video / task).
  const [attachOpen, setAttachOpen] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(true);
  const [mobileView, setMobileView] = useState<MobileView>('rooms');
  // Header → group-info panel: tap the header to expand it into a centered avatar + name + members.
  const [infoOpen, setInfoOpen] = useState(false);

  // Resizable rooms pane
  const [roomsWidth, setRoomsWidth] = useState(ROOMS_DEFAULT);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(ROOMS_DEFAULT);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  // Which room a "+ → task" should target (the merge view resolves it to the picked subject's chat).
  const [taskRoomId, setTaskRoomId] = useState<string | null>(null);

  const room = selectedRoomId ? allRooms.find(r => r.id === selectedRoomId) : null;
  const selectedTask = selectedTaskId ? allTasks.find(t => t.id === selectedTaskId) : null;
  const roomName = room ? getRoomDisplayName(room, currentUser, lang, allUsers, allSubjects, allDepartments) : '';
  const isFeed = room?.type === 'feed';
  // Merged "by designer" room (scientific supervisor): aggregates every message from this
  // designer's subject chats under the current supervisor, and is writable per-subject.
  const isMerge = room?.type === 'subject_merge';
  // The feed / merged view aggregates messages from several subject chats at once.
  const roomMessages = (() => {
    if (isFeed && room) {
      // Aggregate this designer's subject chats — scoped to the feed's stage when it has one.
      const ids = new Set(allRooms.filter(r => r.type === 'subject' && r.designerId === room.designerId && (!room.subDepartmentId || r.subDepartmentId === room.subDepartmentId)).map(r => r.id));
      return allMessages.filter(m => ids.has(m.roomId)).slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    if (isMerge && room) {
      // Aggregate this designer's merged subjects — scoped to the merge room's stage.
      const subjSet = new Set(room.subjectIds ?? []);
      const ids = new Set(allRooms.filter(r => r.type === 'subject' && r.designerId === room.designerId && r.subjectId && subjSet.has(r.subjectId) && (!room.subDepartmentId || r.subDepartmentId === room.subDepartmentId)).map(r => r.id));
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
  // Everyone but the designer can send a task — including in the merged "by designer" view
  // (it routes to the picked subject's chat, like a normal message there).
  const canSendTask = currentRole !== 'designer';

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
    setInfoOpen(false); // collapse the group-info panel when switching rooms
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
      // Route to the specific subject × designer × stage chat this merge room is scoped to.
      targetRoomId = room.subDepartmentId
        ? `asg_${composeSubjectId}_${room.designerId}_${room.subDepartmentId}`
        : `asg_${composeSubjectId}_${room.designerId}`;
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

  // "+ → task": in the merge view it targets the picked subject's chat; elsewhere the open room.
  const openSendTask = () => {
    setAttachOpen(false);
    if (isMerge && room) {
      if (!composeSubjectId) { toast({ title: tr.selectSubjectFirst }); return; }
      setTaskRoomId(room.subDepartmentId ? `asg_${composeSubjectId}_${room.designerId}_${room.subDepartmentId}` : `asg_${composeSubjectId}_${room.designerId}`);
    } else {
      setTaskRoomId(selectedRoomId);
    }
    setShowSendTask(true);
  };

  // "+ → image/video": open the native file picker (upload/preview is a future step).
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    toast({ title: lang === 'ar' ? `تم اختيار: ${file.name}` : `Selected: ${file.name}` });
  };

  // Auto-grow the composer with its content so every line stays visible (caps at max-h, then scrolls).
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [messageText, selectedRoomId]);

  // Clicking a message inside an aggregate view jumps to its real chat and flashes it there.
  // It also clears every filter (view mode + room-list filters) so the source room isn't hidden.
  const [flash, setFlash] = useState<{ id: string; color?: string } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
  const jumpToSource = (msg: Message) => {
    setCtxMenu(null);
    setSciViewMode('subject');
    clearRoomFilters();
    if (msg.roomId === selectedRoomId) { scrollToMsg(msg.id); return; }
    setFlash({ id: msg.id, color: subjectColorForMsg(msg) });
    setSelectedRoomId(msg.roomId);
    setJumpMessageId(msg.id);
    setMobileView('chat');
  };
  // Flashes pulse for ~1s, then clear.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1100);
    return () => clearTimeout(t);
  }, [flash]);

  // Close the right-click menu on Escape.
  useEffect(() => {
    if (!ctxMenu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCtxMenu(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctxMenu]);

  // Close the "+" attach menu on outside click.
  useEffect(() => {
    if (!attachOpen) return;
    const onDown = (e: MouseEvent) => { if (attachRef.current && !attachRef.current.contains(e.target as Node)) setAttachOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [attachOpen]);

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

  // Render a run of messages with the feed/merge subject-color bands (shared by date & stage groups).
  const renderRuns = (msgs: Message[]) => {
    const runs: { color?: string; messages: Message[] }[] = [];
    for (const msg of msgs) {
      const color = (isFeed || isMerge) ? subjectColorForMsg(msg) : undefined;
      const last = runs[runs.length - 1];
      if (last && last.color === color) last.messages.push(msg);
      else runs.push({ color, messages: [msg] });
    }
    const isAggregate = isFeed || isMerge;
    const renderMsg = (msg: Message) => {
      const isFlash = flash?.id === msg.id;
      const fc = flash?.color;
      return (
        <motion.div
          key={msg.id}
          id={`msg-${msg.id}`}
          onClick={isFeed ? () => jumpToSource(msg) : undefined}
          onContextMenu={isAggregate ? (e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, msg }); } : undefined}
          className={`rounded-xl transition-colors duration-300 ${isFeed ? 'cursor-pointer' : isMerge ? 'cursor-context-menu' : ''} ${msg.id === activeMatchId ? 'bg-secondary/10 ring-1 ring-secondary/40' : ''}`}
          animate={isFlash && fc ? { backgroundColor: [tint(fc, 0), tint(fc, 0.5), tint(fc, 0)] } : undefined}
          transition={isFlash ? { duration: 1, ease: 'easeInOut' } : { duration: 0 }}
        >
          <MessageItem message={msg} onTaskClick={isAggregate ? undefined : handleTaskClick} highlight={term ? chatSearch.trim() : undefined} />
        </motion.div>
      );
    };
    // Feed / merge: every run is colored → render one connected column where each band's
    // background blends (gradient) from the previous subject's color into the next, so the
    // subjects flow into each other instead of sitting in separate gapped strips.
    const allColored = runs.length > 0 && runs.every(r => r.color);
    if (allColored) {
      const grad = (i: number) => {
        const c = runs[i].color!;
        const prev = runs[i - 1]?.color ?? c;
        const next = runs[i + 1]?.color ?? c;
        const mid = tint(c, 0.1);
        // Solid subject color through the middle; blend only in a small ~14px zone at each seam.
        return `linear-gradient(to bottom, ${tint(mixHex(prev, c), 0.1)} 0, ${mid} 14px, ${mid} calc(100% - 14px), ${tint(mixHex(c, next), 0.1)} 100%)`;
      };
      return (
        <div className="rounded-2xl overflow-hidden my-1">
          {runs.map((run, i) => (
            <div key={i} className="px-3 py-1" style={{ background: grad(i) }}>
              {run.messages.map(renderMsg)}
            </div>
          ))}
        </div>
      );
    }

    return runs.map((run, ri) =>
      run.color ? (
        <div key={ri} className="rounded-2xl my-1 px-3 py-1" style={{ backgroundColor: tint(run.color, 0.1) }}>
          {run.messages.map(renderMsg)}
        </div>
      ) : (
        run.messages.map(renderMsg)
      )
    );
  };

  // The "التفاعل" feed (all-stages aggregate) keeps messages in TIME order (newest at the
  // bottom) and just inserts a dashed, stage-named divider whenever the stage changes from
  // the previous message — exactly like the date divider, but per sub-department.
  const isAllFeed = isFeed && !!room && !room.subDepartmentId && allDepartments.some(d => d.id === room.departmentId && (d.subDepartments?.length ?? 0) > 0);
  const stageGroups = (() => {
    if (!isAllFeed || !room) return [] as { key: string; stageName: string; messages: Message[] }[];
    const dept = allDepartments.find(d => d.id === room.departmentId);
    const groups: { key: string; stageName: string; messages: Message[] }[] = [];
    let lastStage: string | null = null;
    for (const msg of roomMessages) {
      const r = allRooms.find(rr => rr.id === msg.roomId);
      const sid = r?.subDepartmentId ?? '';
      if (sid !== lastStage) {
        lastStage = sid;
        groups.push({ key: `${sid}-${groups.length}`, stageName: dept?.subDepartments?.find(s => s.id === sid)?.name ?? '', messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  })();

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
            {/* Chat Header — tap it to expand into a centered group-info panel */}
            <motion.div layout className="border-b border-border bg-card/80 backdrop-blur-sm overflow-hidden">
              {!infoOpen ? (
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setMobileView('rooms')}
                      className="lg:hidden p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                    >
                      {dir === 'rtl' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                    {/* Avatar sits at the start (right in RTL); the whole block opens the info panel */}
                    <button
                      onClick={() => setInfoOpen(true)}
                      data-testid="open-group-info"
                      className="flex items-center gap-3 min-w-0 text-start hover:opacity-80 transition-opacity"
                    >
                      <motion.div layoutId="room-avatar" className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {roomName.charAt(0)}
                      </motion.div>
                      <div className="min-w-0">
                        <motion.h2 layoutId="room-name" className="text-sm font-semibold text-foreground truncate text-start">{roomName}</motion.h2>
                        {(isFeed || room.activeTaskCount > 0) && (
                          <div className="flex items-center gap-2">
                            {isFeed && (
                              <span className="text-xs text-muted-foreground">{lang === 'ar' ? 'للقراءة فقط' : 'Read-only'}</span>
                            )}
                            {room.activeTaskCount > 0 && (
                              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{room.activeTaskCount} {tr.activeTasksCount}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                  {selectedTask && (
                    <button
                      onClick={() => setShowTaskPanel(!showTaskPanel)}
                      className="hidden lg:flex p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                      data-testid="toggle-task-panel"
                    >
                      <PanelRightOpen size={16} />
                    </button>
                  )}
                </div>
              ) : (
                /* Expanded info panel — drops down to ~a quarter of the screen */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center px-4 pt-4 pb-3"
                  style={{ height: '26vh' }}
                >
                  {/* Avatar (4× bigger) + name centered — click anywhere here to collapse */}
                  <button onClick={() => setInfoOpen(false)} data-testid="close-group-info" className="flex flex-col items-center focus:outline-none flex-shrink-0">
                    <motion.div layoutId="room-avatar" className="w-36 h-36 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-5xl font-bold">
                      {roomName.charAt(0)}
                    </motion.div>
                    <motion.h2 layoutId="room-name" className="text-xl font-bold text-foreground mt-3 text-center">{roomName}</motion.h2>
                  </button>
                  <span className="text-xs text-muted-foreground mt-1 flex-shrink-0">
                    {isFeed ? (lang === 'ar' ? 'للقراءة فقط' : 'Read-only') : `${room.participantIds.length} ${tr.participants}`}
                  </span>
                  {/* The people in this group */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-3 w-full flex-1 min-h-0 overflow-y-auto scrollbar-none">
                    {room.participantIds.map(uid => {
                      const u = allUsers.find(x => x.id === uid);
                      if (!u) return null;
                      return (
                        <div key={uid} className="flex items-center gap-1.5 bg-muted/60 rounded-full ps-1 pe-3 py-1">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">{u.avatar}</div>
                          <span className="text-xs text-foreground whitespace-nowrap">{lang === 'ar' ? u.name : u.nameEn}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>

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
                  {isAllFeed ? (
                    // "التفاعل" feed — one dashed, stage-named divider above each stage's messages.
                    stageGroups.map(g => (
                      <div key={g.key}>
                        {g.stageName && (
                          <div className="flex items-center gap-2 mt-6 mb-3">
                            <span className="text-xs font-semibold text-muted-foreground px-1">{g.stageName}</span>
                            <div className="flex-1 border-t-2 border-dashed border-border" />
                          </div>
                        )}
                        {renderRuns(g.messages)}
                      </div>
                    ))
                  ) : (
                    messageGroups.map(group => (
                      <div key={group.date}>
                        <div className="flex items-center gap-2 my-3">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground px-2">{group.date}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        {renderRuns(group.messages)}
                      </div>
                    ))
                  )}
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
                {/* "+" attach menu — shown for every role and every view (incl. "by designer").
                    Designers only get image/video; everyone else also gets "task". */}
                <div ref={attachRef} className="relative flex-shrink-0">
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} data-testid="attach-image-input" />
                  <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={onPickFile} data-testid="attach-video-input" />
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setAttachOpen(v => !v)}
                    className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center hover:bg-secondary/20 transition-colors"
                    data-testid="attach-btn"
                  >
                    <Plus size={18} />
                  </motion.button>
                  <AnimatePresence>
                    {attachOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full mb-2 start-0 z-30 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden p-1"
                      >
                        <button
                          onClick={() => { setAttachOpen(false); imageInputRef.current?.click(); }}
                          data-testid="attach-image"
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-muted/70 transition-colors text-start"
                        >
                          <ImageIcon size={15} className="text-secondary flex-shrink-0" />
                          {lang === 'ar' ? 'صورة' : 'Image'}
                        </button>
                        <button
                          onClick={() => { setAttachOpen(false); videoInputRef.current?.click(); }}
                          data-testid="attach-video"
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-muted/70 transition-colors text-start"
                        >
                          <Video size={15} className="text-secondary flex-shrink-0" />
                          {lang === 'ar' ? 'فيديو' : 'Video'}
                        </button>
                        {canSendTask && (
                          <button
                            onClick={openSendTask}
                            data-testid="attach-task"
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-muted/70 transition-colors text-start"
                          >
                            <ClipboardList size={15} className="text-primary flex-shrink-0" />
                            {lang === 'ar' ? 'مهمة' : 'Task'}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1">
                  <textarea
                    ref={composerRef}
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={isMerge && !composeSubjectId ? tr.selectSubjectFirst : tr.typeMessage}
                    rows={1}
                    className="w-full resize-none bg-muted/60 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all max-h-60 overflow-auto"
                    data-testid="message-input"
                    style={{ minHeight: '40px' }}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleSend}
                  disabled={!messageText.trim() || (isMerge && !composeSubjectId)}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all"
                  data-testid="send-message-btn"
                >
                  {/* Telegram-style filled paper plane */}
                  <svg viewBox="0 0 24 24" width={17} height={17} fill="currentColor" aria-hidden="true">
                    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.27 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
                  </svg>
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

      {showSendTask && (taskRoomId ?? selectedRoomId) && (
        <AnimatePresence>
          <SendTaskModal roomId={(taskRoomId ?? selectedRoomId)!} onClose={() => setShowSendTask(false)} />
        </AnimatePresence>
      )}

      {/* Right-click menu on aggregate-view messages → jump to the real chat + clear filters */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} onContextMenu={e => { e.preventDefault(); setCtxMenu(null); }} />
          <div
            className="fixed z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[190px]"
            style={{ top: Math.min(ctxMenu.y, window.innerHeight - 60), left: Math.min(ctxMenu.x, window.innerWidth - 210) }}
          >
            <button
              onClick={() => jumpToSource(ctxMenu.msg)}
              data-testid="ctx-goto-source"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-muted/70 transition-colors text-start"
            >
              <CornerUpLeft size={15} className="text-muted-foreground flex-shrink-0" />
              {lang === 'ar' ? 'الانتقال لأصل الرسالة' : 'Go to original message'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

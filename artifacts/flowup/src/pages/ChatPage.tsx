import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Plus, Users, ChevronLeft, ChevronRight, PanelRightOpen } from 'lucide-react';
import { RoomList } from '@/components/chat/RoomList';
import { MessageItem } from '@/components/chat/MessageItem';
import { TaskDetailsPanel } from '@/components/tasks/TaskDetailsPanel';
import { SendTaskModal } from '@/components/modals/SendTaskModal';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { useToast } from '@/hooks/use-toast';

type MobileView = 'rooms' | 'chat' | 'task';

const ROOMS_MIN = 200;
const ROOMS_MAX = 520;
const ROOMS_DEFAULT = 288;

export function ChatPage() {
  const { lang, dir, allMessages, allRooms, allUsers, selectedRoomId, setSelectedRoomId, setSelectedTaskId, selectedTaskId, currentRole, sendMessage, currentUser } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();

  const [messageText, setMessageText] = useState('');
  const [showSendTask, setShowSendTask] = useState(false);
  const [showTaskPanel, setShowTaskPanel] = useState(true);
  const [mobileView, setMobileView] = useState<MobileView>('rooms');

  // Resizable rooms pane
  const [roomsWidth, setRoomsWidth] = useState(ROOMS_DEFAULT);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(ROOMS_DEFAULT);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const room = selectedRoomId ? allRooms.find(r => r.id === selectedRoomId) : null;
  const roomMessages = allMessages.filter(m => m.roomId === selectedRoomId);
  const canSendTask = currentRole !== 'designer';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length]);

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
    sendMessage(selectedRoomId, messageText.trim(), messageText.trim(), 'text');
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
        const label = d === today ? tr.today : d === yesterday ? tr.yesterday : msg.timestamp.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB');
        groups.push({ date: label, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  };

  const messageGroups = groupMessagesByDate();

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
                  {(lang === 'ar' ? room.name : room.nameEn).charAt(0)}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{lang === 'ar' ? room.name : room.nameEn}</h2>
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
                    <span className="text-xs text-muted-foreground">{room.participantIds.length} {tr.participants}</span>
                    {room.activeTaskCount > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{room.activeTaskCount} {tr.activeTasksCount}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowTaskPanel(!showTaskPanel)}
                className="hidden lg:flex p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                data-testid="toggle-task-panel"
              >
                <PanelRightOpen size={16} />
              </button>
            </div>

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
                        <MessageItem key={msg.id} message={msg} onTaskClick={handleTaskClick} />
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Composer */}
            <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
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
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder={tr.typeMessage}
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
                  disabled={!messageText.trim()}
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
          </>
        )}
      </div>

      {/* TASK DETAILS PANEL */}
      <AnimatePresence>
        {(showTaskPanel || mobileView === 'task') && (
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

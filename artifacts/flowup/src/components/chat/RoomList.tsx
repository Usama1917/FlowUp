import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Layers, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import type { Room } from '@/data/mockData';

type Filter = 'all' | 'unread' | 'active' | 'overdue';

interface RoomListProps {
  onRoomSelect?: (roomId: string) => void;
}

const avatarColors = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];

function formatRelativeTime(date: Date, lang: string) {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (lang === 'ar') {
    if (diffMins < 60) return `${diffMins}د`;
    if (diffHours < 24) return `${diffHours}س`;
    return `${diffDays}ي`;
  }
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
}

export function RoomList({ onRoomSelect }: RoomListProps) {
  const { lang, allRooms, allTasks, allDepartments, selectedRoomId, setSelectedRoomId } = useApp();
  const tr = getTranslations(lang);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [deptOpen, setDeptOpen] = useState(false);
  const deptRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: tr.allRooms },
    { key: 'unread', label: tr.unread },
    { key: 'active', label: tr.activeTasks },
    { key: 'overdue', label: tr.overdue },
  ];

  const activeDepts = allDepartments.filter(d => d.active);
  const selectedDept = activeDepts.find(d => d.id === selectedDeptId);

  const filteredRooms = allRooms.filter(room => {
    const name = lang === 'ar' ? room.name : room.nameEn;
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase());
    const matchDept = !selectedDeptId || room.departmentId === selectedDeptId;
    const matchFilter =
      filter === 'all' ? true :
      filter === 'unread' ? room.unreadCount > 0 :
      filter === 'active' ? room.activeTaskCount > 0 :
      filter === 'overdue' ? allTasks.some(t => t.roomId === room.id && (t.status === 'overdue' || (t.deadline < new Date() && !['approved', 'closed'].includes(t.status)))) : true;
    return matchSearch && matchDept && matchFilter;
  });

  const handleSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    onRoomSelect?.(roomId);
  };

  return (
    <div className="flex flex-col h-full bg-card border-e border-border">
      {/* Search + Dept button row */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tr.searchRooms}
              className="ps-8 h-8 text-sm bg-muted/50 border-0 rounded-xl"
              data-testid="room-search"
            />
          </div>

          {/* Dept filter button */}
          <div ref={deptRef} className="relative flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setDeptOpen(v => !v)}
              data-testid="dept-filter-btn"
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium transition-colors duration-150 border ${
                selectedDeptId
                  ? 'bg-secondary text-white border-secondary'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
              }`}
            >
              <Layers size={13} />
              {selectedDept
                ? <span className="max-w-[60px] truncate">{lang === 'ar' ? selectedDept.name : selectedDept.nameEn}</span>
                : <span>{tr.all}</span>
              }
            </motion.button>

            {/* Floating dropdown */}
            <AnimatePresence>
              {deptOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1.5 end-0 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[180px]"
                >
                  {/* All option */}
                  <button
                    onClick={() => { setSelectedDeptId(null); setDeptOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 ${!selectedDeptId ? 'text-secondary font-medium' : 'text-foreground'}`}
                    data-testid="dept-option-all"
                  >
                    <span>{tr.all}</span>
                    {!selectedDeptId && <Check size={13} className="text-secondary" />}
                  </button>
                  <div className="h-px bg-border mx-2" />
                  {activeDepts.map(dept => (
                    <button
                      key={dept.id}
                      onClick={() => { setSelectedDeptId(selectedDeptId === dept.id ? null : dept.id); setDeptOpen(false); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 ${selectedDeptId === dept.id ? 'text-secondary font-medium' : 'text-foreground'}`}
                      data-testid={`dept-option-${dept.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono text-muted-foreground ltr-value">{dept.code}</span>
                        <span className="truncate">{lang === 'ar' ? dept.name : dept.nameEn}</span>
                      </div>
                      {selectedDeptId === dept.id && <Check size={13} className="text-secondary flex-shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-3 pb-2">
        {filters.map(f => (
          <motion.button
            key={f.key}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 text-xs px-2 py-1 rounded-lg transition-colors duration-150 ${filter === f.key ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/70'}`}
          >
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto scrollbar-none border-t border-border/50">
        <AnimatePresence>
          {filteredRooms.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Search size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{tr.noRooms}</p>
              <p className="text-xs text-muted-foreground mt-1">{tr.noRoomsDesc}</p>
            </motion.div>
          ) : (
            filteredRooms.map((room, idx) => (
              <RoomItem
                key={room.id}
                room={room}
                isSelected={room.id === selectedRoomId}
                onSelect={handleSelect}
                index={idx}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function RoomItem({ room, isSelected, onSelect, index }: { room: Room; isSelected: boolean; onSelect: (id: string) => void; index: number }) {
  const { lang, allTasks } = useApp();
  const overdueCount = allTasks.filter(t => t.roomId === room.id && t.deadline < new Date() && !['approved', 'closed'].includes(t.status)).length;

  return (
    <motion.button
      initial={{ opacity: 0, x: lang === 'ar' ? 10 : -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ backgroundColor: 'var(--elevate-1)' }}
      onClick={() => onSelect(room.id)}
      data-testid={`room-item-${room.id}`}
      className={`w-full flex items-start gap-3 px-3 py-3 transition-colors duration-150 text-start border-b border-border/40 ${isSelected ? 'bg-secondary/8 border-s-2 border-s-secondary' : ''}`}
    >
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${avatarColors[index % avatarColors.length]}`}>
        {(lang === 'ar' ? room.name : room.nameEn).charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-secondary' : 'text-foreground'}`}>
            {lang === 'ar' ? room.name : room.nameEn}
          </p>
          <span className="text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(room.lastMessageTime, lang)}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {lang === 'ar' ? room.lastMessage : room.lastMessageEn}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {room.activeTaskCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">
              {room.activeTaskCount}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-medium">
              !
            </span>
          )}
          {room.unreadCount > 0 && (
            <span className="ms-auto text-xs bg-secondary text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium">
              {room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Layers, Check, BookMarked, Plus, Pin, LayoutGrid, BookCopy, User, Folders } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { getRoomDisplayName } from '@/data/mockData';
import { highlightText } from '@/lib/highlight';
import type { Room } from '@/data/mockData';

type Filter = 'all' | 'unread' | 'active' | 'overdue';

interface RoomListProps {
  onRoomSelect?: (roomId: string) => void;
}

const avatarColors = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];

// Dot colors for the work-stage (sub-department) filter, picked by index.
const STAGE_DOTS = ['#8b5cf6', '#0ea5e9', '#16a34a', '#f59e0b', '#ef4444', '#6366f1'];

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
  const { lang, currentUser, currentRole, allRooms, allTasks, allMessages, allUsers, allSubjects, allDepartments, selectedRoomId, setSelectedRoomId, setChatSearch, setJumpMessageId, sciViewMode, setSciViewMode, roomFiltersNonce, startDirectChat } = useApp();
  const tr = getTranslations(lang);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [deptOpen, setDeptOpen] = useState(false);
  const [subjOpen, setSubjOpen] = useState(false);
  const [privOpen, setPrivOpen] = useState(false);
  // Work-stage (sub-department) filter — null means the main (first) stage; 'all' shows every stage.
  const [stagesOpen, setStagesOpen] = useState(false);
  const [selectedSubDeptId, setSelectedSubDeptId] = useState<string | null>(null);
  const deptRef = useRef<HTMLDivElement>(null);
  const subjRef = useRef<HTMLDivElement>(null);
  const privRef = useRef<HTMLDivElement>(null);
  const stagesRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (deptRef.current && !deptRef.current.contains(t)) setDeptOpen(false);
      if (subjRef.current && !subjRef.current.contains(t)) setSubjOpen(false);
      if (privRef.current && !privRef.current.contains(t)) setPrivOpen(false);
      if (stagesRef.current && !stagesRef.current.contains(t)) setStagesOpen(false);
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

  const isSciSup = currentRole === 'scientific_supervisor';
  const isOversight = currentRole === 'manager' || currentRole === 'design_supervisor';
  // The designer is locked to subject group chats only — no other groups, no private chats.
  const isDesigner = currentRole === 'designer';

  const activeDepts = allDepartments.filter(d => d.active);
  const selectedDept = activeDepts.find(d => d.id === selectedDeptId);

  // Work stages (sub-departments) that drive the folder filter.
  //  - designer: only the stages they were assigned to (so the filter appears only when they
  //    do more than one thing, e.g. تصميم + تدقيق).
  //  - supervisor / manager: every stage of their department.
  const deptStages = allDepartments.find(d => d.id === currentUser.department)?.subDepartments ?? [];
  const stages = isDesigner
    ? deptStages.filter(st => (currentUser.subDepartmentIds ?? []).includes(st.id))
    : deptStages;
  const mainStageId = stages[0]?.id ?? null;
  // Which stage the room list is scoped to: 'all' or null = every stage; otherwise a specific stage.
  // While searching, the default (no explicit folder) spans ALL stages so a search isn't silently
  // limited to the stage you happened to be standing in — unless you explicitly picked a folder.
  const searching = search.trim().length > 0;
  const validSpecific = stages.some(s => s.id === selectedSubDeptId);
  const activeStageId =
    selectedSubDeptId === 'all' ? null
    : validSpecific ? selectedSubDeptId
    : (searching ? null : mainStageId);

  // Subjects this scientific supervisor actually works on: matched by ERPNext code AND
  // having a live subject chat (a designer assigned). A subject with no chat doesn't count,
  // so the "موادي" filter only shows when there's genuinely more than one subject to switch between.
  const mySubjects = isSciSup
    ? allSubjects.filter(s =>
        s.scientificSupervisorCode === currentUser.employeeCode &&
        allRooms.some(r => r.type === 'subject' && r.subjectId === s.id && r.participantIds.includes(currentUser.id)))
    : [];
  const selectedSubject = mySubjects.find(s => s.id === selectedSubjectId);

  const roomIsOverdue = (roomId: string) =>
    allTasks.some(t => t.roomId === roomId && (t.status === 'overdue' || (t.deadline < new Date() && !['approved', 'closed'].includes(t.status))));

  // Only the chats the current user is part of, with per-role scoping:
  //  - designer: subject chats + their read-only feed
  //  - scientific supervisor: subject chats only (no manual groups); direct chats kept
  //    so a manager/design-supervisor-initiated DM still reaches them
  const myRooms = allRooms.filter(r => {
    if (!r.participantIds.includes(currentUser.id)) return false;
    if (isDesigner) return r.type === 'subject' || r.type === 'feed';
    if (isSciSup) {
      // 'subject' view → one chat per subject×designer; 'designer' view → one merged chat per designer.
      const subjectKind = sciViewMode === 'designer' ? r.type === 'subject_merge' : r.type === 'subject';
      return subjectKind || r.type === 'direct';
    }
    return true;
  });

  // Keep the selection valid for the current user (e.g. after switching role)
  useEffect(() => {
    if (selectedRoomId && myRooms.length > 0 && !myRooms.some(r => r.id === selectedRoomId)) {
      setSelectedRoomId(myRooms[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, selectedRoomId, myRooms.length]);

  // Reset the stage filter back to the main stage when switching user/role.
  useEffect(() => { setSelectedSubDeptId(null); }, [currentUser.id]);

  // "Go to source" (and similar) asks to clear every filter so the target room isn't hidden.
  useEffect(() => {
    if (roomFiltersNonce === 0) return;
    setSearch(''); setSelectedDeptId(null); setSelectedSubjectId(null); setSelectedSubDeptId(null); setFilter('all');
    setDeptOpen(false); setSubjOpen(false); setStagesOpen(false);
  }, [roomFiltersNonce]);

  // Search matches the room name OR any message content inside it (both languages),
  // plus the seed last-message preview for rooms that have no message objects yet.
  const roomMatchesSearch = (room: Room, q: string) => {
    const display = getRoomDisplayName(room, currentUser, lang, allUsers, allSubjects, allDepartments);
    if (display.toLowerCase().includes(q)) return true;
    if (room.lastMessage?.toLowerCase().includes(q) || room.lastMessageEn?.toLowerCase().includes(q)) return true;
    return allMessages.some(m => m.roomId === room.id && (
      m.text?.toLowerCase().includes(q) || m.textEn?.toLowerCase().includes(q)
    ));
  };

  const filteredRooms = myRooms.filter(room => {
    const matchSearch = !search || roomMatchesSearch(room, search.toLowerCase());
    const matchDept = !selectedDeptId || room.departmentId === selectedDeptId;
    const matchSubject = !selectedSubjectId || room.subjectId === selectedSubjectId;
    // Stage filter applies to subject chats and the "by designer" merged chats; others pass.
    const stageScoped = room.type === 'subject' || room.type === 'subject_merge';
    const matchStage = !stageScoped || !activeStageId || !room.subDepartmentId || room.subDepartmentId === activeStageId;
    const matchFilter =
      filter === 'all' ? true :
      filter === 'unread' ? room.unreadCount > 0 :
      filter === 'active' ? room.activeTaskCount > 0 :
      filter === 'overdue' ? roomIsOverdue(room.id) : true;
    return matchSearch && matchDept && matchSubject && matchStage && matchFilter;
  });

  // Most-recent message time in a room (falls back to the seed time), used to sort by recency.
  const roomLastTime = (room: Room) => {
    const ids = room.type === 'subject_merge'
      ? new Set(allRooms.filter(r => r.type === 'subject' && r.designerId === room.designerId && r.subjectId && room.subjectIds?.includes(r.subjectId)).map(r => r.id))
      : new Set([room.id]);
    let t = 0;
    for (const m of allMessages) { if (ids.has(m.roomId)) { const ts = m.timestamp.getTime(); if (ts > t) t = ts; } }
    return t || room.lastMessageTime.getTime();
  };

  // When showing every stage at once ("الكل"), order the subject chats newest-first.
  const subjectRooms = filteredRooms.filter(r => r.type === 'subject' || r.type === 'subject_merge');
  const orderedSubjectRooms = selectedSubDeptId === 'all'
    ? [...subjectRooms].sort((a, b) => roomLastTime(b) - roomLastTime(a))
    : subjectRooms;

  // Section header for the chats list:
  //  - "by designer" merge view → the people of the active stage (التصميم → المصممين, …)
  //  - "الكل" mode → subjects + sub-departments
  //  - otherwise → "المواد"
  let subjectsLabel: string;
  if (isSciSup && sciViewMode === 'designer') {
    const st = activeStageId ? stages.find(s => s.id === activeStageId) : null;
    subjectsLabel = st
      ? (lang === 'ar' ? (st.memberLabel || st.name) : (st.memberLabelEn || st.nameEn))
      : (lang === 'ar' ? 'الأشخاص' : 'People');
  } else if (selectedSubDeptId === 'all') {
    subjectsLabel = lang === 'ar' ? 'المواد - الأقسام الفرعية' : 'Subjects - Sub-departments';
  } else {
    subjectsLabel = tr.subjects;
  }

  const sections = [
    { key: 'subjects', label: subjectsLabel, rooms: orderedSubjectRooms },
    { key: 'groups', label: tr.sectionGroups, rooms: filteredRooms.filter(r => r.type === 'group' || r.type === 'dept_room' || r.type === 'task_room') },
    { key: 'direct', label: tr.sectionPrivate, rooms: filteredRooms.filter(r => r.type === 'direct') },
  ].filter(s => s.rooms.length > 0);

  // The designer's read-only aggregate feed — pinned at the very top.
  //  - a specific stage → that stage's feed.
  //  - "الكل" (activeStageId null) → the "التفاعل" feed that aggregates every stage.
  const feedRoom = activeStageId === null
    ? (myRooms.find(r => r.type === 'feed' && !r.subDepartmentId) ?? myRooms.find(r => r.type === 'feed'))
    : (myRooms.find(r => r.type === 'feed' && r.subDepartmentId === activeStageId) ?? myRooms.find(r => r.type === 'feed'));

  // Opening a room carries the current search term into the chat (highlight + navigate),
  // and jumps to the specific matched message when the result was clicked from search.
  const handleSelect = (roomId: string, jumpMsgId?: string) => {
    setSelectedRoomId(roomId);
    setChatSearch(search.trim());
    setJumpMessageId(jumpMsgId ?? null);
    onRoomSelect?.(roomId);
  };

  const handleStartPrivate = (otherId: string) => {
    const rid = startDirectChat(otherId);
    setSelectedRoomId(rid);
    setChatSearch('');
    setJumpMessageId(null);
    onRoomSelect?.(rid);
    setPrivOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-card border-e border-border">
      {/* Search + role-aware filter */}
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

          {/* Oversight roles → department filter */}
          {isOversight && (
            <div ref={deptRef} className="relative flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setDeptOpen(v => !v)}
                data-testid="dept-filter-btn"
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium transition-colors duration-150 border ${
                  selectedDeptId ? 'bg-secondary text-white border-secondary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                }`}
              >
                <Layers size={13} />
                {selectedDept
                  ? <span className="max-w-[60px] truncate">{lang === 'ar' ? selectedDept.name : selectedDept.nameEn}</span>
                  : <span>{tr.all}</span>}
              </motion.button>
              <AnimatePresence>
                {deptOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1.5 end-0 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[180px]"
                  >
                    <button
                      onClick={() => { setSelectedDeptId(null); setDeptOpen(false); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 ${!selectedDeptId ? 'text-secondary font-medium' : 'text-foreground'}`}
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
          )}

          {/* Scientific supervisor with >1 subject → toggle: group chats by subject vs by designer */}
          {isSciSup && mySubjects.length > 1 && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setSciViewMode(sciViewMode === 'subject' ? 'designer' : 'subject')}
              data-testid="sci-view-toggle"
              title={sciViewMode === 'subject'
                ? (lang === 'ar' ? 'العرض: حسب المادة — اضغط للعرض حسب المصمم' : 'View: by subject — tap for by designer')
                : (lang === 'ar' ? 'العرض: حسب المصمم — اضغط للعرض حسب المادة' : 'View: by designer — tap for by subject')}
              className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-xl bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted hover:text-foreground transition-colors duration-150"
            >
              {/* Icon shows the view you'll switch TO on tap (not the current one) */}
              {sciViewMode === 'subject' ? <User size={15} /> : <BookCopy size={15} />}
            </motion.button>
          )}

          {/* "موادي" filter (subject view only). Animating its real WIDTH makes the flex row
              reflow every frame, so the search field grows and the toggle slides left in lockstep. */}
          <AnimatePresence initial={false}>
          {isSciSup && mySubjects.length > 1 && sciViewMode === 'subject' && (
            <motion.div
              key="my-subjects-filter"
              ref={subjRef}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="relative flex-shrink-0"
            >
              {/* inner clip so the button is cut as the width collapses — but NOT the dropdown */}
              <div className="overflow-hidden">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSubjOpen(v => !v)}
                  data-testid="my-subjects-btn"
                  className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors duration-150 border ${
                    selectedSubjectId ? 'bg-secondary text-white border-secondary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <BookMarked size={13} className="flex-shrink-0" />
                  {selectedSubject
                    ? <span className="max-w-[64px] truncate">{selectedSubject.name}</span>
                    : <span>{tr.mySubjectsFilter}</span>}
                </motion.button>
              </div>
              <AnimatePresence>
                {subjOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1.5 end-0 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[200px]"
                  >
                    <button
                      onClick={() => { setSelectedSubjectId(null); setSubjOpen(false); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 ${!selectedSubjectId ? 'text-secondary font-medium' : 'text-foreground'}`}
                    >
                      <span>{tr.all}</span>
                      {!selectedSubjectId && <Check size={13} className="text-secondary" />}
                    </button>
                    <div className="h-px bg-border mx-2" />
                    {mySubjects.map(subject => (
                      <button
                        key={subject.id}
                        onClick={() => { setSelectedSubjectId(selectedSubjectId === subject.id ? null : subject.id); setSubjOpen(false); }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-muted/60 ${selectedSubjectId === subject.id ? 'text-secondary font-medium' : 'text-foreground'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                          <span className="truncate">{subject.name}</span>
                        </div>
                        {selectedSubjectId === subject.id && <Check size={13} className="text-secondary flex-shrink-0" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-1 px-3 pb-2">
        {/* Work-stage (sub-department) filter — folder icon at the very start (right in RTL).
            Shows only when there's more than one stage to switch between. */}
        {stages.length > 1 && (
          <div ref={stagesRef} className="relative flex-shrink-0 me-1">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setStagesOpen(v => !v)}
              data-testid="stages-btn"
              title={lang === 'ar' ? 'المراحل' : 'Stages'}
              className={`flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs font-medium transition-colors duration-150 border ${stagesOpen || selectedSubDeptId ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}`}
            >
              <Folders size={14} className="flex-shrink-0" />
              <span className="max-w-[64px] truncate">
                {activeStageId === null
                  ? (lang === 'ar' ? 'الكل' : 'All')
                  : (() => { const st = stages.find(s => s.id === activeStageId); return st ? (lang === 'ar' ? st.name : st.nameEn) : ''; })()}
              </span>
            </motion.button>
            <AnimatePresence>
              {stagesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1 start-0 z-30 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden p-1"
                >
                  <button
                    onClick={() => { setSelectedSubDeptId('all'); setStagesOpen(false); }}
                    data-testid="stage-all"
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-start ${selectedSubDeptId === 'all' ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/70'}`}
                  >
                    <Layers size={14} className="flex-shrink-0" />
                    {lang === 'ar' ? 'كل المراحل' : 'All stages'}
                  </button>
                  {stages.map((s, idx) => {
                    const isActive = selectedSubDeptId !== 'all' && activeStageId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedSubDeptId(s.id); setStagesOpen(false); }}
                        data-testid={`stage-${s.id}`}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-start ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted/70'}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STAGE_DOTS[idx % STAGE_DOTS.length] }} />
                        {lang === 'ar' ? s.name : s.nameEn}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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

      {/* New private chat — only the oversight roles (manager / design supervisor).
          The designer is locked to subject groups; the scientific supervisor talks
          to designers only inside their subject rooms, never in a private chat. */}
      {isOversight && (
      <div ref={privRef} className="px-3 pb-2 relative">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setPrivOpen(v => !v)}
          data-testid="new-private-chat-btn"
          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
        >
          <Plus size={13} />
          {tr.newPrivateChat}
        </motion.button>
        <AnimatePresence>
          {privOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full mt-1.5 inset-x-3 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-72 overflow-y-auto scrollbar-none"
            >
              {allUsers.filter(u => u.id !== currentUser.id && u.role !== 'designer').map((u, i) => (
                <button
                  key={u.id}
                  onClick={() => handleStartPrivate(u.id)}
                  data-testid={`start-private-${u.id}`}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-start transition-colors hover:bg-muted/60"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[i % avatarColors.length]}`}>
                    {u.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lang === 'ar' ? u.name : u.nameEn}</p>
                    <p className="text-xs text-muted-foreground truncate ltr-value">{u.employeeCode}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Chat list (grouped by section) */}
      <div className="flex-1 overflow-y-auto scrollbar-none border-t border-border/50">
        {/* Pinned read-only feed (designer only) */}
        {feedRoom && (
          <button
            onClick={() => handleSelect(feedRoom.id)}
            data-testid="feed-room"
            className={`w-full flex items-center gap-3 px-3 py-3 text-start border-b border-border/60 transition-colors ${selectedRoomId === feedRoom.id ? 'bg-secondary/10 border-s-2 border-s-secondary' : 'hover:bg-muted/50'}`}
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white flex-shrink-0">
              <LayoutGrid size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Pin size={11} className="text-secondary flex-shrink-0" />
                <p className={`text-sm font-semibold truncate ${selectedRoomId === feedRoom.id ? 'text-secondary' : 'text-foreground'}`}>
                  {getRoomDisplayName(feedRoom, currentUser, lang, allUsers, allSubjects, allDepartments)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{lang === 'ar' ? 'كل رسائل موادك — للقراءة فقط' : 'All your subjects — read-only'}</p>
            </div>
          </button>
        )}
        {sections.length === 0 && !feedRoom ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Search size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">{tr.noRooms}</p>
            <p className="text-xs text-muted-foreground mt-1">{tr.noRoomsDesc}</p>
          </motion.div>
        ) : (
          sections.map(sec => (
            <div key={sec.key}>
              <p className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground/70">{sec.label}</p>
              {sec.rooms.map((room, idx) => (
                <RoomItem
                  key={room.id}
                  room={room}
                  isSelected={room.id === selectedRoomId}
                  onSelect={handleSelect}
                  index={idx}
                  searchTerm={search}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function RoomItem({ room, isSelected, onSelect, index, searchTerm }: { room: Room; isSelected: boolean; onSelect: (id: string, jumpMsgId?: string) => void; index: number; searchTerm: string }) {
  const { lang, currentUser, allUsers, allSubjects, allTasks, allMessages, allDepartments, allRooms } = useApp();
  const displayName = getRoomDisplayName(room, currentUser, lang, allUsers, allSubjects, allDepartments);
  const overdueCount = allTasks.filter(t => t.roomId === room.id && t.deadline < new Date() && !['approved', 'closed'].includes(t.status)).length;

  const subject = room.subjectId ? allSubjects.find(s => s.id === room.subjectId) : null;

  // A merged "by designer" room has no messages of its own — it aggregates the designer's
  // subject chats for its stage, so match/preview against that exact set of room ids.
  const roomIds = room.type === 'subject_merge'
    ? new Set(allRooms.filter(r => r.type === 'subject' && r.designerId === room.designerId && r.subjectId && room.subjectIds?.includes(r.subjectId) && (!room.subDepartmentId || r.subDepartmentId === room.subDepartmentId)).map(r => r.id))
    : new Set([room.id]);

  // Last activity for preview/time — derived from real messages, falling back to the seed
  let lastMsg = null as (typeof allMessages)[number] | null;
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (roomIds.has(allMessages[i].roomId)) { lastMsg = allMessages[i]; break; }
  }

  // While searching, surface the most recent message in this room that matches the term
  // (Telegram-style) so the preview shows *why* the room matched, and clicking jumps to it.
  const q = searchTerm.trim().toLowerCase();
  let matchMsg = null as (typeof allMessages)[number] | null;
  if (q) {
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const m = allMessages[i];
      if (!roomIds.has(m.roomId)) continue;
      const txt = (lang === 'ar' ? m.text : m.textEn) || '';
      if (txt.toLowerCase().includes(q)) { matchMsg = m; break; }
    }
  }

  const hasActivity = !!lastMsg || !!room.lastMessage;
  const previewText = matchMsg
    ? (lang === 'ar' ? matchMsg.text : matchMsg.textEn)
    : lastMsg ? (lang === 'ar' ? lastMsg.text : lastMsg.textEn) : (room.lastMessage ? (lang === 'ar' ? room.lastMessage : room.lastMessageEn) : '');
  const preview = matchMsg ? highlightText(previewText, searchTerm) : previewText;
  const time = matchMsg ? matchMsg.timestamp : lastMsg ? lastMsg.timestamp : room.lastMessageTime;

  return (
    <motion.button
      initial={{ opacity: 0, x: lang === 'ar' ? 10 : -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onSelect(room.id, matchMsg?.id)}
      data-testid={`room-item-${room.id}`}
      className={`w-full flex items-start gap-3 px-3 py-3 transition-colors duration-150 text-start border-b border-border/40 ${isSelected ? 'bg-secondary/10 border-s-2 border-s-secondary' : 'hover:bg-muted/40'}`}
    >
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${subject ? '' : avatarColors[index % avatarColors.length]}`}
        style={subject ? { backgroundColor: subject.color } : undefined}
      >
        {displayName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-secondary' : 'text-foreground'}`}>
            {displayName}
          </p>
          {hasActivity && <span className="text-xs text-muted-foreground flex-shrink-0">{formatRelativeTime(time, lang)}</span>}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {preview || (lang === 'ar' ? 'لا رسائل بعد' : 'No messages yet')}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {room.activeTaskCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium">{room.activeTaskCount}</span>
          )}
          {overdueCount > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md font-medium">!</span>
          )}
          {room.unreadCount > 0 && (
            <span className="ms-auto text-xs bg-secondary text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium">{room.unreadCount}</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

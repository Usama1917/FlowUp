import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { users, rooms, tasks, messages, auditLogs, departments, subjects, buildAssignmentRooms, buildFeedRooms, buildSupervisorMergeRooms } from '@/data/mockData';
import type { User, UserRole, Room, Task, TaskStatus, Message, AuditLog, Department, MessageType, Subject } from '@/data/mockData';
import type { Lang } from '@/i18n/translations';

interface AppContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dir: 'rtl' | 'ltr';
  isDark: boolean;
  setIsDark: (v: boolean) => void;
  currentUser: User;
  setCurrentUserId: (id: string) => void;
  currentRole: UserRole;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  // In-chat search: the active term to highlight/navigate inside the open room,
  // and the specific message to jump to when a search result is opened.
  chatSearch: string;
  setChatSearch: (s: string) => void;
  jumpMessageId: string | null;
  setJumpMessageId: (id: string | null) => void;
  // Scientific-supervisor room grouping: 'subject' (one chat per subject×designer)
  // or 'designer' (one merged chat per designer, must pick a subject before sending).
  sciViewMode: 'subject' | 'designer';
  setSciViewMode: (m: 'subject' | 'designer') => void;

  // Data
  allUsers: User[];
  allRooms: Room[];
  allTasks: Task[];
  allMessages: Message[];
  allAuditLogs: AuditLog[];
  allDepartments: Department[];
  allSubjects: Subject[];

  // Mutations
  sendMessage: (roomId: string, text: string, textEn: string, type?: MessageType, taskId?: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  addTask: (task: Task) => void;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
  addSubject: (subject: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  addUser: (user: Omit<User, 'id'>) => string;
  updateUser: (id: string, updates: Partial<User>) => void;
  setUserRooms: (userId: string, roomIds: string[]) => void;
  setDesignerSubjects: (designerId: string, subjectIds: string[]) => void;
  startDirectChat: (otherUserId: string) => string;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('flowup_lang') as Lang) || 'ar');
  const [isDark, setIsDarkState] = useState<boolean>(() => localStorage.getItem('flowup_dark') === 'true');
  const [currentUserId, setCurrentUserIdState] = useState<string>(() => localStorage.getItem('flowup_user') || 'u4');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>('r1');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState<string>('');
  const [jumpMessageId, setJumpMessageId] = useState<string | null>(null);
  const [sciViewMode, setSciViewMode] = useState<'subject' | 'designer'>('subject');

  const [allUsers, setAllUsers] = useState<User[]>(users);
  const [baseRooms, setBaseRooms] = useState<Room[]>(rooms);
  const [allMessages, setAllMessages] = useState<Message[]>(messages);
  const [allTasks, setAllTasks] = useState<Task[]>(tasks);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLog[]>(auditLogs);
  const [allDepartments, setAllDepartments] = useState<Department[]>(departments);
  const [allSubjects, setAllSubjects] = useState<Subject[]>(subjects);

  const currentUser = allUsers.find(u => u.id === currentUserId) || allUsers[3];

  // Subject-assignment chats (designer × subject) are derived live; base rooms hold groups/direct chats.
  // Feed rooms (one read-only aggregate per designer) come FIRST so they pin to the top.
  const feedRooms = useMemo(() => buildFeedRooms(allUsers), [allUsers]);
  const assignmentRooms = useMemo(() => buildAssignmentRooms(allSubjects, allUsers), [allSubjects, allUsers]);
  // Merged "by designer" rooms for the current scientific supervisor (one per designer).
  const supervisorMergeRooms = useMemo(() => buildSupervisorMergeRooms(currentUser, allSubjects, allUsers), [currentUser, allSubjects, allUsers]);
  const allRooms = useMemo(() => [...feedRooms, ...assignmentRooms, ...supervisorMergeRooms, ...baseRooms], [feedRooms, assignmentRooms, supervisorMergeRooms, baseRooms]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('flowup_lang', l);
  }, []);

  const setIsDark = useCallback((v: boolean) => {
    setIsDarkState(v);
    localStorage.setItem('flowup_dark', String(v));
  }, []);

  const setCurrentUserId = useCallback((id: string) => {
    setCurrentUserIdState(id);
    localStorage.setItem('flowup_user', id);
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const sendMessage = useCallback((roomId: string, text: string, textEn: string, type: MessageType = 'text', taskId?: string) => {
    const msg: Message = {
      id: `m_${Date.now()}`,
      roomId,
      senderId: currentUserId,
      type,
      text,
      textEn,
      taskId,
      timestamp: new Date(),
      isRead: true,
    };
    setAllMessages(prev => [...prev, msg]);
  }, [currentUserId]);

  const updateTaskStatus = useCallback((taskId: string, status: TaskStatus) => {
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, lastActivity: new Date() } : t));
  }, []);

  const addTask = useCallback((task: Task) => {
    setAllTasks(prev => [...prev, task]);
  }, []);

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id'>) => {
    setAllAuditLogs(prev => [{ ...log, id: `al_${Date.now()}` }, ...prev]);
  }, []);

  const addDepartment = useCallback((dept: Omit<Department, 'id'>) => {
    setAllDepartments(prev => [...prev, { ...dept, id: `d_${Date.now()}` }]);
  }, []);

  const updateDepartment = useCallback((id: string, updates: Partial<Department>) => {
    setAllDepartments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const addSubject = useCallback((subject: Omit<Subject, 'id'>) => {
    setAllSubjects(prev => [...prev, { ...subject, id: `s_${Date.now()}` }]);
  }, []);

  const updateSubject = useCallback((id: string, updates: Partial<Subject>) => {
    setAllSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const id = `u_${Date.now()}`;
    setAllUsers(prev => [...prev, { ...user, id }]);
    return id;
  }, []);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  // Set exactly which group rooms a user belongs to — syncs every base room's participant list.
  const setUserRooms = useCallback((userId: string, roomIds: string[]) => {
    setBaseRooms(prev => prev.map(r => {
      const shouldBeIn = roomIds.includes(r.id);
      const isIn = r.participantIds.includes(userId);
      if (shouldBeIn && !isIn) return { ...r, participantIds: [...r.participantIds, userId] };
      if (!shouldBeIn && isIn) return { ...r, participantIds: r.participantIds.filter(id => id !== userId) };
      return r;
    }));
  }, []);

  // Assign exactly which subjects a designer is responsible for — drives their subject chats.
  const setDesignerSubjects = useCallback((designerId: string, subjectIds: string[]) => {
    setAllSubjects(prev => prev.map(s => {
      const shouldHave = subjectIds.includes(s.id);
      const has = s.designerIds.includes(designerId);
      if (shouldHave && !has) return { ...s, designerIds: [...s.designerIds, designerId] };
      if (!shouldHave && has) return { ...s, designerIds: s.designerIds.filter(id => id !== designerId) };
      return s;
    }));
  }, []);

  // Start (or reuse) a private 1-1 chat between the current user and someone else.
  const startDirectChat = useCallback((otherUserId: string) => {
    const existing = baseRooms.find(r => r.type === 'direct' && r.participantIds.length === 2 && r.participantIds.includes(currentUserId) && r.participantIds.includes(otherUserId));
    if (existing) return existing.id;
    const other = allUsers.find(u => u.id === otherUserId);
    const id = `dm_${Date.now()}`;
    setBaseRooms(prev => [...prev, {
      id,
      name: other ? other.name : 'محادثة',
      nameEn: other ? other.nameEn : 'Chat',
      departmentId: other ? other.department : 'd1',
      type: 'direct',
      participantIds: [currentUserId, otherUserId],
      lastMessage: '',
      lastMessageEn: '',
      lastMessageTime: new Date(),
      unreadCount: 0,
      activeTaskCount: 0,
      isActive: true,
    }]);
    return id;
  }, [baseRooms, allUsers, currentUserId]);

  return (
    <AppContext.Provider value={{
      lang,
      setLang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      isDark,
      setIsDark,
      currentUser,
      setCurrentUserId,
      currentRole: currentUser.role,
      selectedRoomId,
      setSelectedRoomId,
      selectedTaskId,
      setSelectedTaskId,
      chatSearch,
      setChatSearch,
      jumpMessageId,
      setJumpMessageId,
      sciViewMode,
      setSciViewMode,
      allUsers,
      allRooms,
      allTasks,
      allMessages,
      allAuditLogs,
      allDepartments,
      allSubjects,
      sendMessage,
      updateTaskStatus,
      addTask,
      addAuditLog,
      addDepartment,
      updateDepartment,
      addSubject,
      updateSubject,
      addUser,
      updateUser,
      setUserRooms,
      setDesignerSubjects,
      startDirectChat,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

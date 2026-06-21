import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { users, rooms, tasks, messages, auditLogs, departments } from '@/data/mockData';
import type { User, UserRole, Room, Task, TaskStatus, Message, AuditLog, Department, MessageType } from '@/data/mockData';
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

  // Data
  allUsers: User[];
  allRooms: Room[];
  allTasks: Task[];
  allMessages: Message[];
  allAuditLogs: AuditLog[];
  allDepartments: Department[];

  // Mutations
  sendMessage: (roomId: string, text: string, textEn: string, type?: MessageType, taskId?: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  addTask: (task: Task) => void;
  addAuditLog: (log: Omit<AuditLog, 'id'>) => void;
  addDepartment: (dept: Omit<Department, 'id'>) => void;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem('flowup_lang') as Lang) || 'ar');
  const [isDark, setIsDarkState] = useState<boolean>(() => localStorage.getItem('flowup_dark') === 'true');
  const [currentUserId, setCurrentUserIdState] = useState<string>(() => localStorage.getItem('flowup_user') || 'u4');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>('r1');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('t1');

  const [allMessages, setAllMessages] = useState<Message[]>(messages);
  const [allTasks, setAllTasks] = useState<Task[]>(tasks);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLog[]>(auditLogs);
  const [allDepartments, setAllDepartments] = useState<Department[]>(departments);

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

  const currentUser = users.find(u => u.id === currentUserId) || users[3];

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
      allUsers: users,
      allRooms: rooms,
      allTasks,
      allMessages,
      allAuditLogs,
      allDepartments,
      sendMessage,
      updateTaskStatus,
      addTask,
      addAuditLog,
      addDepartment,
      updateDepartment,
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

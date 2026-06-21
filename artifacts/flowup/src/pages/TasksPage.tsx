import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Search, Calendar, User, Hash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { TaskDetailsPanel } from '@/components/tasks/TaskDetailsPanel';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import type { TaskStatus } from '@/data/mockData';

const ALL_STATUSES: TaskStatus[] = ['sent', 'received', 'in_progress', 'submitted', 'needs_revision', 'approved', 'closed', 'overdue'];

export function TasksPage() {
  const { lang, allTasks, allUsers, allRooms, currentRole, currentUser, selectedTaskId, setSelectedTaskId } = useApp();
  const tr = getTranslations(lang);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterDesigner, setFilterDesigner] = useState<string>('all');
  const [showMyTasks, setShowMyTasks] = useState(false);

  const designers = allUsers.filter(u => u.role === 'designer');

  const filteredTasks = allTasks.filter(task => {
    const title = lang === 'ar' ? task.title : task.titleEn;
    const matchSearch = !search || title.toLowerCase().includes(search.toLowerCase()) || task.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchDesigner = filterDesigner === 'all' || task.designerId === filterDesigner;
    const matchMine = !showMyTasks || task.designerId === currentUser.id || task.senderId === currentUser.id;
    return matchSearch && matchStatus && matchDesigner && matchMine;
  });

  const priorityColors: Record<string, string> = {
    low: 'text-green-600',
    normal: 'text-blue-600',
    high: 'text-amber-600',
    urgent: 'text-red-600',
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Tasks list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-4 pb-3 border-b border-border bg-card/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckSquare size={16} className="text-primary" />
              </div>
              <h1 className="text-base font-bold text-foreground">{tr.navTasks}</h1>
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{filteredTasks.length}</span>
            </div>
            {currentRole === 'designer' && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowMyTasks(!showMyTasks)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${showMyTasks ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {tr.myTasks}
              </motion.button>
            )}
          </div>

          {/* Search and filters */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`${tr.search}...`}
                className="ps-9 h-8 text-sm bg-muted/50 border-0 rounded-xl"
                data-testid="task-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as TaskStatus | 'all')}
                className="text-xs bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                data-testid="filter-status"
              >
                <option value="all">{tr.filterByStatus}: {tr.all}</option>
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{tr[`status${s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}` as 'statusSent']}</option>
                ))}
              </select>
              {currentRole !== 'designer' && (
                <select
                  value={filterDesigner}
                  onChange={e => setFilterDesigner(e.target.value)}
                  className="text-xs bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="filter-designer"
                >
                  <option value="all">{tr.filterByDesigner}: {tr.all}</option>
                  {designers.map(d => (
                    <option key={d.id} value={d.id}>{lang === 'ar' ? d.name : d.nameEn}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-3xl bg-muted flex items-center justify-center mb-3">
                <CheckSquare size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">{tr.noTasks}</p>
              <p className="text-xs text-muted-foreground mt-1">{tr.noTasksDesc}</p>
            </div>
          ) : (
            filteredTasks.map((task, idx) => {
              const designer = allUsers.find(u => u.id === task.designerId);
              const room = allRooms.find(r => r.id === task.roomId);
              const isSelected = selectedTaskId === task.id;
              const isOverdue = task.deadline < new Date() && !['approved', 'closed'].includes(task.status);

              return (
                <motion.button
                  key={task.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ y: -1 }}
                  onClick={() => setSelectedTaskId(task.id)}
                  data-testid={`task-row-${task.id}`}
                  className={`w-full text-start bg-card border rounded-2xl p-4 transition-all duration-200 ${isSelected ? 'border-secondary shadow-md' : 'border-border hover:border-border/80 hover:shadow-sm'} ${isOverdue ? 'border-s-4 border-s-red-400' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold text-primary ltr-value">{task.code}</span>
                      <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
                        {tr[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` as 'priorityLow']}
                      </span>
                    </div>
                    <StatusBadge status={isOverdue && task.status !== 'approved' && task.status !== 'closed' ? 'overdue' : task.status} size="sm" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">{lang === 'ar' ? task.title : task.titleEn}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <User size={11} />
                      {lang === 'ar' ? designer?.name : designer?.nameEn}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      <span className={`ltr-value ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                        {task.deadline.toLocaleDateString('en-GB')}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash size={11} />
                      {lang === 'ar' ? room?.name : room?.nameEn}
                    </span>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Task details */}
      {selectedTaskId && (
        <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0 border-s border-border overflow-hidden">
          <TaskDetailsPanel onClose={() => setSelectedTaskId(null)} />
        </div>
      )}
    </div>
  );
}

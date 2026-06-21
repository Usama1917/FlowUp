import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2, Clock, AlertCircle, RotateCcw, MessageSquare, TrendingUp, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.35 } }),
};

export function DashboardPage() {
  const { lang, allTasks, allMessages, allUsers, allRooms, allAuditLogs, currentRole, currentUser } = useApp();
  const tr = getTranslations(lang);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayMessages = allMessages.filter(m => m.timestamp >= todayStart).length;

  const active = allTasks.filter(t => !['approved', 'closed'].includes(t.status));
  const overdueCount = active.filter(t => t.deadline < now).length;
  const submittedCount = allTasks.filter(t => t.status === 'submitted').length;
  const needsRevisionCount = allTasks.filter(t => t.status === 'needs_revision').length;
  const approvedCount = allTasks.filter(t => t.status === 'approved').length;

  const designers = allUsers.filter(u => u.role === 'designer');
  const workloadData = designers.map(d => ({
    name: lang === 'ar' ? d.name.split(' ')[0] : d.nameEn.split(' ')[0],
    tasks: allTasks.filter(t => t.designerId === d.id && !['approved', 'closed'].includes(t.status)).length,
  }));

  const recentLogs = allAuditLogs.slice(0, 6);

  const activeRooms = allRooms.map(r => ({
    room: r,
    msgCount: allMessages.filter(m => m.roomId === r.id).length,
  })).sort((a, b) => b.msgCount - a.msgCount).slice(0, 4);

  const tasksNeedingAction = allTasks.filter(t => t.status === 'submitted' || (t.status !== 'approved' && t.status !== 'closed' && t.deadline < now));

  const statsCards = [
    { icon: Zap, label: tr.totalActiveTasks, value: active.length, color: 'bg-primary/10 text-primary', border: 'border-primary/20' },
    { icon: AlertCircle, label: tr.overdueCount, value: overdueCount, color: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
    { icon: Clock, label: tr.pendingReview, value: submittedCount, color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    { icon: RotateCcw, label: tr.needsRevision, value: needsRevisionCount, color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
    { icon: CheckCircle2, label: tr.approvedCount, value: approvedCount, color: 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    { icon: MessageSquare, label: tr.todayMessages, value: todayMessages, color: 'bg-secondary/10 text-secondary', border: 'border-secondary/20' },
  ];

  const barColors = ['hsl(195 85% 42%)', 'hsl(262 72% 58%)', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)'];

  return (
    <div className="h-full overflow-y-auto scrollbar-none p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
          <BarChart3 size={16} className="text-secondary" />
        </div>
        <h1 className="text-base font-bold text-foreground">{tr.navDashboard}</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statsCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className={`bg-card border ${card.border} rounded-2xl p-4 cursor-default`}
            >
              <div className={`w-8 h-8 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                <Icon size={15} />
              </div>
              <p className="text-2xl font-bold text-foreground mb-0.5">{card.value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Workload chart */}
        {(currentRole !== 'designer') && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">{tr.workloadPerDesigner}</h2>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={workloadData} barCategoryGap="30%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={20} />
                <RechartsTooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                  cursor={{ fill: 'hsl(var(--muted))', radius: 6 }}
                />
                <Bar dataKey="tasks" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {workloadData.map((_, idx) => (
                    <Cell key={idx} fill={barColors[idx % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Most active rooms */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">{tr.mostActiveRooms}</h2>
          <div className="space-y-3">
            {activeRooms.map(({ room, msgCount }, idx) => (
              <div key={room.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-foreground truncate">{lang === 'ar' ? room.name : room.nameEn}</p>
                    <span className="text-xs text-muted-foreground ms-2">{msgCount}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(msgCount / (activeRooms[0]?.msgCount || 1)) * 100}%` }}
                      transition={{ delay: 0.5 + idx * 0.1, duration: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">{tr.recentActivity}</h2>
          <div className="space-y-3">
            {recentLogs.map(log => {
              const user = allUsers.find(u => u.id === log.userId);
              return (
                <div key={log.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0 mt-0.5" style={{ fontSize: '9px', fontWeight: 600 }}>
                    {user?.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground leading-snug">{lang === 'ar' ? log.details : log.detailsEn}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{log.timestamp.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded-lg text-muted-foreground flex-shrink-0">{lang === 'ar' ? log.action : log.actionEn}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Tasks needing action */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">{tr.tasksNeedingAction}</h2>
          {tasksNeedingAction.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 size={16} />
              <p className="text-sm">{lang === 'ar' ? 'لا توجد مهام تحتاج تدخل' : 'No tasks need attention'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasksNeedingAction.slice(0, 5).map(task => {
                const designer = allUsers.find(u => u.id === task.designerId);
                return (
                  <div key={task.id} className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-xl">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.deadline < now ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{lang === 'ar' ? task.title : task.titleEn}</p>
                      <p className="text-xs text-muted-foreground ltr-value">{task.code} · {lang === 'ar' ? designer?.name : designer?.nameEn}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { formatTime12 } from '@/data/mockData';

const ACTION_TYPES_AR = ['إرسال مهمة', 'تغيير حالة', 'تسليم عمل', 'طلب تعديل', 'اعتماد', 'إنشاء قسم', 'إضافة عضو', 'تعديل صلاحيات'];
const ACTION_TYPES_EN = ['Task Sent', 'Status Changed', 'Work Submitted', 'Revision Requested', 'Approved', 'Department Created', 'Member Added', 'Permissions Updated'];

export function AuditLogPage() {
  const { lang, allAuditLogs, allUsers, allDepartments } = useApp();
  const tr = getTranslations(lang);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLogs = allAuditLogs.filter(log => {
    const user = allUsers.find(u => u.id === log.userId);
    const detail = lang === 'ar' ? log.details : log.detailsEn;
    const matchSearch = !search || detail.toLowerCase().includes(search.toLowerCase()) || (log.taskId || '').includes(search);
    const matchUser = filterUser === 'all' || log.userId === filterUser;
    const matchDept = filterDept === 'all' || log.departmentId === filterDept;
    const matchAction = filterAction === 'all' || log.action === filterAction || log.actionEn === filterAction;
    return matchSearch && matchUser && matchDept && matchAction;
  });

  const actionTypes = lang === 'ar' ? ACTION_TYPES_AR : ACTION_TYPES_EN;

  const actionBadgeColor: Record<string, string> = {
    'إرسال مهمة': 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    'Task Sent': 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    'تغيير حالة': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    'Status Changed': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    'تسليم عمل': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    'Work Submitted': 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    'طلب تعديل': 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    'Revision Requested': 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    'اعتماد': 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
    'Approved': 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  };

  const avatarColors = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-4 pb-3 border-b border-border bg-card/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <ClipboardList size={16} className="text-amber-500" />
          </div>
          <h1 className="text-base font-bold text-foreground">{tr.auditLog}</h1>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{filteredLogs.length}</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`${tr.search}...`}
              className="ps-8 h-8 text-xs bg-muted/50 border-0 rounded-xl"
              data-testid="audit-search"
            />
          </div>
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="text-xs bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none"
            data-testid="audit-filter-user"
          >
            <option value="all">{tr.filterByUser}: {tr.all}</option>
            {allUsers.map(u => <option key={u.id} value={u.id}>{lang === 'ar' ? u.name : u.nameEn}</option>)}
          </select>
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="text-xs bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none"
          >
            <option value="all">{tr.filterByDept}: {tr.all}</option>
            {allDepartments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name : d.nameEn}</option>)}
          </select>
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="text-xs bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none"
          >
            <option value="all">{tr.filterByAction}: {tr.all}</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-4">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-3xl bg-muted flex items-center justify-center mb-3">
              <ClipboardList size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">{tr.noAuditLogs}</p>
            <p className="text-xs text-muted-foreground mt-1">{tr.noAuditLogsDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log, idx) => {
              const user = allUsers.find(u => u.id === log.userId);
              const dept = allDepartments.find(d => d.id === log.departmentId);
              const userIdx = allUsers.findIndex(u => u.id === log.userId);
              const actionLabel = lang === 'ar' ? log.action : log.actionEn;
              const badgeClass = actionBadgeColor[actionLabel] || 'bg-muted text-muted-foreground';

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-card border border-border rounded-2xl p-4 hover:border-border/60 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[userIdx % avatarColors.length]}`}>
                      {user?.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground">{lang === 'ar' ? user?.name : user?.nameEn}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>{actionLabel}</span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ltr-value">
                          {log.timestamp.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} {formatTime12(log.timestamp, lang)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground mb-1.5">{lang === 'ar' ? log.details : log.detailsEn}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {dept && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">{lang === 'ar' ? dept.name : dept.nameEn}</span>
                        )}
                        {log.taskId && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg ltr-value font-mono">{log.taskId}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

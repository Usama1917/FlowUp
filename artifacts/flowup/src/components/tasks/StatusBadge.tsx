import type { TaskStatus } from '@/data/mockData';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';

interface StatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  sent:           { bg: 'bg-blue-100 dark:bg-blue-950/50',    text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
  received:       { bg: 'bg-indigo-100 dark:bg-indigo-950/50', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
  in_progress:    { bg: 'bg-cyan-100 dark:bg-cyan-950/50',    text: 'text-cyan-700 dark:text-cyan-300',   dot: 'bg-cyan-500' },
  submitted:      { bg: 'bg-amber-100 dark:bg-amber-950/50',  text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  needs_revision: { bg: 'bg-rose-100 dark:bg-rose-950/50',    text: 'text-rose-700 dark:text-rose-300',   dot: 'bg-rose-500' },
  approved:       { bg: 'bg-green-100 dark:bg-green-950/50',  text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  closed:         { bg: 'bg-gray-100 dark:bg-gray-800/50',    text: 'text-gray-600 dark:text-gray-400',   dot: 'bg-gray-400' },
  overdue:        { bg: 'bg-red-100 dark:bg-red-950/50',      text: 'text-red-700 dark:text-red-300',     dot: 'bg-red-500' },
};

const statusKeyMap: Record<TaskStatus, 'statusSent' | 'statusReceived' | 'statusInProgress' | 'statusSubmitted' | 'statusNeedsRevision' | 'statusApproved' | 'statusClosed' | 'statusOverdue'> = {
  sent: 'statusSent',
  received: 'statusReceived',
  in_progress: 'statusInProgress',
  submitted: 'statusSubmitted',
  needs_revision: 'statusNeedsRevision',
  approved: 'statusApproved',
  closed: 'statusClosed',
  overdue: 'statusOverdue',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { lang } = useApp();
  const tr = getTranslations(lang);
  const cfg = statusConfig[status];
  const label = tr[statusKeyMap[status]];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-colors duration-300 ${cfg.bg} ${cfg.text} ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {label}
    </span>
  );
}

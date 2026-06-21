import { motion } from 'framer-motion';
import { CheckCheck, AlertCircle, ThumbsUp, RotateCcw } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import type { Message } from '@/data/mockData';

interface MessageItemProps {
  message: Message;
  onTaskClick?: (taskId: string) => void;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

const avatarColors = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];

export function MessageItem({ message, onTaskClick }: MessageItemProps) {
  const { lang, currentUser, allUsers, allTasks } = useApp();
  const tr = getTranslations(lang);

  const sender = allUsers.find(u => u.id === message.senderId);
  const task = message.taskId ? allTasks.find(t => t.id === message.taskId) : null;
  const isMe = message.senderId === currentUser.id;
  const senderIndex = allUsers.findIndex(u => u.id === message.senderId);

  // System messages
  if (message.type === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center my-2"
      >
        <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full border border-border/50">
          {lang === 'ar' ? message.text : message.textEn}
        </span>
      </motion.div>
    );
  }

  // Approval message
  if (message.type === 'approval') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-3"
      >
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-2 rounded-2xl text-sm font-medium">
          <ThumbsUp size={14} />
          <span>{lang === 'ar' ? message.text : message.textEn}</span>
        </div>
      </motion.div>
    );
  }

  // Task card message
  if (message.type === 'task_card' && task) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`flex my-2 ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        <div className="max-w-xs">
          <button
            onClick={() => onTaskClick?.(task.id)}
            data-testid={`task-card-${task.id}`}
            className="w-full bg-card border-2 border-primary/20 rounded-2xl p-3 shadow-sm hover:border-primary/50 hover:shadow-md transition-all duration-200 text-start"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-primary ltr-value">{task.code}</span>
              <StatusBadge status={task.status} size="sm" />
            </div>
            <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
              {lang === 'ar' ? task.title : task.titleEn}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{task.project}</span>
              <span className="ltr-value">{task.deadline.toLocaleDateString('en-GB')}</span>
            </div>
          </button>
        </div>
      </motion.div>
    );
  }

  // Submission message
  if (message.type === 'submission') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2 my-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {!isMe && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[senderIndex % avatarColors.length]}`}>
            {sender?.avatar}
          </div>
        )}
        <div>
          {!isMe && (
            <p className="text-xs text-muted-foreground mb-1 px-1">{lang === 'ar' ? sender?.name : sender?.nameEn}</p>
          )}
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-2xl text-sm">
            <CheckCheck size={14} />
            <span>{lang === 'ar' ? message.text : message.textEn}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 px-1">{formatTime(message.timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  // Revision message
  if (message.type === 'revision') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2 my-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {!isMe && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[senderIndex % avatarColors.length]}`}>
            {sender?.avatar}
          </div>
        )}
        <div>
          {!isMe && (
            <p className="text-xs text-muted-foreground mb-1 px-1">{lang === 'ar' ? sender?.name : sender?.nameEn}</p>
          )}
          <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-2xl text-sm max-w-xs">
            <RotateCcw size={14} className="flex-shrink-0 mt-0.5" />
            <span>{lang === 'ar' ? message.text : message.textEn}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 px-1">{formatTime(message.timestamp)}</p>
        </div>
      </motion.div>
    );
  }

  // Normal text message
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 my-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isMe && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[senderIndex % avatarColors.length]}`}>
          {sender?.avatar}
        </div>
      )}
      <div className={`max-w-xs sm:max-w-sm ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMe && (
          <p className="text-xs text-muted-foreground mb-1 px-1">{lang === 'ar' ? sender?.name : sender?.nameEn}</p>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
            isMe
              ? 'bg-primary text-primary-foreground rounded-ee-sm'
              : 'bg-card border border-border text-foreground rounded-es-sm'
          }`}
        >
          {lang === 'ar' ? message.text : message.textEn}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 px-1">{formatTime(message.timestamp)}</p>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { Check, CheckCheck, Clock, ThumbsUp, RotateCcw } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { formatTime12 } from '@/data/mockData';
import { highlightText } from '@/lib/highlight';
import type { Message, MessageStatus } from '@/data/mockData';
import type { Lang } from '@/i18n/translations';

// WhatsApp/Telegram-style delivery ticks, shown only on your own outgoing messages.
function MessageTicks({ status, lang }: { status: MessageStatus; lang: Lang }) {
  const tr = getTranslations(lang);
  const label =
    status === 'sending' ? tr.msgSending
    : status === 'sent' ? tr.msgSent
    : status === 'delivered' ? tr.msgDelivered
    : tr.msgRead;
  const Icon = status === 'sending' ? Clock : status === 'sent' ? Check : CheckCheck;
  const color = status === 'read' ? 'text-sky-500' : 'text-muted-foreground/70';
  return (
    <span title={label} aria-label={label} className={`inline-flex items-center ${color}`}>
      <Icon size={status === 'sending' ? 12 : 14} strokeWidth={2.5} />
    </span>
  );
}

// Time + (for own messages) delivery ticks — shown under text/submission/revision bubbles.
function MessageMeta({ message, isMe, lang }: { message: Message; isMe: boolean; lang: Lang }) {
  const status: MessageStatus = message.deliveryStatus ?? (message.isRead ? 'read' : 'delivered');
  return (
    <div className="flex items-center gap-1 mt-0.5 px-1">
      <span className="text-xs text-muted-foreground">{formatTime12(message.timestamp, lang)}</span>
      {isMe && <MessageTicks status={status} lang={lang} />}
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  onTaskClick?: (taskId: string) => void;
  highlight?: string; // active in-chat search term — matched substrings get marked
}

// hex (#rrggbb) → rgba string. Exported so the feed/merge view can tint the row
// background behind each message by its subject color (the bubble itself stays default).
export function tint(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const avatarColors = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];

export function MessageItem({ message, onTaskClick, highlight }: MessageItemProps) {
  const { lang, currentUser, allUsers, allTasks } = useApp();
  const body = highlightText(lang === 'ar' ? message.text : message.textEn, highlight);

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
        <span dir="auto" className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full border border-border/50">
          {body}
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
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
          <ThumbsUp size={14} />
          <span dir="auto">{body}</span>
        </div>
      </motion.div>
    );
  }

  // Task card message — always sent-right / received-left (dir forced ltr for physical side)
  if (message.type === 'task_card' && task) {
    return (
      <motion.div
        dir="ltr"
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`flex my-2 ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        <div className="max-w-xs">
          <button
            onClick={() => onTaskClick?.(task.id)}
            data-testid={`task-card-${task.id}`}
            className="w-full rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-200 text-start bg-card border-2 border-primary/20 hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs font-mono font-bold text-primary ltr-value">{task.code}</span>
              <StatusBadge status={task.status} size="sm" />
            </div>
            <p dir="auto" className="text-sm font-medium text-foreground line-clamp-2 mb-2">
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
        dir="ltr"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2 my-1 ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        {!isMe && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[senderIndex % avatarColors.length]}`}>
            {sender?.avatar}
          </div>
        )}
        <div className={isMe ? 'items-end flex flex-col' : 'items-start flex flex-col'}>
          {!isMe && (
            <p dir="auto" className="text-xs text-muted-foreground mb-1 px-1">{lang === 'ar' ? sender?.name : sender?.nameEn}</p>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
            <CheckCheck size={14} />
            <span dir="auto">{body}</span>
          </div>
          <MessageMeta message={message} isMe={isMe} lang={lang} />
        </div>
      </motion.div>
    );
  }

  // Revision message
  if (message.type === 'revision') {
    return (
      <motion.div
        dir="ltr"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2 my-1 ${isMe ? 'justify-end' : 'justify-start'}`}
      >
        {!isMe && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[senderIndex % avatarColors.length]}`}>
            {sender?.avatar}
          </div>
        )}
        <div className={isMe ? 'items-end flex flex-col' : 'items-start flex flex-col'}>
          {!isMe && (
            <p dir="auto" className="text-xs text-muted-foreground mb-1 px-1">{lang === 'ar' ? sender?.name : sender?.nameEn}</p>
          )}
          <div className="flex items-start gap-2 px-3 py-2 rounded-2xl text-sm max-w-xs bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
            <RotateCcw size={14} className="flex-shrink-0 mt-0.5" />
            <span dir="auto">{body}</span>
          </div>
          <MessageMeta message={message} isMe={isMe} lang={lang} />
        </div>
      </motion.div>
    );
  }

  // Normal text message
  return (
    <motion.div
      dir="ltr"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 my-1 ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      {!isMe && (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[senderIndex % avatarColors.length]}`}>
          {sender?.avatar}
        </div>
      )}
      <div className={`max-w-xs sm:max-w-sm ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isMe && (
          <p dir="auto" className="text-xs text-muted-foreground mb-1 px-1">{lang === 'ar' ? sender?.name : sender?.nameEn}</p>
        )}
        <div
          dir="auto"
          className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} ${
            isMe ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground'
          }`}
        >
          {body}
        </div>
        <MessageMeta message={message} isMe={isMe} lang={lang} />
      </div>
    </motion.div>
  );
}

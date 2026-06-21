import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Paperclip, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/data/mockData';

interface RevisionModalProps {
  task: Task;
  onClose: () => void;
}

export function RevisionModal({ task, onClose }: RevisionModalProps) {
  const { lang, currentUser, updateTaskStatus, sendMessage, addAuditLog, allTasks, setSelectedTaskId } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [mockFile, setMockFile] = useState<string | null>(null);

  const handleSend = () => {
    if (!note.trim()) return;
    updateTaskStatus(task.id, 'needs_revision');
    sendMessage(task.roomId, note, note, 'revision', task.id);
    addAuditLog({
      action: lang === 'ar' ? 'طلب تعديل' : 'Revision Requested',
      actionEn: 'Revision Requested',
      userId: currentUser.id,
      departmentId: task.departmentId,
      roomId: task.roomId,
      taskId: task.id,
      timestamp: new Date(),
      details: `${task.code}: ${note}`,
      detailsEn: `${task.code}: ${note}`,
    });
    toast({ title: tr.revisionRequestedSuccess });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 rounded-t-2xl">
          <h2 className="text-base font-semibold text-rose-700 dark:text-rose-300">{tr.requestRevisionTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors">
            <X size={16} className="text-rose-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Task info */}
          <div className="bg-muted/50 rounded-xl px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5 ltr-value">{task.code}</p>
            <p className="text-sm font-medium text-foreground">{lang === 'ar' ? task.title : task.titleEn}</p>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">{tr.revisionNote} <span className="text-rose-500">*</span></label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={tr.revisionNotePlaceholder}
              className="text-sm resize-none h-28 border-rose-200 dark:border-rose-800 focus:ring-rose-400"
              data-testid="revision-note"
            />
          </div>

          {/* Optional file */}
          <div>
            {mockFile ? (
              <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-3 py-2">
                <FileText size={14} className="text-rose-500" />
                <span className="text-xs font-medium text-foreground flex-1 truncate ltr-value">{mockFile}</span>
                <button onClick={() => setMockFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMockFile(`revision-notes-${task.code.toLowerCase()}.pdf`)}
                className="w-full flex items-center gap-2 border border-dashed border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors duration-150 text-sm"
              >
                <Paperclip size={14} />
                {tr.uploadMockFile}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1" size="sm">{tr.cancel}</Button>
          <Button
            onClick={handleSend}
            disabled={!note.trim()}
            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
            size="sm"
            data-testid="send-revision-btn"
          >
            {tr.sendRevisionAction}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

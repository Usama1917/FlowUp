import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Paperclip, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/data/mockData';

interface SubmitWorkModalProps {
  task: Task;
  onClose: () => void;
}

export function SubmitWorkModal({ task, onClose }: SubmitWorkModalProps) {
  const { lang, currentUser, updateTaskStatus, sendMessage, addAuditLog, allTasks } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [mockFile, setMockFile] = useState<string | null>(null);
  const version = task.revisionCount + 1;

  const handleSubmit = () => {
    updateTaskStatus(task.id, 'submitted');
    const submissionText = lang === 'ar'
      ? `تم رفع النسخة ${version} للمراجعة${note ? ` — ${note}` : ''}`
      : `Version ${version} submitted for review${note ? ` — ${note}` : ''}`;
    sendMessage(task.roomId, submissionText, submissionText, 'submission', task.id);
    addAuditLog({
      action: lang === 'ar' ? 'تسليم عمل' : 'Work Submitted',
      actionEn: 'Work Submitted',
      userId: currentUser.id,
      departmentId: task.departmentId,
      roomId: task.roomId,
      taskId: task.id,
      timestamp: new Date(),
      details: `${task.code}: ${lang === 'ar' ? 'تم رفع النسخة' : 'Version'} ${version}`,
      detailsEn: `${task.code}: Version ${version} submitted`,
    });
    toast({ title: tr.workSubmittedSuccess });
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{tr.submitWorkTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Version */}
          <div className="flex items-center justify-between bg-primary/8 border border-primary/20 rounded-xl px-3 py-2">
            <span className="text-xs text-muted-foreground">{tr.versionNumber}</span>
            <span className="text-sm font-bold text-primary">{tr.version}{version}</span>
          </div>

          {/* Task info */}
          <div className="bg-muted/50 rounded-xl px-3 py-2">
            <p className="text-xs text-muted-foreground mb-0.5 ltr-value">{task.code}</p>
            <p className="text-sm font-medium text-foreground">{lang === 'ar' ? task.title : task.titleEn}</p>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">{tr.submissionNote}</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={tr.submissionNotePlaceholder}
              className="text-sm resize-none h-24"
              data-testid="submit-note"
            />
          </div>

          {/* File attach */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">{tr.uploadMockFile}</label>
            {mockFile ? (
              <div className="flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-3 py-2">
                <FileText size={14} className="text-primary" />
                <span className="text-xs font-medium text-foreground flex-1 truncate ltr-value">{mockFile}</span>
                <button onClick={() => setMockFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMockFile(`${task.code.toLowerCase()}-v${version}.pdf`)}
                className="w-full flex items-center gap-2 border border-dashed border-border rounded-xl px-3 py-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors duration-150 text-sm"
                data-testid="attach-file"
              >
                <Paperclip size={14} />
                {tr.uploadMockFile}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1" size="sm">{tr.cancel}</Button>
          <Button onClick={handleSubmit} className="flex-1" size="sm" data-testid="submit-work-btn">
            {tr.submitAction}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

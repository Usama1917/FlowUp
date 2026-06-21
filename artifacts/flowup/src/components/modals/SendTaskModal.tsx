import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { mockTaskPreviews } from '@/data/mockData';
import type { Task } from '@/data/mockData';

interface SendTaskModalProps {
  roomId: string;
  onClose: () => void;
}

export function SendTaskModal({ roomId, onClose }: SendTaskModalProps) {
  const { lang, allUsers, currentUser, addTask, sendMessage, addAuditLog, allRooms, allDepartments } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [designerId, setDesignerId] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<typeof mockTaskPreviews[string] | null>(null);
  const [notFound, setNotFound] = useState(false);

  const designers = allUsers.filter(u => u.role === 'designer');
  const room = allRooms.find(r => r.id === roomId);
  const dept = allDepartments.find(d => d.id === room?.departmentId);

  const handleCodeBlur = () => {
    const p = mockTaskPreviews[code.trim().toUpperCase()];
    if (p) { setPreview(p); setNotFound(false); }
    else if (code.trim()) setNotFound(true);
    else { setPreview(null); setNotFound(false); }
  };

  const handleSend = () => {
    if (!code.trim() || !designerId) return;
    const newTask: Task = {
      id: `t_${Date.now()}`,
      code: code.trim().toUpperCase(),
      title: preview?.title || code.trim().toUpperCase(),
      titleEn: preview?.titleEn || code.trim().toUpperCase(),
      status: 'sent',
      erpStatus: preview?.erpStatus || 'Pending Assignment',
      deadline: preview?.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      senderId: currentUser.id,
      designerId,
      departmentId: room?.departmentId || 'd1',
      roomId,
      revisionCount: 0,
      lastActivity: new Date(),
      files: [],
      priority: (preview?.priority as Task['priority']) || 'normal',
      project: preview?.project || '',
    };
    addTask(newTask);
    sendMessage(roomId, note || tr.sendTask, note || tr.sendTask, 'task_card', newTask.id);
    addAuditLog({ action: tr.taskSentSuccess, actionEn: 'Task Sent', userId: currentUser.id, departmentId: room?.departmentId || 'd1', roomId, taskId: newTask.id, timestamp: new Date(), details: `${lang === 'ar' ? 'تم إرسال مهمة' : 'Task sent'} ${newTask.code}`, detailsEn: `Task ${newTask.code} sent` });
    toast({ title: tr.taskSentSuccess });
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
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">{tr.sendTaskTitle}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Task code */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">{tr.taskCodeLabel}</label>
            <div className="relative">
              <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={code}
                onChange={e => { setCode(e.target.value); setPreview(null); setNotFound(false); }}
                onBlur={handleCodeBlur}
                placeholder={tr.taskCodePlaceholder}
                className="ps-9 font-mono text-sm"
                data-testid="send-task-code"
              />
            </div>
            {notFound && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />{tr.taskNotFound}
              </p>
            )}
          </div>

          {/* Task preview */}
          <AnimatePresence>
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="bg-muted/50 border border-border rounded-xl p-3 space-y-2"
              >
                <p className="text-xs font-semibold text-muted-foreground">{tr.taskPreview}</p>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{lang === 'ar' ? preview.title : preview.titleEn}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${preview.priority === 'urgent' ? 'bg-red-100 text-red-600' : preview.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                    {preview.priority}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar size={11} /><span className="ltr-value">{preview.deadline.toLocaleDateString('en-GB')}</span></span>
                  <span className="bg-muted px-2 py-0.5 rounded text-foreground ltr-value">{preview.erpStatus}</span>
                </div>
                <p className="text-xs text-muted-foreground">{preview.project}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Designer select */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">{tr.selectDesigner}</label>
            <div className="grid grid-cols-1 gap-1.5">
              {designers.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDesignerId(d.id)}
                  data-testid={`select-designer-${d.id}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all duration-150 text-start ${designerId === d.id ? 'border-secondary bg-secondary/8 text-secondary' : 'border-border hover:bg-muted/60'}`}
                >
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-semibold">
                    {d.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{lang === 'ar' ? d.name : d.nameEn}</p>
                    <p className="text-xs text-muted-foreground ltr-value">{d.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">{tr.optionalMessage}</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={tr.optionalMessagePlaceholder}
              className="text-sm resize-none h-20"
              data-testid="send-task-note"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1" size="sm">{tr.cancel}</Button>
          <Button onClick={handleSend} disabled={!code.trim() || !designerId} className="flex-1" size="sm" data-testid="send-task-submit">
            {tr.sendTaskAction}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

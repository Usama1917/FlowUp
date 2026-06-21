import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Calendar, User, Hash, Building2, AlertCircle, CheckCircle2, RotateCcw, XCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { SendTaskModal } from '@/components/modals/SendTaskModal';
import { SubmitWorkModal } from '@/components/modals/SubmitWorkModal';
import { RevisionModal } from '@/components/modals/RevisionModal';

interface TaskDetailsPanelProps {
  onClose?: () => void;
}

const priorityColors: Record<string, string> = {
  low: 'text-green-600 bg-green-50 dark:bg-green-950/30',
  normal: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  high: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
  urgent: 'text-red-600 bg-red-50 dark:bg-red-950/30',
};

function daysRelative(date: Date, lang: string, tr: ReturnType<typeof getTranslations>) {
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return <span className="text-red-500">{Math.abs(diffDays)} {tr.daysOverdue}</span>;
  if (diffDays === 0) return <span className="text-amber-500">{lang === 'ar' ? 'اليوم' : 'Today'}</span>;
  return <span className="text-green-600">{diffDays} {tr.daysLeft}</span>;
}

export function TaskDetailsPanel({ onClose }: TaskDetailsPanelProps) {
  const { lang, selectedTaskId, allTasks, allUsers, allRooms, allDepartments, currentRole, sendMessage, updateTaskStatus, addAuditLog, currentUser } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  const task = selectedTaskId ? allTasks.find(t => t.id === selectedTaskId) : null;

  if (!task) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-full text-center p-6 bg-card border-s border-border"
      >
        <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
          <FileText size={28} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">{tr.noTaskSelected}</p>
        <p className="text-xs text-muted-foreground">{tr.noTaskSelectedDesc}</p>
      </motion.div>
    );
  }

  const designer = allUsers.find(u => u.id === task.designerId);
  const sender = allUsers.find(u => u.id === task.senderId);
  const room = allRooms.find(r => r.id === task.roomId);
  const dept = allDepartments.find(d => d.id === task.departmentId);

  const handleDesignerAction = (action: 'received' | 'in_progress' | 'submit') => {
    if (action === 'submit') { setShowSubmitModal(true); return; }
    const newStatus = action === 'received' ? 'received' : 'in_progress';
    updateTaskStatus(task.id, newStatus);
    const statusText = action === 'received' ? (lang === 'ar' ? 'تم الاستلام' : 'Received') : (lang === 'ar' ? 'بدأت العمل' : 'Started Working');
    sendMessage(task.roomId, `${currentUser.name} — ${statusText} ${task.code}`, `${currentUser.nameEn} — ${statusText} ${task.code}`, 'system', task.id);
    addAuditLog({ action: lang === 'ar' ? 'تغيير حالة' : 'Status Changed', actionEn: 'Status Changed', userId: currentUser.id, departmentId: task.departmentId, roomId: task.roomId, taskId: task.id, timestamp: new Date(), details: `${task.code}: → ${statusText}`, detailsEn: `${task.code}: → ${statusText}` });
    toast({ title: tr.statusUpdatedSuccess });
  };

  const handleApprove = () => {
    updateTaskStatus(task.id, 'approved');
    sendMessage(task.roomId, `${tr.statusApproved} — ${task.code}`, `Approved — ${task.code}`, 'approval', task.id);
    addAuditLog({ action: lang === 'ar' ? 'اعتماد' : 'Approved', actionEn: 'Approved', userId: currentUser.id, departmentId: task.departmentId, roomId: task.roomId, taskId: task.id, timestamp: new Date(), details: `${task.code}: ${lang === 'ar' ? 'تم الاعتماد النهائي' : 'Final approval'}`, detailsEn: `${task.code}: Final approval` });
    toast({ title: tr.taskApprovedSuccess });
    setShowApproveConfirm(false);
  };

  const handleClose = () => {
    updateTaskStatus(task.id, 'closed');
    toast({ title: tr.statusUpdatedSuccess });
  };

  const isDesigner = currentRole === 'designer';
  const isSupervisor = currentRole === 'design_supervisor' || currentRole === 'scientific_supervisor' || currentRole === 'manager';

  const canReceive = isDesigner && task.status === 'sent';
  const canStart = isDesigner && task.status === 'received';
  const canSubmit = isDesigner && (task.status === 'in_progress' || task.status === 'needs_revision');
  const canRevise = isSupervisor && task.status === 'submitted';
  const canApprove = isSupervisor && task.status === 'submitted';
  const canCloseTask = isSupervisor && task.status === 'approved';

  return (
    <motion.div
      initial={{ opacity: 0, x: lang === 'ar' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col h-full bg-card border-s border-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono font-bold text-primary ltr-value">{task.code}</span>
          <StatusBadge status={task.status} size="sm" />
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors duration-150">
            <X size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        <div className="p-4 space-y-4">
          {/* Title */}
          <h3 className="text-base font-semibold text-foreground leading-snug">{lang === 'ar' ? task.title : task.titleEn}</h3>

          {/* ERPNext status */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <span className="text-xs text-muted-foreground">ERP:</span>
            <span className="text-xs font-medium text-foreground ltr-value">{task.erpStatus}</span>
          </div>

          {/* Info grid */}
          <div className="space-y-2.5">
            <InfoRow icon={Calendar} label={tr.deadline}>
              <span className="text-xs ltr-value">{task.deadline.toLocaleDateString('en-GB')}</span>
              <span className="text-xs ms-2">{daysRelative(task.deadline, lang, tr)}</span>
            </InfoRow>
            <InfoRow icon={User} label={tr.assignedDesigner}>
              <span className="text-xs">{lang === 'ar' ? designer?.name : designer?.nameEn}</span>
            </InfoRow>
            <InfoRow icon={User} label={tr.sender}>
              <span className="text-xs">{lang === 'ar' ? sender?.name : sender?.nameEn}</span>
            </InfoRow>
            <InfoRow icon={Building2} label={tr.department}>
              <span className="text-xs">{lang === 'ar' ? dept?.name : dept?.nameEn}</span>
            </InfoRow>
            <InfoRow icon={Hash} label={tr.room}>
              <span className="text-xs">{lang === 'ar' ? room?.name : room?.nameEn}</span>
            </InfoRow>
            <InfoRow icon={RotateCcw} label={tr.revisionCount}>
              <span className="text-xs">{task.revisionCount} {task.revisionCount === 1 ? tr.revision : tr.revisions}</span>
            </InfoRow>
            <InfoRow icon={AlertCircle} label={tr.priority}>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>
                {tr[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` as 'priorityLow']}
              </span>
            </InfoRow>
          </div>

          {/* Files */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{tr.files}</p>
            {task.files.length === 0 ? (
              <p className="text-xs text-muted-foreground">{tr.noFiles}</p>
            ) : (
              <div className="space-y-1.5">
                {task.files.map(file => (
                  <div key={file.id} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                    <FileText size={14} className="text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate ltr-value">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size} • {tr.version}{file.version}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {canReceive && (
          <Button className="w-full" size="sm" onClick={() => handleDesignerAction('received')} data-testid="action-received">
            <CheckCircle2 size={14} className="me-2" />
            {tr.confirmReceived}
          </Button>
        )}
        {canStart && (
          <Button className="w-full" size="sm" onClick={() => handleDesignerAction('in_progress')} data-testid="action-start">
            <ChevronRight size={14} className="me-2" />
            {tr.startWork}
          </Button>
        )}
        {canSubmit && (
          <Button className="w-full" size="sm" onClick={() => handleDesignerAction('submit')} data-testid="action-submit">
            <CheckCircle2 size={14} className="me-2" />
            {tr.submitForReview}
          </Button>
        )}
        {canRevise && (
          <Button variant="outline" className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400" size="sm" onClick={() => setShowRevisionModal(true)} data-testid="action-revise">
            <RotateCcw size={14} className="me-2" />
            {tr.requestRevision}
          </Button>
        )}
        {canApprove && (
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => setShowApproveConfirm(true)} data-testid="action-approve">
            <CheckCircle2 size={14} className="me-2" />
            {tr.approve}
          </Button>
        )}
        {canCloseTask && (
          <Button variant="outline" className="w-full" size="sm" onClick={handleClose} data-testid="action-close">
            <XCircle size={14} className="me-2" />
            {tr.closeTask}
          </Button>
        )}
      </div>

      {/* Approve confirm */}
      <AnimatePresence>
        {showApproveConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card rounded-2xl p-5 w-full max-w-xs shadow-xl border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">{tr.approveConfirm}</h3>
              <p className="text-xs text-muted-foreground mb-4">{tr.approveConfirmMsg}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowApproveConfirm(false)}>{tr.cancel}</Button>
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove}>{tr.approveAction}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showSubmitModal && <SubmitWorkModal task={task} onClose={() => setShowSubmitModal(false)} />}
      {showRevisionModal && <RevisionModal task={task} onClose={() => setShowRevisionModal(false)} />}
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-muted-foreground flex-shrink-0 mt-0.5" />
      <span className="text-xs text-muted-foreground min-w-[80px]">{label}</span>
      <div className="flex items-center flex-1 flex-wrap gap-1">{children}</div>
    </div>
  );
}

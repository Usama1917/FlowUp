import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Plus, Edit2, ToggleLeft, ToggleRight, Users, X, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import type { Department } from '@/data/mockData';

type AdminTab = 'departments' | 'members' | 'rooms' | 'permissions';

const PERMISSIONS_GROUPS = [
  { key: 'communication', labelAr: 'التواصل', labelEn: 'Communication', perms: ['permView', 'permSendMessage', 'permUploadFiles'] },
  { key: 'tasks', labelAr: 'المهام', labelEn: 'Tasks', perms: ['permSendTasks', 'permSubmit'] },
  { key: 'review', labelAr: 'المراجعة', labelEn: 'Review', perms: ['permRequestRevision', 'permApprove'] },
  { key: 'admin', labelAr: 'الإدارة', labelEn: 'Administration', perms: ['permManageMembers', 'permManageRoom', 'permManageDept', 'permManagePerms'] },
] as const;

export function AdminPage() {
  const { lang, currentRole, allDepartments, allUsers, allRooms, addDepartment, updateDepartment } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('departments');
  const [showAddDept, setShowAddDept] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    permView: true, permSendMessage: true, permUploadFiles: true,
    permSendTasks: false, permSubmit: true,
    permRequestRevision: false, permApprove: false,
    permManageMembers: false, permManageRoom: false, permManageDept: false, permManagePerms: false,
  });

  const [newDept, setNewDept] = useState({ name: '', nameEn: '', code: '', description: '', descriptionEn: '', managerId: 'u1' });

  if (currentRole !== 'manager') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-3xl bg-destructive/10 flex items-center justify-center mb-4">
          <Lock size={28} className="text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">{tr.accessDenied}</h2>
        <p className="text-sm text-muted-foreground max-w-xs">{tr.accessDeniedDesc}</p>
      </div>
    );
  }

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'departments', label: tr.departments },
    { key: 'members', label: tr.members },
    { key: 'rooms', label: tr.roomsTab },
    { key: 'permissions', label: tr.permissions },
  ];

  const handleAddDept = () => {
    if (!newDept.name || !newDept.code) return;
    addDepartment({ name: newDept.name, nameEn: newDept.nameEn || newDept.name, code: newDept.code.toUpperCase(), description: newDept.description, descriptionEn: newDept.descriptionEn || newDept.description, managerId: newDept.managerId, memberCount: 0, active: true });
    setNewDept({ name: '', nameEn: '', code: '', description: '', descriptionEn: '', managerId: 'u1' });
    setShowAddDept(false);
    toast({ title: lang === 'ar' ? 'تم إنشاء القسم بنجاح' : 'Department created successfully' });
  };

  const toggleDeptActive = (dept: Department) => {
    updateDepartment(dept.id, { active: !dept.active });
    toast({ title: dept.active ? (lang === 'ar' ? 'تم تعطيل القسم' : 'Department deactivated') : (lang === 'ar' ? 'تم تفعيل القسم' : 'Department activated') });
  };

  const managers = allUsers.filter(u => u.role === 'manager' || u.role === 'design_supervisor');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-4 pb-3 border-b border-border bg-card/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Settings2 size={16} className="text-secondary" />
          </div>
          <h1 className="text-base font-bold text-foreground">{tr.adminTitle}</h1>
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(tab => (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${activeTab === tab.key ? 'bg-secondary text-white' : 'text-muted-foreground hover:bg-muted/70'}`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none p-5">
        {/* DEPARTMENTS */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{allDepartments.length} {lang === 'ar' ? 'قسم' : 'departments'}</p>
              <Button size="sm" onClick={() => setShowAddDept(true)} data-testid="add-dept-btn">
                <Plus size={13} className="me-1.5" />
                {tr.addDepartment}
              </Button>
            </div>

            {/* Add dept form */}
            <AnimatePresence>
              {showAddDept && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card border border-secondary/30 rounded-2xl p-4 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{tr.addDepartment}</h3>
                    <button onClick={() => setShowAddDept(false)}><X size={14} className="text-muted-foreground" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{tr.departmentName} (ع)</label>
                      <Input value={newDept.name} onChange={e => setNewDept(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" data-testid="dept-name-ar" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{tr.departmentName} (EN)</label>
                      <Input value={newDept.nameEn} onChange={e => setNewDept(p => ({ ...p, nameEn: e.target.value }))} className="h-8 text-sm ltr-value" data-testid="dept-name-en" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{tr.departmentCode}</label>
                      <Input value={newDept.code} onChange={e => setNewDept(p => ({ ...p, code: e.target.value }))} className="h-8 text-sm font-mono ltr-value uppercase" placeholder="DEPT" data-testid="dept-code" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{tr.departmentManager}</label>
                      <select value={newDept.managerId} onChange={e => setNewDept(p => ({ ...p, managerId: e.target.value }))} className="w-full text-sm bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none h-8">
                        {managers.map(m => <option key={m.id} value={m.id}>{lang === 'ar' ? m.name : m.nameEn}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tr.departmentDesc}</label>
                    <Input value={newDept.description} onChange={e => setNewDept(p => ({ ...p, description: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddDept(false)} className="flex-1">{tr.cancel}</Button>
                    <Button size="sm" onClick={handleAddDept} className="flex-1" data-testid="save-dept">{tr.save}</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dept cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allDepartments.map((dept, idx) => {
                const manager = allUsers.find(u => u.id === dept.managerId);
                return (
                  <motion.div
                    key={dept.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className={`bg-card border rounded-2xl p-4 transition-all ${dept.active ? 'border-border' : 'border-border/50 opacity-60'}`}
                    data-testid={`dept-card-${dept.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-primary ltr-value">{dept.code}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${dept.active ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                            {dept.active ? tr.active : tr.inactive}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mt-1">{lang === 'ar' ? dept.name : dept.nameEn}</h3>
                        <p className="text-xs text-muted-foreground">{lang === 'ar' ? dept.description : dept.descriptionEn}</p>
                      </div>
                      <button
                        onClick={() => toggleDeptActive(dept)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`toggle-dept-${dept.id}`}
                      >
                        {dept.active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {dept.memberCount} {lang === 'ar' ? 'عضو' : 'members'}
                      </span>
                      <span>{lang === 'ar' ? 'المدير:' : 'Manager:'} {lang === 'ar' ? manager?.name : manager?.nameEn}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* MEMBERS */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{allUsers.length} {lang === 'ar' ? 'عضو' : 'members'}</p>
              <Button size="sm" variant="outline">
                <Plus size={13} className="me-1.5" />
                {tr.addMember}
              </Button>
            </div>
            {allUsers.map((user, idx) => {
              const avatarColors = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];
              const roleMap: Record<string, string> = { manager: tr.roleManager, design_supervisor: tr.roleDesignSupervisor, scientific_supervisor: tr.roleScientificSupervisor, designer: tr.roleDesigner };
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: lang === 'ar' ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{lang === 'ar' ? user.name : user.nameEn}</p>
                    <p className="text-xs text-muted-foreground ltr-value">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-lg">{roleMap[user.role]}</span>
                    <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <Edit2 size={12} className="text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ROOMS */}
        {activeTab === 'rooms' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">{allRooms.length} {lang === 'ar' ? 'غرفة' : 'rooms'}</p>
            {allRooms.map((room, idx) => {
              const dept = allDepartments.find(d => d.id === room.departmentId);
              const typeLabels: Record<string, string> = { group: tr.typeGroup, direct: tr.typeDirect, task_room: tr.typeTaskRoom, dept_room: tr.typeDeptRoom };
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                    {(lang === 'ar' ? room.name : room.nameEn).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{lang === 'ar' ? room.name : room.nameEn}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{lang === 'ar' ? dept?.name : dept?.nameEn}</span>
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{typeLabels[room.type]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users size={12} />
                    {room.participantIds.length}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* PERMISSIONS */}
        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-secondary" />
              <p className="text-sm text-muted-foreground">{lang === 'ar' ? 'إدارة صلاحيات الأعضاء حسب الدور' : 'Manage member permissions by role'}</p>
            </div>
            {PERMISSIONS_GROUPS.map((group, gIdx) => (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gIdx * 0.1 }}
                className="bg-card border border-border rounded-2xl p-4"
              >
                <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">
                  {lang === 'ar' ? group.labelAr : group.labelEn}
                </h3>
                <div className="space-y-3">
                  {group.perms.map(perm => (
                    <div key={perm} className="flex items-center justify-between">
                      <label className="text-sm text-foreground">{tr[perm as keyof typeof tr]}</label>
                      <Switch
                        checked={permissions[perm] ?? false}
                        onCheckedChange={v => setPermissions(prev => ({ ...prev, [perm]: v }))}
                        data-testid={`perm-${perm}`}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
            <Button className="w-full" onClick={() => toast({ title: lang === 'ar' ? 'تم حفظ الصلاحيات' : 'Permissions saved' })} data-testid="save-permissions">
              {tr.save}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

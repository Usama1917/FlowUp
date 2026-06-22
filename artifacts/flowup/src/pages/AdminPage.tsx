import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Plus, Edit2, ToggleLeft, ToggleRight, Users, X, Lock, ShieldCheck, BookOpen, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import type { Department, SubDepartment, Subject, User, UserRole } from '@/data/mockData';
import { mockItems, mockProjects, mockEmployeeCodes } from '@/data/mockData';

const AVATAR_COLORS = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-600'];

type AdminTab = 'departments' | 'members' | 'rooms' | 'subjects' | 'permissions';

const SUBJECT_COLORS = ['#16a34a', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

// Add / edit / remove the stages (sub-departments) of a department.
function SubDeptEditor({ value, onChange, lang }: { value: SubDepartment[]; onChange: (v: SubDepartment[]) => void; lang: string }) {
  // Arabic-first: the input edits the Arabic name and mirrors it to nameEn for new stages.
  const rename = (id: string, name: string) => onChange(value.map(s => s.id === id ? { ...s, name, nameEn: name } : s));
  const remove = (id: string) => onChange(value.filter(s => s.id !== id));
  const add = () => onChange([...value, { id: `sd_${Date.now()}_${value.length}`, name: '', nameEn: '' }]);
  return (
    <div className="space-y-1.5">
      {value.map(s => (
        <div key={s.id} className="flex items-center gap-1.5">
          <Input
            value={s.name}
            onChange={e => rename(s.id, e.target.value)}
            className="h-7 text-xs"
            placeholder={lang === 'ar' ? 'اسم المرحلة (مثال: الرسم)' : 'Stage name'}
            data-testid={`subdept-input-${s.id}`}
          />
          <button type="button" onClick={() => remove(s.id)} className="p-1 text-muted-foreground hover:text-rose-500 transition-colors" data-testid={`subdept-remove-${s.id}`}>
            <X size={13} />
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 transition-colors" data-testid="subdept-add">
        <Plus size={12} /> {lang === 'ar' ? 'إضافة مرحلة' : 'Add stage'}
      </button>
    </div>
  );
}

const PERMISSIONS_GROUPS = [
  { key: 'communication', labelAr: 'التواصل', labelEn: 'Communication', perms: ['permView', 'permSendMessage', 'permUploadFiles'] },
  { key: 'tasks', labelAr: 'المهام', labelEn: 'Tasks', perms: ['permSendTasks', 'permSubmit'] },
  { key: 'review', labelAr: 'المراجعة', labelEn: 'Review', perms: ['permRequestRevision', 'permApprove'] },
  { key: 'admin', labelAr: 'الإدارة', labelEn: 'Administration', perms: ['permManageMembers', 'permManageRoom', 'permManageDept', 'permManagePerms'] },
] as const;

export function AdminPage() {
  const { lang, currentRole, allDepartments, allUsers, allRooms, allSubjects, addDepartment, updateDepartment, addSubject, updateSubject, addUser, updateUser, setUserRooms, setDesignerSubjects } = useApp();
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

  const [newDept, setNewDept] = useState<{ name: string; nameEn: string; code: string; description: string; descriptionEn: string; managerId: string; subDepartments: SubDepartment[] }>({ name: '', nameEn: '', code: '', description: '', descriptionEn: '', managerId: 'u1', subDepartments: [] });
  // Which department's stages editor is currently open (in the dept cards list).
  const [editStagesDeptId, setEditStagesDeptId] = useState<string | null>(null);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', item: '', project: '', scientificSupervisorCode: '', color: SUBJECT_COLORS[0], designerIds: [] as string[] });

  // Add/Edit member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<{ name: string; employeeCode: string; role: UserRole; department: string; roomIds: string[]; subjectIds: string[]; subDepartmentIds: string[] }>({
    name: '', employeeCode: '', role: 'designer', department: 'd1', roomIds: [], subjectIds: [], subDepartmentIds: [],
  });

  // Design Dept. Supervisor has the exact same admin access as the Manager.
  const canAccessAdmin = currentRole === 'manager' || currentRole === 'design_supervisor';

  if (!canAccessAdmin) {
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
    { key: 'subjects', label: tr.subjects },
    { key: 'permissions', label: tr.permissions },
  ];

  const handleAddDept = () => {
    if (!newDept.name || !newDept.code) return;
    addDepartment({ name: newDept.name, nameEn: newDept.nameEn || newDept.name, code: newDept.code.toUpperCase(), description: newDept.description, descriptionEn: newDept.descriptionEn || newDept.description, managerId: newDept.managerId, memberCount: 0, active: true, subDepartments: newDept.subDepartments.filter(s => s.name.trim()) });
    setNewDept({ name: '', nameEn: '', code: '', description: '', descriptionEn: '', managerId: 'u1', subDepartments: [] });
    setShowAddDept(false);
    toast({ title: lang === 'ar' ? 'تم إنشاء القسم بنجاح' : 'Department created successfully' });
  };

  const toggleDeptActive = (dept: Department) => {
    updateDepartment(dept.id, { active: !dept.active });
    toast({ title: dept.active ? (lang === 'ar' ? 'تم تعطيل القسم' : 'Department deactivated') : (lang === 'ar' ? 'تم تفعيل القسم' : 'Department activated') });
  };

  const handleAddSubject = () => {
    if (!newSubject.name.trim() || !newSubject.item || !newSubject.project) return;
    addSubject({
      name: newSubject.name.trim(),
      item: newSubject.item,
      project: newSubject.project,
      scientificSupervisorCode: newSubject.scientificSupervisorCode.trim(),
      color: newSubject.color,
      designerIds: newSubject.designerIds,
      active: true,
    });
    setNewSubject({ name: '', item: '', project: '', scientificSupervisorCode: '', color: SUBJECT_COLORS[0], designerIds: [] });
    setShowAddSubject(false);
    toast({ title: tr.subjectAddedSuccess });
  };

  const toggleSubjectActive = (subject: Subject) => {
    updateSubject(subject.id, { active: !subject.active });
    toast({ title: subject.active ? (lang === 'ar' ? 'تم تعطيل المادة' : 'Subject deactivated') : (lang === 'ar' ? 'تم تفعيل المادة' : 'Subject activated') });
  };

  const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('') || '؟';

  const openAddMember = () => {
    setEditingUserId(null);
    setMemberForm({ name: '', employeeCode: '', role: 'designer', department: allDepartments[0]?.id || 'd1', roomIds: [], subjectIds: [], subDepartmentIds: [] });
    setShowMemberForm(true);
  };

  const openEditMember = (user: User) => {
    setEditingUserId(user.id);
    setMemberForm({
      name: user.name,
      employeeCode: user.employeeCode,
      role: user.role,
      department: user.department,
      roomIds: allRooms.filter(r => ['group', 'dept_room', 'task_room'].includes(r.type) && r.participantIds.includes(user.id)).map(r => r.id),
      subjectIds: allSubjects.filter(s => s.designerIds.includes(user.id)).map(s => s.id),
      subDepartmentIds: user.subDepartmentIds ?? [],
    });
    setShowMemberForm(true);
  };

  const toggleMemberRoom = (roomId: string) => {
    setMemberForm(p => ({ ...p, roomIds: p.roomIds.includes(roomId) ? p.roomIds.filter(id => id !== roomId) : [...p.roomIds, roomId] }));
  };

  const toggleMemberSubject = (subjectId: string) => {
    setMemberForm(p => ({ ...p, subjectIds: p.subjectIds.includes(subjectId) ? p.subjectIds.filter(id => id !== subjectId) : [...p.subjectIds, subjectId] }));
  };

  const toggleMemberSubDept = (subDeptId: string) => {
    setMemberForm(p => ({ ...p, subDepartmentIds: p.subDepartmentIds.includes(subDeptId) ? p.subDepartmentIds.filter(id => id !== subDeptId) : [...p.subDepartmentIds, subDeptId] }));
  };

  const toggleNewSubjectDesigner = (designerId: string) => {
    setNewSubject(p => ({ ...p, designerIds: p.designerIds.includes(designerId) ? p.designerIds.filter(id => id !== designerId) : [...p.designerIds, designerId] }));
  };

  const handleSaveMember = () => {
    if (!memberForm.name.trim()) return;
    if (editingUserId) {
      updateUser(editingUserId, {
        name: memberForm.name.trim(),
        nameEn: memberForm.name.trim(),
        employeeCode: memberForm.employeeCode,
        role: memberForm.role,
        department: memberForm.department,
        avatar: initialsOf(memberForm.name),
        subDepartmentIds: memberForm.role === 'designer' ? memberForm.subDepartmentIds : [],
      });
      setUserRooms(editingUserId, memberForm.roomIds);
      setDesignerSubjects(editingUserId, memberForm.role === 'designer' ? memberForm.subjectIds : []);
      toast({ title: tr.memberUpdatedSuccess });
    } else {
      const id = addUser({
        name: memberForm.name.trim(),
        nameEn: memberForm.name.trim(),
        role: memberForm.role,
        email: `${(memberForm.employeeCode || 'emp').toLowerCase()}@flowup.co`,
        employeeCode: memberForm.employeeCode,
        avatar: initialsOf(memberForm.name),
        department: memberForm.department,
        subDepartmentIds: memberForm.role === 'designer' ? memberForm.subDepartmentIds : [],
      });
      setUserRooms(id, memberForm.roomIds);
      setDesignerSubjects(id, memberForm.role === 'designer' ? memberForm.subjectIds : []);
      toast({ title: tr.memberAddedSuccess });
    }
    setShowMemberForm(false);
    setEditingUserId(null);
  };

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: 'designer', label: tr.roleDesigner },
    { value: 'scientific_supervisor', label: tr.roleScientificSupervisor },
    { value: 'design_supervisor', label: tr.roleDesignSupervisor },
    { value: 'manager', label: tr.roleManager },
  ];

  const managers = allUsers.filter(u => u.role === 'manager' || u.role === 'design_supervisor');
  const designers = allUsers.filter(u => u.role === 'designer');

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
                  {/* Sub-departments (stages) */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{lang === 'ar' ? 'الأقسام الفرعية (المراحل)' : 'Sub-departments (stages)'}</label>
                    <SubDeptEditor value={newDept.subDepartments} onChange={v => setNewDept(p => ({ ...p, subDepartments: v }))} lang={lang} />
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

                    {/* Sub-departments (stages) — view as chips, or edit inline */}
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-muted-foreground">{lang === 'ar' ? 'الأقسام الفرعية' : 'Sub-departments'}</span>
                        <button
                          onClick={() => setEditStagesDeptId(prev => prev === dept.id ? null : dept.id)}
                          className="flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 transition-colors"
                          data-testid={`edit-stages-${dept.id}`}
                        >
                          <Edit2 size={11} />
                          {editStagesDeptId === dept.id ? (lang === 'ar' ? 'تم' : 'Done') : (lang === 'ar' ? 'تعديل' : 'Edit')}
                        </button>
                      </div>
                      {editStagesDeptId === dept.id ? (
                        <SubDeptEditor
                          value={dept.subDepartments ?? []}
                          onChange={v => updateDepartment(dept.id, { subDepartments: v })}
                          lang={lang}
                        />
                      ) : (dept.subDepartments?.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {dept.subDepartments.map((s, i) => (
                            <span key={s.id} className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-muted text-foreground">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />
                              {lang === 'ar' ? s.name : s.nameEn}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/70">{lang === 'ar' ? 'لا توجد أقسام فرعية' : 'No sub-departments'}</span>
                      ))}
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
              <Button size="sm" onClick={openAddMember} data-testid="add-member-btn">
                <Plus size={13} className="me-1.5" />
                {tr.addMember}
              </Button>
            </div>

            {/* Add / Edit member form */}
            <AnimatePresence>
              {showMemberForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card border border-secondary/30 rounded-2xl p-4 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{editingUserId ? tr.editMember : tr.addMember}</h3>
                    <button onClick={() => { setShowMemberForm(false); setEditingUserId(null); }}><X size={14} className="text-muted-foreground" /></button>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tr.memberName}</label>
                    <Input value={memberForm.name} onChange={e => setMemberForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" placeholder={lang === 'ar' ? 'مثال: محمد إبراهيم' : 'e.g. Mohamed Ibrahim'} data-testid="member-name" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Employee code */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{tr.employeeCode}</label>
                      <select value={memberForm.employeeCode} onChange={e => setMemberForm(p => ({ ...p, employeeCode: e.target.value }))} className="w-full text-sm bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none h-8 ltr-value" data-testid="member-emp-code">
                        <option value="" disabled>{tr.selectEmployeeCode}</option>
                        {mockEmployeeCodes.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {/* Role */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{tr.memberRole}</label>
                      <select value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value as UserRole }))} className="w-full text-sm bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none h-8" data-testid="member-role">
                        {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tr.department}</label>
                    <select value={memberForm.department} onChange={e => setMemberForm(p => ({ ...p, department: e.target.value }))} className="w-full text-sm bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none h-8" data-testid="member-dept">
                      {allDepartments.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name : d.nameEn}</option>)}
                    </select>
                  </div>

                  {/* Groups (rooms) */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{tr.memberGroups} <span className="text-muted-foreground/60">— {tr.selectGroupsHint}</span></label>
                    <div className="flex flex-wrap gap-1.5">
                      {allRooms.filter(r => ['group', 'dept_room', 'task_room'].includes(r.type)).map(room => {
                        const checked = memberForm.roomIds.includes(room.id);
                        return (
                          <button
                            key={room.id}
                            type="button"
                            onClick={() => toggleMemberRoom(room.id)}
                            data-testid={`member-group-${room.id}`}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${checked ? 'bg-secondary text-white border-secondary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}`}
                          >
                            {checked && <Check size={11} />}
                            {lang === 'ar' ? room.name : room.nameEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subjects this designer is assigned to (drives their subject chats) */}
                  {memberForm.role === 'designer' && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">{lang === 'ar' ? 'المواد المكلّف بها' : 'Assigned Subjects'}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {allSubjects.map(s => {
                          const checked = memberForm.subjectIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleMemberSubject(s.id)}
                              data-testid={`member-subject-${s.id}`}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${checked ? 'text-white border-transparent' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}`}
                              style={checked ? { backgroundColor: s.color } : undefined}
                            >
                              {checked ? <Check size={11} /> : <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />}
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stages (sub-departments) this designer works in — drives which stage chats they get */}
                  {memberForm.role === 'designer' && (() => {
                    const memberDeptStages = allDepartments.find(d => d.id === memberForm.department)?.subDepartments ?? [];
                    if (!memberDeptStages.length) return null;
                    return (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">{lang === 'ar' ? 'المراحل المكلّف بها' : 'Assigned Stages'}</label>
                        <div className="flex flex-wrap gap-1.5">
                          {memberDeptStages.map((s, i) => {
                            const checked = memberForm.subDepartmentIds.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => toggleMemberSubDept(s.id)}
                                data-testid={`member-stage-${s.id}`}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${checked ? 'text-white border-transparent' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}`}
                                style={checked ? { backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] } : undefined}
                              >
                                {checked ? <Check size={11} /> : <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }} />}
                                {lang === 'ar' ? s.name : s.nameEn}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => { setShowMemberForm(false); setEditingUserId(null); }} className="flex-1">{tr.cancel}</Button>
                    <Button size="sm" onClick={handleSaveMember} disabled={!memberForm.name.trim()} className="flex-1" data-testid="save-member">{tr.save}</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {allUsers.map((user, idx) => {
              const roleMap: Record<string, string> = { manager: tr.roleManager, design_supervisor: tr.roleDesignSupervisor, scientific_supervisor: tr.roleScientificSupervisor, designer: tr.roleDesigner };
              const groupCount = allRooms.filter(r => r.participantIds.includes(user.id)).length;
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: lang === 'ar' ? -8 : 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{lang === 'ar' ? user.name : user.nameEn}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-primary font-mono ltr-value">{user.employeeCode}</span>
                      <span className="text-xs text-muted-foreground">· {groupCount} {tr.groupsCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-lg">{roleMap[user.role]}</span>
                    <button onClick={() => openEditMember(user)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid={`edit-member-${user.id}`}>
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
            <p className="text-sm text-muted-foreground mb-2">{allRooms.filter(r => r.type !== 'subject').length} {lang === 'ar' ? 'غرفة' : 'rooms'}</p>
            {allRooms.filter(r => r.type !== 'subject').map((room, idx) => {
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

        {/* SUBJECTS (المواد) */}
        {activeTab === 'subjects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-secondary" />
                <p className="text-sm text-muted-foreground">{allSubjects.length} {lang === 'ar' ? 'مادة' : 'subjects'}</p>
              </div>
              <Button size="sm" onClick={() => setShowAddSubject(true)} data-testid="add-subject-btn">
                <Plus size={13} className="me-1.5" />
                {tr.addSubject}
              </Button>
            </div>

            {/* Add subject form */}
            <AnimatePresence>
              {showAddSubject && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-card border border-secondary/30 rounded-2xl p-4 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{tr.addSubject}</h3>
                    <button onClick={() => setShowAddSubject(false)}><X size={14} className="text-muted-foreground" /></button>
                  </div>

                  {/* Subject name */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tr.subjectName}</label>
                    <Input value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} className="h-8 text-sm" placeholder={lang === 'ar' ? 'مثال: الأحياء أسئلة وتدريبات' : 'e.g. Biology — Questions'} data-testid="subject-name" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Item select */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{tr.subjectItem}</label>
                      <select value={newSubject.item} onChange={e => setNewSubject(p => ({ ...p, item: e.target.value }))} className="w-full text-sm bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none h-8" data-testid="subject-item">
                        <option value="" disabled>{tr.selectItem}</option>
                        {mockItems.map(it => <option key={it} value={it}>{it}</option>)}
                      </select>
                    </div>
                    {/* Project select */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">{tr.subjectProject}</label>
                      <select value={newSubject.project} onChange={e => setNewSubject(p => ({ ...p, project: e.target.value }))} className="w-full text-sm bg-muted/50 border border-border rounded-xl px-2.5 py-1.5 text-foreground focus:outline-none h-8 ltr-value" data-testid="subject-project">
                        <option value="" disabled>{tr.selectProject}</option>
                        {mockProjects.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Scientific supervisor code */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{tr.scientificSupervisorCode}</label>
                    <Input value={newSubject.scientificSupervisorCode} onChange={e => setNewSubject(p => ({ ...p, scientificSupervisorCode: e.target.value }))} className="h-8 text-sm font-mono ltr-value" placeholder={tr.scientificSupervisorCodePlaceholder} data-testid="subject-sci-code" />
                  </div>

                  {/* Color picker */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{tr.subjectColor}</label>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECT_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewSubject(p => ({ ...p, color: c }))}
                          data-testid={`subject-color-${c}`}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${newSubject.color === c ? 'scale-110 ring-2 ring-offset-2 ring-offset-card' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c, boxShadow: newSubject.color === c ? `0 0 0 2px ${c}` : undefined }}
                        >
                          {newSubject.color === c && <Check size={14} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Assigned designers (can be more than one) */}
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{lang === 'ar' ? 'المصممون المسؤولون' : 'Assigned Designers'}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {designers.map(d => {
                        const checked = newSubject.designerIds.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => toggleNewSubjectDesigner(d.id)}
                            data-testid={`subject-designer-${d.id}`}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${checked ? 'bg-secondary text-white border-secondary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}`}
                          >
                            {checked && <Check size={11} />}
                            {lang === 'ar' ? d.name : d.nameEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => setShowAddSubject(false)} className="flex-1">{tr.cancel}</Button>
                    <Button size="sm" onClick={handleAddSubject} disabled={!newSubject.name.trim() || !newSubject.item || !newSubject.project} className="flex-1" data-testid="save-subject">{tr.save}</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subject cards */}
            {allSubjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <BookOpen size={20} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{tr.noSubjects}</p>
                <p className="text-xs text-muted-foreground mt-1">{tr.noSubjectsDesc}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allSubjects.map((subject, idx) => (
                  <motion.div
                    key={subject.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`bg-card border rounded-2xl p-4 transition-all ${subject.active ? 'border-border' : 'border-border/50 opacity-60'}`}
                    data-testid={`subject-card-${subject.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${subject.color}1a` }}>
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: subject.color }} />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{subject.name}</h3>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${subject.active ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                            {subject.active ? tr.active : tr.inactive}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSubjectActive(subject)}
                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        data-testid={`toggle-subject-${subject.id}`}
                      >
                        {subject.active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                      </button>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{tr.subjectItem}</span>
                        <span className="text-foreground font-medium truncate">{subject.item}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{tr.subjectProject}</span>
                        <span className="text-foreground font-medium truncate ltr-value">{subject.project}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">{lang === 'ar' ? 'كود المشرف العلمي' : 'Sci. Supervisor'}</span>
                        <span className="text-primary font-mono truncate ltr-value">{subject.scientificSupervisorCode || '—'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-muted-foreground flex-shrink-0">{lang === 'ar' ? 'المصممون' : 'Designers'}</span>
                        <span className="text-foreground font-medium text-end">
                          {subject.designerIds.length === 0
                            ? '—'
                            : subject.designerIds.map(id => allUsers.find(u => u.id === id)).filter(Boolean).map(u => (lang === 'ar' ? u!.name : u!.nameEn)).join('، ')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
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

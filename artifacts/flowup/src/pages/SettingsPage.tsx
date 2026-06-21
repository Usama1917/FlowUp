import { useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Globe, Moon, MessageSquare, HardDrive, FileType, Activity, Building2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/AppContext';
import { getTranslations } from '@/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import type { Lang } from '@/i18n/translations';

export function SettingsPage() {
  const { lang, setLang, isDark, setIsDark, allDepartments } = useApp();
  const tr = getTranslations(lang);
  const { toast } = useToast();

  const [defaultLang, setDefaultLang] = useState<Lang>(lang);
  const [darkMode, setDarkMode] = useState(isDark);
  const [taskComments, setTaskComments] = useState(true);
  const [maxUpload, setMaxUpload] = useState('50');
  const [extensions, setExtensions] = useState(['pdf', 'docx', 'pptx', 'png', 'jpg', 'ai', 'psd']);
  const [auditEnabled, setAuditEnabled] = useState(true);
  const [defaultDept, setDefaultDept] = useState('d1');
  const [newExt, setNewExt] = useState('');

  const handleSave = () => {
    setLang(defaultLang);
    setIsDark(darkMode);
    toast({ title: tr.settingsSavedSuccess });
  };

  const addExtension = () => {
    if (newExt.trim() && !extensions.includes(newExt.trim().toLowerCase())) {
      setExtensions(prev => [...prev, newExt.trim().toLowerCase()]);
      setNewExt('');
    }
  };

  const removeExt = (ext: string) => setExtensions(prev => prev.filter(e => e !== ext));

  const SettingSection = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Icon size={15} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </motion.div>
  );

  const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-foreground">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto scrollbar-none p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <SlidersHorizontal size={16} className="text-muted-foreground" />
          </div>
          <h1 className="text-base font-bold text-foreground">{tr.settingsTitle}</h1>
        </div>
        <Button onClick={handleSave} size="sm" className="min-w-[100px]" data-testid="save-settings">
          {tr.saveSettings}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Language & Appearance */}
        <SettingSection icon={Globe} title={lang === 'ar' ? 'اللغة والمظهر' : 'Language & Appearance'}>
          <SettingRow label={tr.defaultLanguage}>
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              <button
                onClick={() => setDefaultLang('ar')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${defaultLang === 'ar' ? 'bg-white dark:bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {tr.langArabic}
              </button>
              <button
                onClick={() => setDefaultLang('en')}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${defaultLang === 'en' ? 'bg-white dark:bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                {tr.langEnglish}
              </button>
            </div>
          </SettingRow>
          <SettingRow label={tr.darkMode}>
            <Switch
              checked={darkMode}
              onCheckedChange={setDarkMode}
              data-testid="dark-mode-toggle"
            />
          </SettingRow>
        </SettingSection>

        {/* Tasks */}
        <SettingSection icon={MessageSquare} title={lang === 'ar' ? 'المهام والمحادثات' : 'Tasks & Chat'}>
          <SettingRow label={tr.enableTaskComments}>
            <Switch
              checked={taskComments}
              onCheckedChange={setTaskComments}
              data-testid="task-comments-toggle"
            />
          </SettingRow>
          <SettingRow label={tr.enableAuditLogs}>
            <Switch
              checked={auditEnabled}
              onCheckedChange={setAuditEnabled}
              data-testid="audit-logs-toggle"
            />
          </SettingRow>
        </SettingSection>

        {/* Upload */}
        <SettingSection icon={HardDrive} title={lang === 'ar' ? 'رفع الملفات' : 'File Upload'}>
          <SettingRow label={tr.maxUploadSize}>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={maxUpload}
                onChange={e => setMaxUpload(e.target.value)}
                className="w-20 text-sm h-8"
                data-testid="max-upload-input"
              />
              <span className="text-xs text-muted-foreground">MB</span>
            </div>
          </SettingRow>
          <div>
            <label className="text-sm text-foreground block mb-2">{tr.allowedExtensions}</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {extensions.map(ext => (
                <motion.span
                  key={ext}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-mono font-medium"
                >
                  .{ext}
                  <button onClick={() => removeExt(ext)} className="hover:text-red-500 transition-colors">&times;</button>
                </motion.span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newExt}
                onChange={e => setNewExt(e.target.value.replace('.', ''))}
                onKeyDown={e => e.key === 'Enter' && addExtension()}
                placeholder="ext"
                className="flex-1 text-sm h-8 font-mono"
              />
              <Button onClick={addExtension} size="sm" variant="outline">{tr.add}</Button>
            </div>
          </div>
        </SettingSection>

        {/* Department */}
        <SettingSection icon={Building2} title={lang === 'ar' ? 'تنظيم العمل' : 'Work Organization'}>
          <SettingRow label={tr.defaultDepartment}>
            <select
              value={defaultDept}
              onChange={e => setDefaultDept(e.target.value)}
              className="text-sm bg-muted/50 border border-border rounded-xl px-3 py-1.5 text-foreground focus:outline-none"
              data-testid="default-dept-select"
            >
              {allDepartments.filter(d => d.active).map(d => (
                <option key={d.id} value={d.id}>{lang === 'ar' ? d.name : d.nameEn}</option>
              ))}
            </select>
          </SettingRow>
        </SettingSection>
      </div>

      {/* Save button at bottom for mobile */}
      <div className="mt-6 flex justify-end lg:hidden">
        <Button onClick={handleSave} size="sm" className="w-full" data-testid="save-settings-mobile">
          {tr.saveSettings}
        </Button>
      </div>
    </div>
  );
}

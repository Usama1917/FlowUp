export type UserRole = 'manager' | 'design_supervisor' | 'scientific_supervisor' | 'designer';

export interface User {
  id: string;
  name: string;
  nameEn: string;
  role: UserRole;
  email: string;
  employeeCode: string;   // كود الموظف من ERPNext
  avatar: string;
  department: string;     // department id
  subDepartmentIds?: string[]; // for designers — which stages they can work in (رسم/تدقيق/...)
}

// A stage / sub-department inside a department (e.g. Design → تصميم، رسم، تدقيق، كتابة).
// A subject "passes through" every stage, so it gets one chat per (designer × stage).
export interface SubDepartment {
  id: string;
  name: string;
  nameEn: string;
  memberLabel?: string;   // plural name of the people doing this stage (التصميم → المصممين)
  memberLabelEn?: string;
}

export interface Department {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  description: string;
  descriptionEn: string;
  managerId: string;
  memberCount: number;
  active: boolean;
  subDepartments?: SubDepartment[]; // stages; the first one is the "main" stage
}

// A "Subject" (مادة) — each subject becomes a chat/room the designer sees.
// Managed by the Design Dept. Supervisor or the Manager from the Admin page.
export interface Subject {
  id: string;
  name: string;                      // اسم المادة
  color: string;                     // لون المادة (hex)
  item: string;                      // الايتم المختار من ايتمز السستم (ERPNext Item later)
  project: string;                   // البروجيكت
  scientificSupervisorCode: string;  // كود المشرف العلمي من ERPNext
  designerIds: string[];             // المصممون المسؤولون عن المادة (ممكن أكتر من واحد)
  active: boolean;
}

export interface Room {
  id: string;
  name: string;
  nameEn: string;
  departmentId: string;
  type: 'group' | 'direct' | 'task_room' | 'dept_room' | 'subject' | 'feed' | 'subject_merge';
  subjectId?: string;   // for subject-assignment chats — which subject
  subjectIds?: string[]; // for subject_merge — every subject this merged designer chat aggregates
  designerId?: string;  // for subject-assignment chats, feed & subject_merge — the designer it belongs to
  subDepartmentId?: string; // for subject-assignment chats — which stage (رسم/تدقيق/كتابة/تصميم)
  participantIds: string[];
  lastMessage: string;
  lastMessageEn: string;
  lastMessageTime: Date;
  unreadCount: number;
  activeTaskCount: number;
  isActive: boolean;
}

export type TaskStatus = 'sent' | 'received' | 'in_progress' | 'submitted' | 'needs_revision' | 'approved' | 'closed' | 'overdue';

export interface TaskFile {
  id: string;
  name: string;
  size: string;
  version: number;
  uploadedAt: Date;
  uploadedById: string;
}

export interface Task {
  id: string;
  code: string;
  title: string;
  titleEn: string;
  status: TaskStatus;
  erpStatus: string;
  deadline: Date;
  senderId: string;
  designerId: string;
  departmentId: string;
  roomId: string;
  revisionCount: number;
  lastActivity: Date;
  files: TaskFile[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  project: string;
}

export type MessageType = 'text' | 'system' | 'task_card' | 'submission' | 'revision' | 'approval';

// Delivery / read status for outgoing messages (WhatsApp / Telegram style):
//  - 'sending'   → clock icon: not yet left the device (offline / in-flight), hasn't reached the system.
//  - 'sent'      → single gray check: reached the system, recipient(s) still offline.
//  - 'delivered' → double gray check: reached a recipient's online device, not opened yet.
//  - 'read'      → double blue check: opened/seen by a recipient.
// In a group, ANY recipient counts (no per-person tracking in this prototype).
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  type: MessageType;
  text: string;
  textEn: string;
  taskId?: string;
  timestamp: Date;
  isRead: boolean;
  deliveryStatus?: MessageStatus; // outgoing-only; falls back to isRead when absent (seed data)
}

export interface AuditLog {
  id: string;
  action: string;
  actionEn: string;
  userId: string;
  departmentId: string;
  roomId?: string;
  taskId?: string;
  timestamp: Date;
  details: string;
  detailsEn: string;
}

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

export const users: User[] = [
  { id: 'u1', name: 'سارة خالد', nameEn: 'Sara Khaled', role: 'manager', email: 'sara.khaled@flowup.co', employeeCode: 'HR-EMP-0001', avatar: 'SK', department: 'd1' },
  { id: 'u2', name: 'يوسف محمود', nameEn: 'Yousef Mahmoud', role: 'design_supervisor', email: 'yousef.mahmoud@flowup.co', employeeCode: 'HR-EMP-0002', avatar: 'YM', department: 'd1' },
  { id: 'u3', name: 'مريم حسن', nameEn: 'Mariam Hassan', role: 'scientific_supervisor', email: 'mariam.hassan@flowup.co', employeeCode: 'HR-EMP-0012', avatar: 'MH', department: 'd1' },
  { id: 'u4', name: 'أحمد علي', nameEn: 'Ahmed Ali', role: 'designer', email: 'ahmed.ali@flowup.co', employeeCode: 'HR-EMP-0023', avatar: 'AA', department: 'd1', subDepartmentIds: ['sd_design', 'sd_review'] },
  { id: 'u5', name: 'كريم ناصر', nameEn: 'Karim Nasser', role: 'designer', email: 'karim.nasser@flowup.co', employeeCode: 'HR-EMP-0024', avatar: 'KN', department: 'd1', subDepartmentIds: ['sd_design'] },
  { id: 'u6', name: 'ندى سامي', nameEn: 'Nada Sami', role: 'scientific_supervisor', email: 'nada.sami@flowup.co', employeeCode: 'HR-EMP-0007', avatar: 'NS', department: 'd2' },
];

// Mock ERPNext employee codes — for the "Add Member" form select.
export const mockEmployeeCodes: string[] = [
  'HR-EMP-0001', 'HR-EMP-0002', 'HR-EMP-0007', 'HR-EMP-0012', 'HR-EMP-0021',
  'HR-EMP-0023', 'HR-EMP-0024', 'HR-EMP-0031', 'HR-EMP-0032', 'HR-EMP-0033',
];

export const departments: Department[] = [
  { id: 'd1', name: 'قسم التصميم', nameEn: 'Design Department', code: 'DESIGN', description: 'مسؤول عن تصميم المواد التعليمية', descriptionEn: 'Responsible for educational material design', managerId: 'u2', memberCount: 5, active: true,
    subDepartments: [
      { id: 'sd_design', name: 'التصميم', nameEn: 'Design', memberLabel: 'المصممين', memberLabelEn: 'Designers' },
      { id: 'sd_draw', name: 'الرسم', nameEn: 'Drawing', memberLabel: 'الرسامين', memberLabelEn: 'Illustrators' },
      { id: 'sd_review', name: 'التدقيق', nameEn: 'Review', memberLabel: 'المدققين', memberLabelEn: 'Reviewers' },
      { id: 'sd_write', name: 'الكتابة', nameEn: 'Writing', memberLabel: 'الكتّاب', memberLabelEn: 'Writers' },
    ] },
  { id: 'd2', name: 'قسم الحسابات', nameEn: 'Accounts Department', code: 'ACCT', description: 'إدارة الحسابات والمالية', descriptionEn: 'Finance and accounting management', managerId: 'u1', memberCount: 3, active: true },
  { id: 'd3', name: 'قسم اللوجستيات', nameEn: 'Logistics Department', code: 'LOG', description: 'الشحن والتوزيع والعمليات', descriptionEn: 'Shipping, distribution and operations', managerId: 'u1', memberCount: 4, active: true },
  { id: 'd4', name: 'الميديا والسوشيال', nameEn: 'Media & Social', code: 'MEDIA', description: 'إدارة وسائل التواصل الاجتماعي', descriptionEn: 'Social media management', managerId: 'u1', memberCount: 2, active: true },
  { id: 'd5', name: 'البرمجة', nameEn: 'Development', code: 'DEV', description: 'تطوير الأنظمة والبرمجيات', descriptionEn: 'Systems and software development', managerId: 'u1', memberCount: 3, active: false },
];

export const rooms: Room[] = [
  { id: 'r1', name: 'تصميم الأحياء', nameEn: 'Biology Design', departmentId: 'd1', type: 'group', participantIds: ['u2', 'u3', 'u4'], lastMessage: 'تم الاعتماد، شغل ممتاز.', lastMessageEn: 'Approved, excellent work.', lastMessageTime: hoursAgo(1), unreadCount: 3, activeTaskCount: 2, isActive: true },
  { id: 'r2', name: 'تصميم الكيمياء', nameEn: 'Chemistry Design', departmentId: 'd1', type: 'group', participantIds: ['u2', 'u5', 'u6'], lastMessage: 'محتاج تعديل في صفحة 12، العنوان يكون أوضح.', lastMessageEn: 'Need revision on page 12, the title should be clearer.', lastMessageTime: hoursAgo(3), unreadCount: 1, activeTaskCount: 1, isActive: true },
  { id: 'r3', name: 'مراجعة الفيزياء', nameEn: 'Physics Review', departmentId: 'd1', type: 'group', participantIds: ['u2', 'u3', 'u4', 'u5'], lastMessage: 'سيتم إرسال المهمة غداً', lastMessageEn: 'Task will be sent tomorrow', lastMessageTime: hoursAgo(8), unreadCount: 0, activeTaskCount: 0, isActive: true },
  { id: 'r4', name: 'أحمد - مصمم', nameEn: 'Ahmed - Designer', departmentId: 'd1', type: 'direct', participantIds: ['u2', 'u4'], lastMessage: 'تمام، وصلت المهمة وهبدأ فيها دلوقتي.', lastMessageEn: 'OK, task received, will start now.', lastMessageTime: hoursAgo(5), unreadCount: 0, activeTaskCount: 1, isActive: true },
  { id: 'r5', name: 'فريق التصميم العام', nameEn: 'General Design Team', departmentId: 'd1', type: 'dept_room', participantIds: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'], lastMessage: 'تذكير: موعد تسليم مشاريع الأسبوع القادم', lastMessageEn: 'Reminder: Next week project deadlines', lastMessageTime: daysAgo(1), unreadCount: 0, activeTaskCount: 0, isActive: true },
];

export const tasks: Task[] = [
  {
    id: 't1', code: 'TASK-00045', title: 'تصميم درس الحركة في النبات', titleEn: 'Plant Motion Lesson Design',
    status: 'in_progress', erpStatus: 'In Design', deadline: daysFromNow(3), senderId: 'u2', designerId: 'u4',
    departmentId: 'd1', roomId: 'r1', revisionCount: 0, lastActivity: hoursAgo(2),
    files: [], priority: 'high', project: 'Biology Grade 5',
  },
  {
    id: 't2', code: 'TASK-00046', title: 'تعديل صفحات أسئلة الباب الأول', titleEn: 'Revise Chapter 1 Questions',
    status: 'needs_revision', erpStatus: 'Under Revision', deadline: daysAgo(1), senderId: 'u6', designerId: 'u5',
    departmentId: 'd1', roomId: 'r2', revisionCount: 2, lastActivity: hoursAgo(3),
    files: [{ id: 'f1', name: 'chapter1-v1.pdf', size: '2.4 MB', version: 1, uploadedAt: daysAgo(2), uploadedById: 'u5' }, { id: 'f2', name: 'chapter1-v2.pdf', size: '2.8 MB', version: 2, uploadedAt: daysAgo(1), uploadedById: 'u5' }],
    priority: 'urgent', project: 'Chemistry Grade 6',
  },
  {
    id: 't3', code: 'BIO-CH01-L02', title: 'إخراج درس الدعامة والحركة', titleEn: 'Support & Motion Lesson Layout',
    status: 'submitted', erpStatus: 'Pending Review', deadline: daysFromNow(5), senderId: 'u3', designerId: 'u4',
    departmentId: 'd1', roomId: 'r1', revisionCount: 1, lastActivity: hoursAgo(1),
    files: [{ id: 'f3', name: 'bio-ch01-l02-v1.pdf', size: '5.1 MB', version: 1, uploadedAt: hoursAgo(1), uploadedById: 'u4' }],
    priority: 'normal', project: 'Biology Grade 6',
  },
  {
    id: 't4', code: 'CHEM-REV-009', title: 'مراجعة تصميم درس التحليل الكيميائي', titleEn: 'Chemical Analysis Lesson Review',
    status: 'approved', erpStatus: 'Approved', deadline: daysAgo(3), senderId: 'u2', designerId: 'u5',
    departmentId: 'd1', roomId: 'r2', revisionCount: 0, lastActivity: hoursAgo(5),
    files: [{ id: 'f4', name: 'chem-rev-009-final.pdf', size: '3.7 MB', version: 1, uploadedAt: hoursAgo(5), uploadedById: 'u5' }],
    priority: 'normal', project: 'Chemistry Grade 7',
  },
];

export const messages: Message[] = [
  { id: 'm1', roomId: 'r1', senderId: 'u2', type: 'task_card', text: 'تم إرسال مهمة جديدة', textEn: 'New task sent', taskId: 't1', timestamp: daysAgo(2), isRead: true },
  { id: 'm2', roomId: 'r1', senderId: 'system', type: 'system', text: 'أحمد علي استلم المهمة TASK-00045', textEn: 'Ahmed Ali received task TASK-00045', taskId: 't1', timestamp: daysAgo(2), isRead: true },
  { id: 'm3', roomId: 'r1', senderId: 'u4', type: 'text', text: 'تمام، وصلت المهمة وهبدأ فيها دلوقتي.', textEn: 'OK, task received, I will start right away.', timestamp: daysAgo(2), isRead: true },
  { id: 'm4', roomId: 'r1', senderId: 'system', type: 'system', text: 'أحمد علي بدأ العمل على TASK-00045', textEn: 'Ahmed Ali started working on TASK-00045', taskId: 't1', timestamp: daysAgo(1), isRead: true },
  { id: 'm5', roomId: 'r1', senderId: 'u3', type: 'task_card', text: 'تم إرسال مهمة جديدة', textEn: 'New task sent', taskId: 't3', timestamp: daysAgo(1), isRead: true },
  { id: 'm6', roomId: 'r1', senderId: 'u4', type: 'submission', text: 'تم رفع النسخة الأولى للمراجعة', textEn: 'Version 1 submitted for review', taskId: 't3', timestamp: hoursAgo(4), isRead: true },
  { id: 'm7', roomId: 'r1', senderId: 'system', type: 'system', text: 'تم رفع النسخة الأولى للمراجعة — BIO-CH01-L02', textEn: 'Version 1 submitted for review — BIO-CH01-L02', taskId: 't3', timestamp: hoursAgo(4), isRead: true },
  { id: 'm8', roomId: 'r1', senderId: 'u3', type: 'revision', text: 'يرجى مراجعة التنسيق في صفحة 8، والتأكد من وضوح العناوين.', textEn: 'Please review formatting on page 8 and ensure headings are clear.', taskId: 't3', timestamp: hoursAgo(3), isRead: true },
  { id: 'm9', roomId: 'r1', senderId: 'system', type: 'approval', text: 'تم اعتماد المهمة CHEM-REV-009 بنجاح', textEn: 'Task CHEM-REV-009 has been approved successfully', taskId: 't4', timestamp: hoursAgo(1), isRead: false },
  { id: 'm10', roomId: 'r1', senderId: 'u2', type: 'text', text: 'تم الاعتماد، شغل ممتاز.', textEn: 'Approved, excellent work.', timestamp: hoursAgo(1), isRead: false },
  { id: 'm11', roomId: 'r1', senderId: 'u4', type: 'text', text: 'شكراً جزيلاً، هكمل الباقي بنفس المستوى.', textEn: 'Thank you very much, I will continue at the same level.', timestamp: hoursAgo(1), isRead: false },

  { id: 'm12', roomId: 'r2', senderId: 'u6', type: 'task_card', text: 'تم إرسال مهمة جديدة', textEn: 'New task sent', taskId: 't2', timestamp: daysAgo(3), isRead: true },
  { id: 'm13', roomId: 'r2', senderId: 'u5', type: 'text', text: 'تمام خلص.', textEn: 'OK, got it.', timestamp: daysAgo(3), isRead: true },
  { id: 'm14', roomId: 'r2', senderId: 'u5', type: 'submission', text: 'تم رفع النسخة الأولى', textEn: 'Version 1 submitted', taskId: 't2', timestamp: daysAgo(2), isRead: true },
  { id: 'm15', roomId: 'r2', senderId: 'u6', type: 'revision', text: 'محتاج تعديل في صفحة 12، العنوان يكون أوضح.', textEn: 'Need revision on page 12, the title should be clearer.', taskId: 't2', timestamp: daysAgo(2), isRead: true },
  { id: 'm16', roomId: 'r2', senderId: 'u5', type: 'submission', text: 'تم رفع النسخة الثانية للمراجعة', textEn: 'Version 2 submitted for review', taskId: 't2', timestamp: hoursAgo(3), isRead: false },
  { id: 'm17', roomId: 'r2', senderId: 'u6', type: 'text', text: 'محتاج تعديل في صفحة 12، العنوان يكون أوضح.', textEn: 'Need revision on page 12, the title should be clearer.', taskId: 't2', timestamp: hoursAgo(3), isRead: false },

  // Subject-chat messages — show inside the subject chat AND inside the designer's read-only feed.
  { id: 'sm1', roomId: 'asg_s1_u4_sd_design', senderId: 'u3', type: 'text', text: 'أهلاً أحمد، جاهزين نبدأ في درس الحركة؟', textEn: 'Hi Ahmed, ready to start the motion lesson?', timestamp: hoursAgo(7), isRead: true },
  { id: 'sm2', roomId: 'asg_s1_u4_sd_design', senderId: 'u4', type: 'text', text: 'تمام يا دكتورة، هبدأ دلوقتي.', textEn: 'Sure, starting now.', timestamp: hoursAgo(6), isRead: true },
  { id: 'sm3', roomId: 'asg_s1_u4_sd_design', senderId: 'u4', type: 'submission', text: 'تم رفع النسخة 1 للمراجعة', textEn: 'Version 1 submitted for review', timestamp: hoursAgo(5), isRead: true },
  { id: 'sm4', roomId: 'asg_s3_u4_sd_design', senderId: 'u2', type: 'text', text: 'محتاجين نخلّص غلاف الفيزياء الأسبوع ده.', textEn: 'We need to finish the physics cover this week.', timestamp: hoursAgo(4), isRead: true },
  { id: 'sm5', roomId: 'asg_s3_u4_sd_design', senderId: 'u2', type: 'revision', text: 'لون العنوان غامق شوية، فتّحه درجة.', textEn: 'The title color is a bit dark, lighten it a notch.', timestamp: hoursAgo(3), isRead: true },
  { id: 'sm6', roomId: 'asg_s4_u4_sd_design', senderId: 'u3', type: 'text', text: 'راجعت شرح الدعامة، شغل ممتاز.', textEn: 'Reviewed the support lesson, excellent work.', timestamp: hoursAgo(2), isRead: true },
  { id: 'sm7', roomId: 'asg_s1_u5_sd_design', senderId: 'u3', type: 'text', text: 'كريم، فيه ملاحظة بسيطة على صفحة 3.', textEn: 'Karim, a small note on page 3.', timestamp: hoursAgo(3), isRead: true },
];

export const auditLogs: AuditLog[] = [
  { id: 'al1', action: 'إرسال مهمة', actionEn: 'Task Sent', userId: 'u2', departmentId: 'd1', roomId: 'r1', taskId: 't1', timestamp: daysAgo(2), details: 'تم إرسال مهمة TASK-00045 إلى أحمد علي', detailsEn: 'Task TASK-00045 sent to Ahmed Ali' },
  { id: 'al2', action: 'تغيير حالة', actionEn: 'Status Changed', userId: 'u4', departmentId: 'd1', roomId: 'r1', taskId: 't1', timestamp: daysAgo(2), details: 'TASK-00045: تم الإرسال → تم الاستلام', detailsEn: 'TASK-00045: Sent → Received' },
  { id: 'al3', action: 'تغيير حالة', actionEn: 'Status Changed', userId: 'u4', departmentId: 'd1', roomId: 'r1', taskId: 't1', timestamp: daysAgo(1), details: 'TASK-00045: تم الاستلام → جاري العمل', detailsEn: 'TASK-00045: Received → In Progress' },
  { id: 'al4', action: 'تسليم عمل', actionEn: 'Work Submitted', userId: 'u4', departmentId: 'd1', roomId: 'r1', taskId: 't3', timestamp: hoursAgo(4), details: 'BIO-CH01-L02: تم رفع النسخة الأولى', detailsEn: 'BIO-CH01-L02: Version 1 submitted' },
  { id: 'al5', action: 'طلب تعديل', actionEn: 'Revision Requested', userId: 'u3', departmentId: 'd1', roomId: 'r1', taskId: 't3', timestamp: hoursAgo(3), details: 'BIO-CH01-L02: طلب مراجعة التنسيق', detailsEn: 'BIO-CH01-L02: Formatting review requested' },
  { id: 'al6', action: 'اعتماد', actionEn: 'Approved', userId: 'u2', departmentId: 'd1', roomId: 'r2', taskId: 't4', timestamp: hoursAgo(1), details: 'CHEM-REV-009: تم الاعتماد النهائي', detailsEn: 'CHEM-REV-009: Final approval' },
  { id: 'al7', action: 'إنشاء قسم', actionEn: 'Department Created', userId: 'u1', departmentId: 'd4', timestamp: daysAgo(5), details: 'تم إنشاء قسم الميديا والسوشيال', detailsEn: 'Media & Social department created' },
  { id: 'al8', action: 'إضافة عضو', actionEn: 'Member Added', userId: 'u1', departmentId: 'd1', timestamp: daysAgo(4), details: 'تم إضافة كريم ناصر إلى قسم التصميم', detailsEn: 'Karim Nasser added to Design Department' },
  { id: 'al9', action: 'تعديل صلاحيات', actionEn: 'Permissions Updated', userId: 'u1', departmentId: 'd1', roomId: 'r2', timestamp: daysAgo(3), details: 'تم تعديل صلاحيات غرفة تصميم الكيمياء', detailsEn: 'Permissions updated for Chemistry Design room' },
  { id: 'al10', action: 'إرسال مهمة', actionEn: 'Task Sent', userId: 'u6', departmentId: 'd1', roomId: 'r2', taskId: 't2', timestamp: daysAgo(3), details: 'تم إرسال مهمة TASK-00046 إلى كريم ناصر', detailsEn: 'Task TASK-00046 sent to Karim Nasser' },
];

export const mockTaskPreviews: Record<string, { title: string; titleEn: string; deadline: Date; priority: string; project: string; erpStatus: string }> = {
  'TASK-00047': { title: 'تصميم درس الانقسام الخلوي', titleEn: 'Cell Division Lesson Design', deadline: daysFromNow(7), priority: 'high', project: 'Biology Grade 5', erpStatus: 'Pending Assignment' },
  'TASK-00048': { title: 'إعادة تصميم غلاف كتاب الفيزياء', titleEn: 'Physics Book Cover Redesign', deadline: daysFromNow(4), priority: 'urgent', project: 'Physics Grade 8', erpStatus: 'New' },
  'BIO-CH02-L01': { title: 'إخراج درس التكاثر في الكائنات الحية', titleEn: 'Reproduction in Organisms', deadline: daysFromNow(10), priority: 'normal', project: 'Biology Grade 6', erpStatus: 'Pending Assignment' },
};

// Subjects (المواد) — each becomes a designer chat. Seeded with the agreed list.
export const subjects: Subject[] = [
  { id: 's1', name: 'الأحياء أسئلة وتدريبات', color: '#16a34a', item: 'كتاب الأحياء', project: 'Biology Grade 6', scientificSupervisorCode: 'HR-EMP-0012', designerIds: ['u4', 'u5'], active: true },
  { id: 's2', name: 'الكيمياء أسئلة وتدريبات', color: '#0ea5e9', item: 'كتاب الكيمياء', project: 'Chemistry Grade 7', scientificSupervisorCode: 'HR-EMP-0007', designerIds: ['u5'], active: true },
  { id: 's3', name: 'الفيزياء أسئلة وتدريبات', color: '#8b5cf6', item: 'كتاب الفيزياء', project: 'Physics Grade 8', scientificSupervisorCode: 'HR-EMP-0021', designerIds: ['u4'], active: true },
  { id: 's4', name: 'الأحياء شرح', color: '#f59e0b', item: 'كتاب الأحياء', project: 'Biology Grade 6', scientificSupervisorCode: 'HR-EMP-0012', designerIds: ['u4'], active: true },
];

// Mock "Items" available in the system (ERPNext Item later) — for the subject form select.
export const mockItems: string[] = [
  'كتاب الأحياء',
  'كتاب الكيمياء',
  'كتاب الفيزياء',
  'كتاب الرياضيات',
  'مذكرة مراجعة نهائية',
  'بنك الأسئلة',
];

// Mock projects — for the subject form select.
export const mockProjects: string[] = [
  'Biology Grade 5',
  'Biology Grade 6',
  'Chemistry Grade 6',
  'Chemistry Grade 7',
  'Physics Grade 8',
  'Math Grade 7',
];

// Build the (designer × subject) assignment chats. Each assignment is ONE chat/room.
// Participants: the designer + the subject's scientific supervisor (matched by employeeCode)
// + all design supervisors + managers (oversight). Derived live from subjects + users.
export function buildAssignmentRooms(subjectList: Subject[], userList: User[], departmentList: Department[]): Room[] {
  const supervisorIds = userList.filter(u => u.role === 'design_supervisor' || u.role === 'manager').map(u => u.id);
  // Subjects belong to the Design dept (d1) for now; its stages drive one chat per stage.
  const stages = departmentList.find(d => d.id === 'd1')?.subDepartments ?? [];
  const mainStageId = stages[0]?.id;
  const out: Room[] = [];
  for (const s of subjectList) {
    const sci = userList.find(u => u.employeeCode === s.scientificSupervisorCode);
    for (const designerId of s.designerIds) {
      const designer = userList.find(u => u.id === designerId);
      const participantIds = Array.from(new Set([designerId, ...(sci ? [sci.id] : []), ...supervisorIds]));
      // A designer only gets chats for the stages they're assigned to (default: the main stage).
      let designerStages: (SubDepartment | null)[];
      if (!stages.length) {
        designerStages = [null];
      } else {
        const ids = designer?.subDepartmentIds?.length ? designer.subDepartmentIds : (mainStageId ? [mainStageId] : []);
        designerStages = stages.filter(st => ids.includes(st.id));
        if (!designerStages.length) designerStages = stages.filter(st => st.id === mainStageId);
      }
      for (const stage of designerStages) {
        out.push({
          id: stage ? `asg_${s.id}_${designerId}_${stage.id}` : `asg_${s.id}_${designerId}`,
          name: s.name,
          nameEn: s.name,
          departmentId: 'd1',
          type: 'subject',
          subjectId: s.id,
          designerId,
          subDepartmentId: stage?.id,
          participantIds,
          lastMessage: '',
          lastMessageEn: '',
          lastMessageTime: now,
          unreadCount: 0,
          activeTaskCount: 0,
          isActive: s.active,
        });
      }
    }
  }
  return out;
}

// One read-only "feed" group per (designer × stage they work in) — pinned at the top of
// THEIR list. It aggregates every message from that designer's subject chats IN that stage.
export function buildFeedRooms(userList: User[], departmentList: Department[]): Room[] {
  const out: Room[] = [];
  for (const designer of userList.filter(u => u.role === 'designer')) {
    const deptStages = departmentList.find(d => d.id === designer.department)?.subDepartments ?? [];
    const myStages = deptStages.filter(st => (designer.subDepartmentIds ?? []).includes(st.id));
    const stageList: (SubDepartment | null)[] = myStages.length ? myStages : (deptStages[0] ? [deptStages[0]] : [null]);
    for (const stage of stageList) {
      out.push({
        id: stage ? `feed_${designer.id}_${stage.id}` : `feed_${designer.id}`,
        name: stage ? `جروب ${stage.name} - ${designer.name}` : `جروب التصميم - ${designer.name}`,
        nameEn: stage ? `${stage.nameEn} Group - ${designer.nameEn}` : `Design Group - ${designer.nameEn}`,
        departmentId: designer.department,
        type: 'feed' as const,
        designerId: designer.id,
        subDepartmentId: stage?.id,
        participantIds: [designer.id],
        lastMessage: '',
        lastMessageEn: '',
        lastMessageTime: now,
        unreadCount: 0,
        activeTaskCount: 0,
        isActive: true,
      });
    }
    // When the designer works in more than one stage, add the "التفاعل" feed that aggregates
    // every stage (no subDepartmentId) — shown when the stage filter is on "الكل".
    if (myStages.length > 1) {
      out.push({
        id: `feed_${designer.id}_all`,
        name: 'التفاعل',
        nameEn: 'Activity',
        departmentId: designer.department,
        type: 'feed' as const,
        designerId: designer.id,
        participantIds: [designer.id],
        lastMessage: '',
        lastMessageEn: '',
        lastMessageTime: now,
        unreadCount: 0,
        activeTaskCount: 0,
        isActive: true,
      });
    }
  }
  return out;
}

// "By designer" view for a scientific supervisor: one merged chat per (designer × STAGE),
// aggregating all of the supervisor's subjects that designer works on IN that stage. So the
// stage filter only surfaces designers who actually do that stage, and the chat shows only
// that stage's messages. Viewer-dependent — only built for a scientific_supervisor.
export function buildSupervisorMergeRooms(viewer: User, subjectList: Subject[], userList: User[], departmentList: Department[]): Room[] {
  if (viewer.role !== 'scientific_supervisor') return [];
  const supervisorIds = userList.filter(u => u.role === 'design_supervisor' || u.role === 'manager').map(u => u.id);
  const mySubjects = subjectList.filter(s => s.scientificSupervisorCode === viewer.employeeCode);
  const stages = departmentList.find(d => d.id === 'd1')?.subDepartments ?? [];
  const mainStageId = stages[0]?.id;

  // designerId -> the subjects (of this supervisor) they work on
  const byDesigner = new Map<string, string[]>();
  for (const s of mySubjects) {
    for (const designerId of s.designerIds) {
      const arr = byDesigner.get(designerId) ?? [];
      arr.push(s.id);
      byDesigner.set(designerId, arr);
    }
  }

  const out: Room[] = [];
  for (const [designerId, subjectIds] of byDesigner) {
    const designer = userList.find(u => u.id === designerId);
    // Only the stages this designer actually works in (default: the main stage).
    const ids = designer?.subDepartmentIds?.length ? designer.subDepartmentIds : (mainStageId ? [mainStageId] : []);
    const designerStages: (SubDepartment | null)[] = stages.length ? stages.filter(st => ids.includes(st.id)) : [null];
    for (const stage of designerStages) {
      out.push({
        id: stage ? `smrg_${viewer.id}_${designerId}_${stage.id}` : `smrg_${viewer.id}_${designerId}`,
        name: designer ? designer.name : '',
        nameEn: designer ? designer.nameEn : '',
        departmentId: 'd1',
        type: 'subject_merge',
        designerId,
        subjectIds,
        subDepartmentId: stage?.id,
        participantIds: Array.from(new Set([viewer.id, designerId, ...supervisorIds])),
        lastMessage: '',
        lastMessageEn: '',
        lastMessageTime: now,
        unreadCount: 0,
        activeTaskCount: 0,
        isActive: true,
      });
    }
  }
  return out;
}

// 12-hour clock, ALWAYS Latin digits, with an Arabic (ص/م) or English (AM/PM) suffix.
export function formatTime12(date: Date, lang: 'ar' | 'en'): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const am = h < 12;
  h = h % 12 || 12;
  const mm = String(m).padStart(2, '0');
  const suffix = lang === 'ar' ? (am ? 'ص' : 'م') : (am ? 'AM' : 'PM');
  return `${h}:${mm} ${suffix}`;
}

// Per-role display name for a chat. The stage (sub-department) prefixes the subject name
// so e.g. the التدقيق-stage chat reads "تدقيق <المادة>" instead of "تصميم <المادة>".
//  - the designer sees "<stage> <المادة>"
//  - the scientific supervisor sees "designer · <stage> subject"
//  - manager / design supervisor see "designer · subject"
//  - direct chats show the OTHER participant's name
export function getRoomDisplayName(room: Room, viewer: User, lang: 'ar' | 'en', userList: User[], subjectList: Subject[], departmentList: Department[] = []): string {
  // Merged "by designer" room — the designer's name, suffixed with the stage it's scoped to.
  if (room.type === 'subject_merge' && room.designerId) {
    const designer = userList.find(u => u.id === room.designerId);
    const dname = designer ? (lang === 'ar' ? designer.name : designer.nameEn) : room.name;
    const stage = departmentList.find(d => d.id === room.departmentId)?.subDepartments?.find(sd => sd.id === room.subDepartmentId);
    if (stage) return lang === 'ar' ? `${dname} · ${stage.name.replace(/^ال/, '')}` : `${dname} · ${stage.nameEn}`;
    return dname;
  }
  if (room.type === 'subject' && room.subjectId && room.designerId) {
    const subject = subjectList.find(s => s.id === room.subjectId);
    const designer = userList.find(u => u.id === room.designerId);
    const subjName = subject ? subject.name : room.name;
    const desName = designer ? (lang === 'ar' ? designer.name : designer.nameEn) : '';
    // Stage prefix (Arabic strips the leading "ال": "التدقيق" → "تدقيق" to match "تصميم …").
    const stage = departmentList.find(d => d.id === room.departmentId)?.subDepartments?.find(sd => sd.id === room.subDepartmentId);
    const stageAr = stage ? stage.name.replace(/^ال/, '') : 'تصميم';
    const stageEn = stage ? stage.nameEn : 'Design';
    if (viewer.id === room.designerId) {
      return lang === 'ar' ? `${stageAr} ${subjName}` : `${stageEn} — ${subjName}`;
    }
    if (viewer.role === 'scientific_supervisor') {
      return lang === 'ar' ? `${desName} · ${stageAr} ${subjName}` : `${desName} · ${stageEn} — ${subjName}`;
    }
    return `${desName} · ${subjName}`;
  }
  if (room.type === 'direct') {
    const otherId = room.participantIds.find(id => id !== viewer.id);
    const other = userList.find(u => u.id === otherId);
    if (other) return lang === 'ar' ? other.name : other.nameEn;
  }
  return lang === 'ar' ? room.name : room.nameEn;
}

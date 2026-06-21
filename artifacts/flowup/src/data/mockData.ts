export type UserRole = 'manager' | 'design_supervisor' | 'scientific_supervisor' | 'designer';

export interface User {
  id: string;
  name: string;
  nameEn: string;
  role: UserRole;
  email: string;
  avatar: string;
  department: string;
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
}

export interface Room {
  id: string;
  name: string;
  nameEn: string;
  departmentId: string;
  type: 'group' | 'direct' | 'task_room' | 'dept_room';
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
  { id: 'u1', name: 'سارة خالد', nameEn: 'Sara Khaled', role: 'manager', email: 'sara.khaled@flowup.co', avatar: 'SK', department: 'd1' },
  { id: 'u2', name: 'يوسف محمود', nameEn: 'Yousef Mahmoud', role: 'design_supervisor', email: 'yousef.mahmoud@flowup.co', avatar: 'YM', department: 'd1' },
  { id: 'u3', name: 'مريم حسن', nameEn: 'Mariam Hassan', role: 'scientific_supervisor', email: 'mariam.hassan@flowup.co', avatar: 'MH', department: 'd1' },
  { id: 'u4', name: 'أحمد علي', nameEn: 'Ahmed Ali', role: 'designer', email: 'ahmed.ali@flowup.co', avatar: 'AA', department: 'd1' },
  { id: 'u5', name: 'كريم ناصر', nameEn: 'Karim Nasser', role: 'designer', email: 'karim.nasser@flowup.co', avatar: 'KN', department: 'd1' },
  { id: 'u6', name: 'ندى سامي', nameEn: 'Nada Sami', role: 'scientific_supervisor', email: 'nada.sami@flowup.co', avatar: 'NS', department: 'd2' },
];

export const departments: Department[] = [
  { id: 'd1', name: 'قسم التصميم', nameEn: 'Design Department', code: 'DESIGN', description: 'مسؤول عن تصميم المواد التعليمية', descriptionEn: 'Responsible for educational material design', managerId: 'u2', memberCount: 5, active: true },
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

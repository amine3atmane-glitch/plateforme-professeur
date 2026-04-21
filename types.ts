

export enum DayOfWeek {
  MONDAY = 'الإثنين',
  TUESDAY = 'الثلاثاء',
  WEDNESDAY = 'الأربعاء',
  THURSDAY = 'الخميس',
  FRIDAY = 'الجمعة',
  SATURDAY = 'السبت',
  SUNDAY = 'الأحد'
}

export interface ClassSession {
  id: string;
  day: DayOfWeek;
  startTime: string; // Format "HH:mm"
  endTime: string;   // Format "HH:mm"
  subject: string;
  className: string;
  room: string;
  color?: string;
}

export interface TeacherDetails {
  fullName: string;
  paymentId?: string; 
  recruitmentDate?: string;
  tenureDate?: string;
  lastPromotionDate?: string; // تاريخ الرتبة
  gradeDate?: string; // تاريخ الدرجة
  genre: 'male' | 'female';
  framework: string; 
  institution: string; 
  subject: string;   
  grade: string;     
  rank: string;      
  lastInspectionScore: string;
  lastInspectionDate: string;
  inspectorName: string;
  inspectorId?: string;
  inspectorEmail?: string;
  inspectorCode?: string;
  school?: string; 
  assignedClasses?: string[]; // قائمة الأقسام المسندة
  sector?: 'public' | 'private'; // تصنيف القطاع: عمومي أو خصوصي
}

export interface User {
  id?: string;
  email: string;
  name: string;
  avatarUrl: string;
  details?: TeacherDetails;
}

export interface LicenseRecord {
  id?: string;
  user_id?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export const DAYS_ORDER = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY
];

export const JS_DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY
};

export const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00", 
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

export const getDayIndex = (day: DayOfWeek): number => {
  return DAYS_ORDER.indexOf(day);
};

export const check48HourGap = (
  day1: DayOfWeek, time1: string, 
  day2: DayOfWeek, time2: string
): boolean => {
  const idx1 = getDayIndex(day1);
  const idx2 = getDayIndex(day2);
  
  if (idx1 === -1 || idx2 === -1) return true;

  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);

  const totalHours1 = idx1 * 24 + h1 + m1 / 60;
  const totalHours2 = idx2 * 24 + h2 + m2 / 60;

  return Math.abs(totalHours2 - totalHours1) >= 48;
};

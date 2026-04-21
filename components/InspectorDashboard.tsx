
import React, { useState, useMemo, useEffect } from 'react';
import { TeacherProfile } from '../utils/mockData';
import { DayOfWeek, DAYS_ORDER, TIME_SLOTS, ClassSession, LicenseRecord, JS_DAY_MAP } from '../types';
import TimetableGrid from './TimetableGrid';
import EditSlotModal from './EditSlotModal';
import ConfirmationModal from './ConfirmationModal';
import { 
  Filter, UserCheck, UserX, Clock, Calendar, LogOut, Sun, Moon, X, Download, 
  Briefcase, GraduationCap, Award, Building, ClipboardList, User, CreditCard, 
  BookOpen, Settings, MessageCircle, Share2, Lock, Plane, Info, Check, ChevronLeft, ChevronRight, Save, Edit, TrendingUp, AlertTriangle, Search, CheckCircle2, Building2, Trash2, Upload
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { auth, db } from '../services/firebase';
import { signOut, updatePassword } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc, writeBatch, setDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../App';

interface InspectorDashboardProps {
  onLogout: () => void;
  onThemeToggle: () => void;
  currentTheme: 'light' | 'dark';
}

const InspectorDashboard: React.FC<InspectorDashboardProps> = ({ onLogout, onThemeToggle, currentTheme }) => {
  const [allTeachers, setAllTeachers] = useState<TeacherProfile[]>([]);
  const [allLicenses, setAllLicenses] = useState<LicenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>("08:00");
  const [duration, setDuration] = useState<number>(1);
  const [period, setPeriod] = useState<'morning' | 'evening'>(() => {
    const hour = new Date().getHours();
    return (hour >= 12) ? 'evening' : 'morning';
  });
  
  // Promotion Year State (Default 2024)
  const [promotionYear, setPromotionYear] = useState<number>(2024);

  const [activeFilter, setActiveFilter] = useState<'all' | 'working' | 'available' | 'leave' | 'promotion'>('all');
  const [sectorFilter, setSectorFilter] = useState<'all' | 'public' | 'private'>('all');
  
  const [showSettings, setShowSettings] = useState(false);
  const [inspectorCode, setInspectorCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const [viewingTeacher, setViewingTeacher] = useState<TeacherProfile | null>(null);
  const [modifiedSessions, setModifiedSessions] = useState<ClassSession[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Notification State
  const [saveStatus, setSaveStatus] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Delete Modal State
  const [deleteModalState, setDeleteModalState] = useState<{isOpen: boolean, teacherId: string | null}>({isOpen: false, teacherId: null});

  // Edit Details State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedDetails, setEditedDetails] = useState<any>({});

  // Edit Modal State for Inspector
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    day: DayOfWeek;
    time: string;
    initialClassName: string;
  }>({ isOpen: false, day: DayOfWeek.MONDAY, time: '08:00', initialClassName: '' });

  // Branding State
  const [ministryLogoUrl, setMinistryLogoUrl] = useState<string>('');
  const [tempLogoUrl, setTempLogoUrl] = useState<string>('');
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const handleOpenTeacher = (teacher: TeacherProfile) => {
    setViewingTeacher(teacher);
    setModifiedSessions(teacher.sessions); // Initialize local copy
    setHasChanges(false);
    setSaveStatus(null);
    
    // Initialize Edit Details Form
    setIsEditingDetails(false);
    setEditedDetails({
        fullName: teacher.name,
        paymentId: teacher.details?.paymentId || '',
        recruitmentDate: teacher.details?.recruitmentDate || '',
        tenureDate: teacher.details?.tenureDate || '',
        lastPromotionDate: teacher.details?.lastPromotionDate || '',
        gradeDate: teacher.details?.gradeDate || '',
        genre: teacher.details?.genre || 'male',
        framework: teacher.details?.framework || '',
        institution: teacher.details?.institution || '',
        subject: teacher.details?.subject || '',
        grade: teacher.details?.grade || '',
        rank: teacher.details?.rank || '',
        lastInspectionScore: teacher.details?.lastInspectionScore || '',
        lastInspectionDate: teacher.details?.lastInspectionDate || '',
        inspectorName: teacher.details?.inspectorName || '',
        sector: teacher.details?.sector || 'public'
    });
  };

  const handleCloseTeacher = () => {
    if (hasChanges || isEditingDetails) {
        if (window.confirm("توجد تغييرات غير محفوظة. هل تريد الخروج دون حفظ؟")) {
            setViewingTeacher(null);
            setHasChanges(false);
            setIsEditingDetails(false);
            setSaveStatus(null);
        }
    } else {
        setViewingTeacher(null);
        setSaveStatus(null);
    }
  };

    // Fetch data
    useEffect(() => {
        const initInspectorCode = async () => {
            const user = auth.currentUser;
            if (!user || !user.email) return;
            
            try {
                // Fetch code from 'authorized_users' as seen in the screenshot
                const authUserDoc = await getDoc(doc(db, 'authorized_users', user.email));
                
                if (authUserDoc.exists()) {
                    setInspectorCode(authUserDoc.data().accessCode || 'بدون كود');
                } else {
                    console.log("No authorized_users document found for current user email.");
                    setInspectorCode('غير مرخص');
                }
            } catch (err) {
                console.error("Error in inspector code lookup:", err);
            }
        };
        initInspectorCode();

    const fetchBranding = async () => {
        try {
            const brandingDoc = await getDoc(doc(db, 'settings', 'branding'));
            if (brandingDoc.exists()) {
                const data = brandingDoc.data();
                setMinistryLogoUrl(data.ministry_logo_url || '');
                setTempLogoUrl(data.ministry_logo_url || '');
            }
        } catch (err) {
            console.error("Error fetching branding:", err);
        }
    };
    fetchBranding();

    const fetchData = async () => {
        setLoading(true);
        const user = auth.currentUser;
        try {
            let profilesSnapshot, detailsSnapshot, sessionsSnapshot, licensesSnapshot;
            try {
                profilesSnapshot = await getDocs(collection(db, 'profiles'));
                
                if (user && user.email) {
                    try {
                        // Switch to querying by inspector_email to match authorized_users identity
                        const detailsQuery = query(collection(db, 'teacher_details'), where('inspector_email', '==', user.email));
                        detailsSnapshot = await getDocs(detailsQuery);
                    } catch (detailsErr) {
                        console.error("Error fetching teacher details:", detailsErr);
                        detailsSnapshot = { docs: [] } as any;
                        showToast("تحذير: فشل جلب بيانات الأساتذة.", "error");
                    }
                } else {
                    detailsSnapshot = { docs: [] } as any;
                }
                
                sessionsSnapshot = await getDocs(collection(db, 'timetable_sessions'));
                licensesSnapshot = await getDocs(collection(db, 'licenses'));
            } catch (error) {
                console.error("General data fetch error:", error);
                handleFirestoreError(error, OperationType.GET, 'InspectorDashboard fetchData');
                return;
            }

            const profiles = profilesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const details = detailsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const sessions = sessionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const licenses = licensesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            const mappedLicenses: LicenseRecord[] = (licenses || []).map(l => ({
               id: l.id,
               user_id: l.user_id,
               startDate: l.start_date,
               endDate: l.end_date,
               reason: l.reason
            }));
            setAllLicenses(mappedLicenses);

            const merged: TeacherProfile[] = (profiles || []).map((p: any) => {
                const detail = details?.find((d: any) => d.id === p.id);
                const teacherSessions = (sessions || [])
                    .filter((s: any) => s.user_id === p.id)
                    .map((s: any) => ({
                        id: s.id,
                        day: s.day as DayOfWeek,
                        startTime: s.start_time,
                        endTime: s.end_time,
                        subject: s.subject,
                        className: s.class_name,
                        room: s.room,
                        color: s.color
                    }));

                return {
                    id: p.id,
                    name: detail?.full_name || p.full_name || p.email?.split('@')[0] || 'مستخدم',
                    email: p.email,
                    avatarUrl: p.avatar_url,
                    sessions: teacherSessions,
                    details: detail ? {
                        fullName: detail.full_name,
                        paymentId: detail.payment_id,
                        genre: detail.genre,
                        framework: detail.framework,
                        institution: detail.institution,
                        school: detail.institution,
                        subject: detail.subject,
                        grade: detail.grade,
                        rank: detail.rank,
                        recruitmentDate: detail.recruitment_date,
                        tenureDate: detail.tenure_date,
                        lastPromotionDate: detail.last_promotion_date,
                        gradeDate: detail.grade_date, // Added grade_date mapping
                        lastInspectionScore: detail.last_inspection_score,
                        lastInspectionDate: detail.last_inspection_date,
                        inspectorName: detail.inspector_name,
                        sector: detail.sector || 'public' // Map Sector
                    } : undefined
                };
            });

            setAllTeachers(merged);

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  const currentDayLabel = useMemo(() => {
    const date = new Date(selectedDate);
    const dayIndex = date.getDay();
    // JS days: 0 (Sun) to 6 (Sat)
    return JS_DAY_MAP[dayIndex] || DayOfWeek.MONDAY;
  }, [selectedDate]);

  const getHour = (time: string) => parseInt(time.split(':')[0], 10);

  const isTeacherOnLeave = (teacherId: string, dateStr: string) => {
    const checkDate = new Date(dateStr);
    checkDate.setHours(12,0,0,0);
    return allLicenses.find(license => {
      if (license.user_id !== teacherId) return false;
      const start = new Date(license.startDate);
      const end = new Date(license.endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      return checkDate >= start && checkDate <= end;
    });
  };

  // Promotion Eligibility Logic (Based on Tenure Date & Target Year)
  const checkPromotionEligibility = (details: any, targetYear: number) => {
    if (!details?.rank) return { eligible: false, missingTenure: false };
    
    const currentRank = parseInt(details.rank, 10);
    // Use the specific target year for calculation (End of that year)
    const targetDate = new Date(`${targetYear}-12-31`);

    // Helper to diff years
    const diffYears = (d1: Date, d2: Date) => {
        let years = d2.getFullYear() - d1.getFullYear();
        const m = d2.getMonth() - d1.getMonth();
        if (m < 0 || (m === 0 && d2.getDate() < d1.getDate())) {
            years--;
        }
        return years;
    };

    // Case 1: Rank 1 -> Needs Recruitment Date
    if (currentRank === 1) {
        if (!details.recruitmentDate) return { eligible: false, missingTenure: true, field: 'recruitmentDate' };
        const recDate = new Date(details.recruitmentDate);
        if (isNaN(recDate.getTime())) return { eligible: false, missingTenure: true, field: 'recruitmentDate' };
        
        const years = diffYears(recDate, targetDate);
        if (years >= 1) return { eligible: true, nextRank: 2, requiredYears: 1 };
        return { eligible: false, missingTenure: false };
    }

    // Case 2: Rank >= 2 -> Needs Tenure Date (Cumulative Calculation)
    if (!details.tenureDate) return { eligible: false, missingTenure: true, field: 'tenureDate' };
    const tenureDate = new Date(details.tenureDate);
    if (isNaN(tenureDate.getTime())) return { eligible: false, missingTenure: true, field: 'tenureDate' };

    const yearsSinceTenure = diffYears(tenureDate, targetDate);

    // Rank durations map (Time to stay IN the rank before moving to next)
    // Rank 1 -> 2: (Calculated separately via recruitment)
    // Rank 2 -> 3: 1 year
    // Rank 3 -> 4: 2 years...
    const rankDurations: {[key: number]: number} = {
        2: 1, 
        3: 2,
        4: 2,
        5: 2,
        6: 2,
        7: 2,
        8: 2,
        9: 2,
        10: 2 
    };

    // Calculate total years needed from Tenure (Rank 2 start) to reach current rank AND complete it
    let totalYearsNeeded = 0;
    
    // Sum duration of all ranks from 2 up to current
    for (let r = 2; r <= currentRank; r++) {
        totalYearsNeeded += rankDurations[r] || 2;
    }

    if (yearsSinceTenure >= totalYearsNeeded) {
        const nextRank = currentRank + 1;
        const durationOfCurrent = rankDurations[currentRank] || 2;
        return { eligible: true, nextRank, requiredYears: durationOfCurrent };
    }

    return { eligible: false, missingTenure: false };
  };

  const filteredData = useMemo(() => {
    const working: TeacherProfile[] = [];
    const available: TeacherProfile[] = [];
    const onLeave: TeacherProfile[] = [];
    const promotionEligible: TeacherProfile[] = [];

    const filterStart = getHour(selectedTime);
    const filterEnd = filterStart + duration;

    allTeachers.forEach(teacher => {
      // Sector Filter Check
      if (sectorFilter !== 'all') {
          const teacherSector = teacher.details?.sector || 'public';
          if (teacherSector !== sectorFilter) return;
      }

      // Check promotion eligibility
      const promo = checkPromotionEligibility(teacher.details, promotionYear);
      if (promo.eligible) {
          promotionEligible.push(teacher);
      }

      // Check attendance/leave status
      const activeLicense = isTeacherOnLeave(teacher.id, selectedDate);
      if (activeLicense) {
        onLeave.push(teacher);
        return;
      }

      const isWorking = teacher.sessions.some(session => {
        if (session.day !== currentDayLabel) return false;
        const sStart = getHour(session.startTime);
        const sEnd = getHour(session.endTime);
        return sStart < filterEnd && sEnd > filterStart;
      });

      if (isWorking) working.push(teacher);
      else available.push(teacher);
    });

    return { working, available, onLeave, promotionEligible };
  }, [selectedDate, currentDayLabel, selectedTime, duration, allTeachers, allLicenses, promotionYear, sectorFilter]);

  const displayTeachers = useMemo(() => {
    switch (activeFilter) {
      case 'working': return filteredData.working;
      case 'available': return filteredData.available;
      case 'leave': return filteredData.onLeave;
      case 'promotion': return filteredData.promotionEligible;
      default: return [...filteredData.working, ...filteredData.available, ...filteredData.onLeave];
    }
  }, [activeFilter, filteredData]);

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
  };

  const weekDays = useMemo(() => {
    const startOfWeek = getStartOfWeek(new Date(selectedDate));
    return Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      return {
        date: iso,
        dayName: JS_DAY_MAP[d.getDay()],
        shortDate: `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`
      };
    });
  }, [selectedDate]);

  const changeWeek = (weeks: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (weeks * 7));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const currentWeekStart = useMemo(() => {
    const start = getStartOfWeek(new Date(selectedDate));
    return start.toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' });
  }, [selectedDate]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB Limit
        setBrandingMsg({ type: 'error', text: 'حجم الصورة كبير جداً (الأقصى 1 ميجابايت)' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempLogoUrl(reader.result as string);
        setBrandingMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandingLoading(true);
    setBrandingMsg(null);
    try {
        await setDoc(doc(db, 'settings', 'branding'), {
            ministry_logo_url: tempLogoUrl,
            updated_at: new Date().toISOString()
        }, { merge: true });
        setMinistryLogoUrl(tempLogoUrl);
        setBrandingMsg({ type: 'success', text: 'تم تحديث الشعار بنجاح' });
    } catch (err: any) {
        console.error("Error updating branding:", err);
        setBrandingMsg({ type: 'error', text: 'فشل تحديث الشعار' });
    } finally {
        setBrandingLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPasswordMsg({type: 'error', text: 'كلمتا المرور غير متطابقتين'}); return; }
    if (!auth.currentUser) return;
    try {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordMsg({type: 'success', text: 'تم التحديث بنجاح'}); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) {
        setPasswordMsg({type: 'error', text: error.message});
    }
  };

  const handleInvite = () => {
    const message = encodeURIComponent(
        "السلام عليكم،\n\nالمرجو من السادة الأساتذة إنشاء حساب جديد في المنصة الرقمية الخاصة بأساتذة التربية البدنية والرياضية، وملء البطاقة المهنية وجدول الحصص بدقة عبر الرابط التالي:\n\nhttps://plateforme-prof-eps.netlify.app/"
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleDownloadExcel = () => {
    // Determine which list to export based on filter
    const listToExport = displayTeachers;
    const sheetName = activeFilter === 'promotion' ? `Promotions_${promotionYear}` : 'Teachers';

    const data = listToExport.map(teacher => {
        const promo = checkPromotionEligibility(teacher.details, promotionYear);
        return {
            id: teacher.id,
            fullName: teacher.name,
            employeeId: teacher.details?.paymentId || '',
            rank: teacher.details?.rank || '',
            recruitmentDate: teacher.details?.recruitmentDate || '',
            tenureDate: teacher.details?.tenureDate || '',
            eligibleForPromo: promo.eligible ? 'نعم' : 'لا',
            nextRank: promo.nextRank || '',
            institution: teacher.details?.institution || '',
            sector: teacher.details?.sector === 'private' ? 'خصوصي' : 'عمومي'
        };
    });

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, sheetName);
    writeFile(wb, `${sheetName}.xlsx`);
  };

  // --- Delete Teacher Logic ---
  const handleRequestDelete = (e: React.MouseEvent, teacherId: string) => {
      e.stopPropagation();
      setDeleteModalState({ isOpen: true, teacherId });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalState.teacherId) return;
    const teacherId = deleteModalState.teacherId;
    
    // Close modal first
    setDeleteModalState({ isOpen: false, teacherId: null });
    
    setLoading(true);
    try {
        const batch = writeBatch(db);

        // 1. Delete Timetable Sessions
        const sessionsQ = query(collection(db, 'timetable_sessions'), where('user_id', '==', teacherId));
        const sessionsSnap = await getDocs(sessionsQ);
        sessionsSnap.forEach(doc => batch.delete(doc.ref));
        
        // 2. Delete Licenses
        const licensesQ = query(collection(db, 'licenses'), where('user_id', '==', teacherId));
        const licensesSnap = await getDocs(licensesQ);
        licensesSnap.forEach(doc => batch.delete(doc.ref));
        
        // 3. Delete Teacher Details
        batch.delete(doc(db, 'teacher_details', teacherId));
        
        // 4. Delete Profile
        batch.delete(doc(db, 'profiles', teacherId));

        await batch.commit();

        // Update local state
        setAllTeachers(prev => prev.filter(t => t.id !== teacherId));
        // alert("تم حذف الأستاذ وجميع بياناته بنجاح.");

    } catch (err: any) {
        console.error("Error deleting teacher:", err);
        if (err.message?.includes('Missing or insufficient permissions')) {
            handleFirestoreError(err, OperationType.DELETE, 'teacher_details or profiles');
        }
        alert("حدث خطأ أثناء عملية الحذف. المرجو المحاولة مرة أخرى.");
    } finally {
        setLoading(false);
    }
  };

  // --- Inspector Editing Logic (Local First) ---
  
  const handleInspectorToggleSlot = (day: DayOfWeek, startTime: string) => {
      const idx = modifiedSessions.findIndex(s => s.day === day && s.startTime === startTime);
      let newSessions = [...modifiedSessions];
      
      if (idx >= 0) {
          // Remove locally
          newSessions = newSessions.filter((_, i) => i !== idx);
      } else {
          // Add locally
          const [h, m] = startTime.split(':').map(Number);
          const endTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          
          // Auto-fill ASS for green slots
          let defaultClassName = "";
          const institution = viewingTeacher?.details?.institution || "";
          const hStart = parseInt(startTime.split(':')[0]);
          
          if (institution.includes('الإعدادية')) {
            // Middle School: Wed & Fri 15h, 16h
            if ((day === DayOfWeek.WEDNESDAY || day === DayOfWeek.FRIDAY) && (hStart === 15 || hStart === 16)) {
                defaultClassName = "ASS";
            }
          } else if (institution.includes('التأهيلية')) {
            // High School: Fri 15h, 16h, 17h
            if (day === DayOfWeek.FRIDAY && (hStart === 15 || hStart === 16 || hStart === 17)) {
                defaultClassName = "ASS";
            }
          }

          newSessions.push({ 
              id: `temp-${Date.now()}`, // Temp ID
              day, 
              startTime, 
              endTime, 
              subject: "التربية البدنية", 
              className: defaultClassName, 
              room: "", 
              color: 'bg-indigo-600' 
          });
      }
      setModifiedSessions(newSessions);
      setHasChanges(true);
  };

  const handleInspectorEditSlotRequest = (day: DayOfWeek, startTime: string) => {
    const existing = modifiedSessions.find(s => s.day === day && s.startTime === startTime);
    setEditModalState({
      isOpen: true,
      day,
      time: startTime,
      initialClassName: existing?.className || ''
    });
  };

  const handleInspectorSaveSlot = (className: string) => {
    const { day, time } = editModalState;
    let newSessions = [...modifiedSessions];
    const existing = newSessions.find(s => s.day === day && s.startTime === time);

    if (existing) {
        const idx = newSessions.findIndex(s => s.day === day && s.startTime === time);
        newSessions[idx] = { ...existing, className: className };
    } else {
        const [h, m] = time.split(':').map(Number);
        const endTime = `${(h+1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        newSessions.push({ 
             id: `temp-${Date.now()}`,
             day, 
             startTime: time, 
             endTime, 
             subject: "التربية البدنية", 
             className: className, 
             room: "", 
             color: 'bg-indigo-600' 
        });
    }

    setModifiedSessions(newSessions);
    setHasChanges(true);
  };

  // Save DETAILS to DB
  const handleSaveTeacherDetails = async () => {
    if (!viewingTeacher) return;
    setIsSaving(true);
    setSaveStatus(null);
    
    try {
        const updates = {
            id: viewingTeacher.id,
            full_name: editedDetails.fullName,
            payment_id: editedDetails.paymentId || null,
            recruitment_date: editedDetails.recruitmentDate || null,
            tenure_date: editedDetails.tenureDate || null,
            last_promotion_date: editedDetails.lastPromotionDate || null,
            grade_date: editedDetails.gradeDate || null,
            genre: editedDetails.genre,
            framework: editedDetails.framework,
            institution: editedDetails.institution,
            subject: editedDetails.subject,
            grade: editedDetails.grade,
            rank: editedDetails.rank,
            last_inspection_score: editedDetails.lastInspectionScore,
            last_inspection_date: editedDetails.lastInspectionDate || null,
            inspector_name: editedDetails.inspectorName,
            sector: editedDetails.sector
        };

        await setDoc(doc(db, 'teacher_details', viewingTeacher.id), updates, { merge: true });
        
        // Update profile name as well if changed
        if (editedDetails.fullName !== viewingTeacher.name) {
             await updateDoc(doc(db, 'profiles', viewingTeacher.id), { full_name: editedDetails.fullName });
        }

        // Update local state
        const updatedTeacher = {
            ...viewingTeacher,
            name: editedDetails.fullName,
            details: { ...viewingTeacher.details, ...editedDetails }
        };
        
        setAllTeachers(prev => prev.map(t => t.id === viewingTeacher.id ? updatedTeacher : t));
        setViewingTeacher(updatedTeacher);
        setIsEditingDetails(false);
        setSaveStatus({ type: 'success', text: "تم حفظ بيانات الأستاذ بنجاح في قاعدة البيانات." });
        
        // Auto-hide success message
        setTimeout(() => setSaveStatus(null), 4000);
        
    } catch (err: any) {
        console.error("Error updating details:", err);
        if (err.message?.includes('Missing or insufficient permissions')) {
            handleFirestoreError(err, OperationType.UPDATE, 'teacher_details or profiles');
        }
        setSaveStatus({ type: 'error', text: `فشل حفظ البيانات. المرجو المحاولة مرة أخرى.` });
    } finally {
        setIsSaving(false);
    }
  };

  // Save SESSIONS to DB
  const handleSaveChangesToDB = async () => {
    if (!viewingTeacher) return;
    setIsSaving(true);
    setSaveStatus(null);
    const userId = viewingTeacher.id;

    try {
        const batch = writeBatch(db);
        const q = query(collection(db, 'timetable_sessions'), where('user_id', '==', userId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            batch.delete(doc.ref);
        });
        
        if (modifiedSessions.length > 0) {
            modifiedSessions.forEach(s => {
                const newRef = doc(collection(db, 'timetable_sessions'));
                batch.set(newRef, {
                    id: newRef.id,
                    user_id: userId,
                    day: s.day,
                    start_time: s.startTime,
                    end_time: s.endTime,
                    subject: s.subject || 'التربية البدنية',
                    class_name: s.className || '',
                    room: s.room || '',
                    color: s.color || 'bg-indigo-600'
                });
            });
        }
        
        await batch.commit();

        const updatedTeacher = { ...viewingTeacher, sessions: modifiedSessions };
        setAllTeachers(prev => prev.map(t => t.id === userId ? updatedTeacher : t));
        setViewingTeacher(updatedTeacher);
        setHasChanges(false);
        
        setSaveStatus({ type: 'success', text: "تم حفظ جدول الحصص بنجاح." });
        setTimeout(() => setSaveStatus(null), 4000);
        
    } catch (error: any) {
        console.error("Error saving sessions:", error);
        if (error.message?.includes('Missing or insufficient permissions')) {
            handleFirestoreError(error, OperationType.WRITE, 'timetable_sessions');
        }
        setSaveStatus({ type: 'error', text: `حدث خطأ أثناء حفظ الجدول: ${error.message}` });
    } finally {
        setIsSaving(false);
    }
  };

  const handlePromoteTeacher = async () => {
    if (!viewingTeacher?.details?.rank) return;
    
    const currentRank = parseInt(viewingTeacher.details.rank, 10);
    const nextRank = currentRank + 1;
    // Use the promotion year for the effective date (e.g. 2024-12-31 or 2024-09-01 depending on rules, let's assume end of year for safety or today's date if within year)
    const today = new Date().toISOString().split('T')[0];

    if (!window.confirm(`هل أنت متأكد من ترقية الأستاذ ${viewingTeacher.name} إلى الرتبة ${nextRank}؟`)) return;

    setIsSaving(true);
    setSaveStatus(null);
    try {
        await updateDoc(doc(db, 'teacher_details', viewingTeacher.id), {
            rank: nextRank.toString(),
            last_promotion_date: today
        });

        // Update local state
        const updatedDetails = { ...viewingTeacher.details, rank: nextRank.toString(), lastPromotionDate: today };
        const updatedTeacher = { ...viewingTeacher, details: updatedDetails };
        
        setAllTeachers(prev => prev.map(t => t.id === viewingTeacher.id ? updatedTeacher : t));
        setViewingTeacher(updatedTeacher);
        
        // Also update form state if open
        setEditedDetails(prev => ({ ...prev, rank: nextRank.toString(), lastPromotionDate: today }));

        setSaveStatus({ type: 'success', text: `تمت ترقية الأستاذ بنجاح إلى الرتبة ${nextRank}` });
        setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
        console.error("Promotion error:", err);
        if (err.message?.includes('Missing or insufficient permissions')) {
            handleFirestoreError(err, OperationType.UPDATE, 'teacher_details');
        }
        setSaveStatus({ type: 'error', text: "حدث خطأ أثناء الترقية" });
    } finally {
        setIsSaving(false);
    }
  };

  // Helper for rendering inputs
  const renderInput = (key: string, placeholder: string, type = 'text', options?: string[]) => {
    if (options) {
        return (
            <select 
                value={editedDetails[key] || ''}
                onChange={e => setEditedDetails({...editedDetails, [key]: e.target.value})}
                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                dir="auto"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        )
    }
    return (
        <input 
            type={type}
            value={editedDetails[key] || ''}
            onChange={e => setEditedDetails({...editedDetails, [key]: e.target.value})}
            placeholder={placeholder}
            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            dir="auto"
        />
    )
  }

  // Calculate eligibility for current viewing teacher
  const promotionStatus = viewingTeacher ? checkPromotionEligibility(viewingTeacher.details, promotionYear) : { eligible: false, missingTenure: false };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
      <p className="font-bold">جاري تحميل البيانات...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-cairo flex flex-col transition-colors duration-300" dir="rtl">
      
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-md border-b border-gray-200 dark:border-slate-700/50 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 min-h-[4rem] py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-shrink-0">
             <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/20"><GraduationCap className="h-5 w-5 text-white" /></div>
             <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold leading-none tracking-tight truncate">فضاء التفتيش</h1>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1 font-medium truncate hidden sm:block">نظام تتبع الأداء التربوي الرقمي</p>
             </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
             <button onClick={handleInvite} className="hidden md:flex items-center gap-2 p-2 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/30 transition-all"><MessageCircle className="h-4 w-4" /><span className="font-bold text-xs">دعوة</span></button>
             <button onClick={handleInvite} className="md:hidden p-2 rounded-xl bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800/30 transition-all"><MessageCircle className="h-4 w-4" /></button>
             <button onClick={handleDownloadExcel} className="hidden md:flex items-center gap-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30 transition-all"><Download className="h-4 w-4" /><span className="font-bold text-xs">تصدير</span></button>
             <button onClick={handleDownloadExcel} className="md:hidden p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30 transition-all"><Download className="h-4 w-4" /></button>
             <button onClick={onThemeToggle} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-all border border-gray-200 dark:border-slate-600/50">{currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
             <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300 transition-all border border-gray-200 dark:border-slate-600/50"><Settings className="h-4 w-4" /></button>
             <button onClick={onLogout} className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700/50 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all border border-gray-200 dark:border-slate-600/50"><LogOut className="h-4 w-4 transform rotate-180" /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Step 1: Day & Time Selector */}
        <section className="bg-white dark:bg-slate-800/40 rounded-3xl border border-gray-200 dark:border-slate-700/50 p-4 sm:p-6 mb-6 shadow-sm dark:shadow-xl transition-colors">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
             <div className="flex items-center gap-3 self-start md:self-auto">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg"><Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /></div>
                <h2 className="text-lg sm:text-xl font-bold">1. التحكم في الفترة الزمنية</h2>
             </div>
             <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-900/50 p-1.5 sm:p-2 rounded-2xl border border-gray-200 dark:border-slate-700/30 w-full md:w-auto justify-between md:justify-start">
                <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400 transition-colors"><ChevronRight className="h-5 w-5" /></button>
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 px-4 border-x border-gray-200 dark:border-slate-700">أسبوع: {currentWeekStart}</div>
                <button onClick={() => changeWeek(1)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg text-gray-500 dark:text-slate-400 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
             </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-6">
            {weekDays.map((wd) => (
              <button key={wd.date} onClick={() => setSelectedDate(wd.date)} className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border ${selectedDate === wd.date ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/20 text-white' : 'bg-white dark:bg-slate-700/40 border-gray-200 dark:border-slate-600/50 hover:border-indigo-300 dark:hover:border-slate-500 text-gray-500 dark:text-slate-400'}`}>
                <span className={`text-xs sm:text-sm font-bold mb-1 ${selectedDate === wd.date ? 'text-white' : 'text-gray-800 dark:text-slate-200'}`}>{wd.dayName}</span>
                <span className={`text-[9px] sm:text-[10px] font-medium opacity-60 ${selectedDate === wd.date ? 'text-white' : 'text-gray-400 dark:text-slate-400'}`}>{wd.shortDate}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
             <div className="flex gap-3 w-full lg:w-auto">
                <button onClick={() => { setPeriod('morning'); setSelectedTime("08:00"); setDuration(4); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold transition-all border text-sm ${period === 'morning' ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-md shadow-amber-500/10' : 'bg-white dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600'}`}>
                  <Sun className={`h-4 w-4 ${period === 'morning' ? 'text-amber-600' : 'text-gray-400 dark:text-slate-500'}`} /> صباح
                </button>
                <button onClick={() => { setPeriod('evening'); setSelectedTime("14:00"); setDuration(4); }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold transition-all border text-sm ${period === 'evening' ? 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-md shadow-indigo-500/10' : 'bg-white dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600'}`}>
                  <Moon className={`h-4 w-4 ${period === 'evening' ? 'text-indigo-600' : 'text-gray-400 dark:text-slate-500'}`} /> مساء
                </button>
             </div>
             <div className="flex gap-3 w-full lg:w-auto">
                <div className="flex-1 lg:w-40">
                   <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                      {TIME_SLOTS.slice(0, -1).map(t => <option key={t} value={t}>بداية: {t}</option>)}
                   </select>
                </div>
                <div className="flex-1 lg:w-32">
                   <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                      {[1,2,3,4,5,6].map(d => <option key={d} value={d}>المدة: {d} سا</option>)}
                   </select>
                </div>
             </div>
          </div>
        </section>

        {/* Step 2: Results Section */}
        <section className="bg-white dark:bg-slate-800/40 rounded-3xl border border-gray-200 dark:border-slate-700/50 overflow-hidden shadow-sm dark:shadow-xl transition-colors">
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-700/50 flex flex-col items-start gap-4">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg"><ClipboardList className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /></div>
                    <div>
                    <h2 className="text-lg sm:text-xl font-bold">2. حالة الأساتذة</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-500 font-medium mt-1">{currentDayLabel} - {selectedTime} ({duration}h)</p>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {/* Sector Filter */}
                    <div className="flex items-center bg-gray-50 dark:bg-slate-900/60 p-1 rounded-xl border border-gray-200 dark:border-slate-700/50">
                        <button onClick={() => setSectorFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sectorFilter === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>الكل</button>
                        <button onClick={() => setSectorFilter('public')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${sectorFilter === 'public' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-blue-600'}`}><Building2 className="h-3 w-3"/> عمومي</button>
                        <button onClick={() => setSectorFilter('private')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${sectorFilter === 'private' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-gray-500 hover:text-purple-600'}`}><Briefcase className="h-3 w-3"/> خصوصي</button>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-slate-900/60 p-1 rounded-2xl border border-gray-200 dark:border-slate-700/50 overflow-x-auto no-scrollbar w-full sm:w-auto">
                        <button onClick={() => setActiveFilter('all')} className={`flex-1 md:flex-none px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeFilter === 'all' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200'}`}>الكل ({allTeachers.length})</button>
                        <button onClick={() => setActiveFilter('working')} className={`flex-1 md:flex-none px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeFilter === 'working' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200'}`}>في المؤسسة ({filteredData.working.length})</button>
                        <button onClick={() => setActiveFilter('available')} className={`flex-1 md:flex-none px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeFilter === 'available' ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200'}`}>خارج ({filteredData.available.length})</button>
                        <button onClick={() => setActiveFilter('leave')} className={`flex-1 md:flex-none px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${activeFilter === 'leave' ? 'bg-red-600 text-white shadow-sm' : 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-slate-200'}`}>رخصة ({filteredData.onLeave.length})</button>
                        
                        {/* Promotion Filter */}
                        <div className={`flex items-center gap-1 flex-1 md:flex-none rounded-xl px-1 py-1 transition-all whitespace-nowrap border ${activeFilter === 'promotion' ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700' : 'border-transparent'}`}>
                            <input 
                                type="number" 
                                value={promotionYear} 
                                onChange={(e) => setPromotionYear(parseInt(e.target.value))} 
                                className="w-12 bg-white dark:bg-slate-800 rounded-lg px-1 py-1 text-[10px] font-bold text-center outline-none border border-gray-200 dark:border-slate-600"
                            />
                            <button onClick={() => setActiveFilter('promotion')} className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 ${activeFilter === 'promotion' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-slate-400 hover:text-indigo-600'}`}>
                                <TrendingUp className="h-3 w-3" />
                                الترقية ({filteredData.promotionEligible.length})
                            </button>
                        </div>
                    </div>
                </div>
             </div>
             
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {displayTeachers.map((teacher) => {
                const activeLicense = isTeacherOnLeave(teacher.id, selectedDate);
                const isOnLeave = !!activeLicense;
                const isWorking = filteredData.working.some(t => t.id === teacher.id);
                // Check if eligible for promotion indicator in card
                const promo = checkPromotionEligibility(teacher.details, promotionYear);
                const isPrivate = teacher.details?.sector === 'private';

                return (
                  <div key={teacher.id} onClick={() => handleOpenTeacher(teacher)} className={`group bg-white dark:bg-slate-800/80 border ${isOnLeave ? 'border-red-200 dark:border-red-900/50 bg-red-50/10' : 'border-gray-200 dark:border-slate-700/50'} rounded-3xl p-4 sm:p-5 hover:border-indigo-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer relative overflow-hidden`}>
                     
                     {/* Sector Badge */}
                     <div className={`absolute top-4 left-4 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${isPrivate ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'}`}>
                         {isPrivate ? <Briefcase className="h-3 w-3"/> : <Building2 className="h-3 w-3"/>}
                         {isPrivate ? 'خصوصي' : 'عمومي'}
                     </div>

                     {/* Delete Button */}
                     <button 
                        onClick={(e) => handleRequestDelete(e, teacher.id)}
                        className="absolute top-4 right-4 p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 dark:text-red-400 rounded-lg transition-colors z-20"
                        title="حذف الأستاذ"
                     >
                        <Trash2 className="h-4 w-4" />
                     </button>

                     <div className="flex items-center gap-4 mt-8 sm:mt-0">
                        <div className="relative flex-shrink-0">
                           <img src={teacher.avatarUrl} className={`h-14 w-14 sm:h-16 sm:w-16 rounded-3xl object-cover border-2 transition-all ${isOnLeave ? 'border-red-500 grayscale brightness-90' : 'border-gray-200 dark:border-slate-700 group-hover:border-indigo-400'}`} alt="" />
                           <div className={`absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-lg border-2 border-white dark:border-slate-800 shadow-sm ${isOnLeave ? 'bg-red-500 animate-pulse' : (isWorking ? 'bg-amber-500' : 'bg-emerald-500')}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                           <h3 className="font-bold text-gray-900 dark:text-slate-100 truncate text-base sm:text-lg">{teacher.name}</h3>
                           <p className="text-xs text-gray-500 dark:text-slate-500 font-medium truncate mt-0.5">{teacher.details?.institution || 'بدون مؤسسة'}</p>
                           <div className="mt-2.5 flex items-center gap-2">
                              {isOnLeave ? (
                                <div className="flex flex-col items-start gap-1">
                                    <span className="bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-red-500/20 flex items-center gap-1"><Plane className="h-3 w-3"/> في رخصة</span>
                                    {activeLicense?.reason && <span className="text-[10px] text-red-500/80 truncate max-w-[150px] px-1" title={activeLicense.reason}>{activeLicense.reason}</span>}
                                </div>
                              ) : (isWorking ? (
                                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-amber-500/20 flex items-center gap-1"><Building className="h-3 w-3"/> في المؤسسة</span>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1"><Check className="h-3 w-3"/> خارج المؤسسة</span>
                              ))}

                              {promo.eligible && (
                                <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-indigo-500/20 flex items-center gap-1 animate-pulse">
                                    <TrendingUp className="h-3 w-3"/> يستحق ترقية {promotionYear}
                                </span>
                              )}
                              
                              {promo.missingTenure && (
                                <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-orange-500/20 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3"/> {promo.field === 'recruitmentDate' ? 'تاريخ التوظيف مفقود' : 'تاريخ الترسيم مفقود'}
                                </span>
                              )}
                           </div>
                        </div>
                        <div className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700/30 text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity absolute left-4 top-1/2 -translate-y-1/2"><ChevronLeft className="h-5 w-5" /></div>
                     </div>
                  </div>
                );
              })}
              {displayTeachers.length === 0 && (
                <div className="col-span-full py-20 text-center">
                   <div className="inline-flex items-center justify-center p-6 rounded-full bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 mb-4"><Filter className="h-10 w-10 text-gray-300 dark:text-slate-600" /></div>
                   <h3 className="text-xl font-bold text-gray-400 dark:text-slate-400">لا توجد نتائج للمرشحات الحالية</h3>
                   <p className="text-sm text-gray-400 dark:text-slate-600 mt-2">جرب تغيير اليوم أو الفترة الزمنية أو نوع الفلتر</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Teacher Detail Modal (Normal View - Single Page) */}
      {viewingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/90 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-4xl shadow-2xl border border-gray-200 dark:border-slate-700/50 overflow-hidden animate-in fade-in zoom-in duration-300 transition-colors max-h-[90vh] overflow-y-auto no-scrollbar relative flex flex-col">
                
                {/* Modal Header */}
                <div className="px-8 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur z-10 border-b border-gray-100 dark:border-slate-700/50 flex-shrink-0">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">بطاقة الأستاذ</h2>
                    <div className="flex items-center gap-2">
                        {isEditingDetails ? (
                            <>
                                <button onClick={handleSaveTeacherDetails} disabled={isSaving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all text-sm disabled:opacity-50">
                                    <Save className="h-4 w-4" /> حفظ
                                </button>
                                <button onClick={() => setIsEditingDetails(false)} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all text-sm">
                                    إلغاء
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditingDetails(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30 rounded-xl font-bold transition-all text-sm">
                                <Edit className="h-4 w-4" /> تعديل البيانات
                            </button>
                        )}
                        <button onClick={handleCloseTeacher} className="p-2 bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-slate-400 transition-all">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <div className="p-8 flex-1 overflow-y-auto">
                   
                   {/* Notification Area */}
                   {saveStatus && (
                       <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${saveStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                           {saveStatus.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                           <p className="font-bold">{saveStatus.text}</p>
                       </div>
                   )}

                   {/* Promotion Alert Banner */}
                   {promotionStatus.eligible && !isEditingDetails && (
                       <div className="mb-6 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                           <div className="flex items-center gap-3">
                               <div className="bg-indigo-100 dark:bg-indigo-800 p-2 rounded-full">
                                   <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                               </div>
                               <div>
                                   <h4 className="font-bold text-indigo-900 dark:text-indigo-200">الأستاذ يستحق الترقية برسم سنة {promotionYear}!</h4>
                                   <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                       استوفى الأقدمية المطلوبة ({promotionStatus.requiredYears} سنوات) للمرور إلى الرتبة {promotionStatus.nextRank}.
                                   </p>
                               </div>
                           </div>
                           <button 
                               onClick={handlePromoteTeacher}
                               disabled={isSaving}
                               className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                           >
                               <Check className="h-4 w-4" /> المصادقة على الترقية
                           </button>
                       </div>
                   )}
                   
                   {/* Missing Tenure Alert Banner */}
                   {promotionStatus.missingTenure && !isEditingDetails && (
                       <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                           <div className="flex items-center gap-3">
                               <div className="bg-orange-100 dark:bg-orange-800 p-2 rounded-full">
                                   <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                               </div>
                               <div>
                                   <h4 className="font-bold text-orange-900 dark:text-orange-200">معلومات الترقية ناقصة</h4>
                                   <p className="text-sm text-orange-700 dark:text-orange-300">
                                       {promotionStatus.field === 'recruitmentDate' ? 'تاريخ التوظيف' : 'تاريخ الترسيم'} مفقود. يرجى إضافته لحساب الترقية.
                                   </p>
                               </div>
                           </div>
                           <button 
                               onClick={() => setIsEditingDetails(true)}
                               className="px-5 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white text-sm font-bold rounded-xl transition-all"
                           >
                               تعديل البيانات
                           </button>
                       </div>
                   )}

                   {/* Profile Header */}
                   <div className="flex flex-col md:flex-row items-center gap-8 mb-8 bg-gray-50 dark:bg-slate-900/60 rounded-[2.5rem] p-8 border border-gray-200 dark:border-slate-700/50">
                        <div className="relative">
                             <img src={viewingTeacher.avatarUrl} className="h-32 w-32 rounded-full object-cover border-4 border-indigo-500 shadow-xl shadow-indigo-500/20" alt="" />
                        </div>
                        <div className="text-center md:text-right flex-1 w-full">
                            {isEditingDetails ? (
                                <div className="space-y-3 w-full max-w-md mx-auto md:mx-0">
                                    <input type="text" value={editedDetails.fullName} onChange={e => setEditedDetails({...editedDetails, fullName: e.target.value})} className="w-full text-2xl font-black text-center md:text-right bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="الاسم الكامل" />
                                    <input type="text" value={editedDetails.subject} onChange={e => setEditedDetails({...editedDetails, subject: e.target.value})} className="w-full text-lg font-bold text-center md:text-right bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="المادة" />
                                    <input type="text" value={editedDetails.institution} onChange={e => setEditedDetails({...editedDetails, institution: e.target.value})} className="w-full text-sm font-medium text-center md:text-right bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" placeholder="المؤسسة" />
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{viewingTeacher.name}</h3>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg mb-2">{viewingTeacher.details?.subject || 'التربية البدنية والرياضية'}</p>
                                    <p className="text-gray-500 dark:text-slate-500 font-medium text-sm flex items-center justify-center md:justify-start gap-2">
                                        <Building className="h-4 w-4" />
                                        {viewingTeacher.details?.institution || '---'}
                                    </p>
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-2 ${viewingTeacher.details?.sector === 'private' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                                        {viewingTeacher.details?.sector === 'private' ? <Briefcase className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                        {viewingTeacher.details?.sector === 'private' ? 'قطاع خصوصي' : 'قطاع عمومي'}
                                    </div>
                                </>
                            )}
                        </div>
                   </div>

                   {/* Admin Details Grid */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                       <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-200 dark:border-slate-700/30">
                           <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">PPR</span>
                           {isEditingDetails ? renderInput('paymentId', 'رقم التأجير') : <span className="font-black text-gray-900 dark:text-white dir-ltr block">{viewingTeacher.details?.paymentId || '---'}</span>}
                       </div>
                       
                       <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-200 dark:border-slate-700/30">
                           <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">الجنس</span>
                           {isEditingDetails ? (
                                <select 
                                    value={editedDetails.genre || 'male'}
                                    onChange={e => setEditedDetails({...editedDetails, genre: e.target.value})}
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="male">ذكر</option>
                                    <option value="female">أنثى</option>
                                </select>
                           ) : (
                               <span className="font-black text-gray-900 dark:text-white block">
                                   {viewingTeacher.details?.genre === 'female' ? 'أنثى' : 'ذكر'}
                               </span>
                           )}
                       </div>
                       
                        <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-200 dark:border-slate-700/30 md:col-span-2">
                           <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">القطاع</span>
                           {isEditingDetails ? (
                                <select 
                                    value={editedDetails.sector || 'public'}
                                    onChange={e => setEditedDetails({...editedDetails, sector: e.target.value})}
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-xs sm:text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="public">عمومي</option>
                                    <option value="private">خصوصي</option>
                                </select>
                           ) : (
                               <span className={`font-black block ${viewingTeacher.details?.sector === 'private' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                   {viewingTeacher.details?.sector === 'private' ? 'خصوصي' : 'عمومي'}
                               </span>
                           )}
                       </div>

                       <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-200 dark:border-slate-700/30 md:col-span-2">
                           <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">الإطار</span>
                           {isEditingDetails ? renderInput('framework', 'الإطار', 'text', ['أستاذ التعليم الثانوي التأهيلي', 'أستاذ التعليم الثانوي الإعدادي', 'أستاذ التعليم الابتدائي (تكليف)']) : (
                               <span className="font-black text-gray-900 dark:text-white block truncate" title={viewingTeacher.details?.framework}>
                                   {viewingTeacher.details?.framework || '---'}
                               </span>
                           )}
                       </div>

                       {/* Grade and Grade Date */}
                       <div className="bg-gray-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-gray-200 dark:border-slate-700/30 md:col-span-2 grid grid-cols-2 gap-2">
                           <div>
                               <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">الدرجة</span>
                               {isEditingDetails ? renderInput('grade', 'الدرجة', 'text', ['الدرجة الثانية', 'الدرجة الأولى', 'الدرجة الممتازة']) : (
                                   <span className="font-black text-gray-900 dark:text-white block">
                                       {viewingTeacher.details?.grade || '---'}
                                   </span>
                               )}
                           </div>
                           <div>
                               <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">تاريخ الدرجة</span>
                               {isEditingDetails ? renderInput('gradeDate', '', 'date') : (
                                   <span className="font-black text-gray-900 dark:text-white block">
                                       {viewingTeacher.details?.gradeDate || '---'}
                                   </span>
                               )}
                           </div>
                       </div>

                       {/* Rank and Rank Date */}
                       <div className={`p-4 rounded-2xl border transition-all md:col-span-2 grid grid-cols-2 gap-2 ${promotionStatus.eligible ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700' : 'bg-gray-50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-700/30'}`}>
                           <div>
                                <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">الرتبة</span>
                                {isEditingDetails ? renderInput('rank', 'الرتبة') : <span className="font-black text-gray-900 dark:text-white block">{viewingTeacher.details?.rank || '---'}</span>}
                           </div>
                           <div>
                                <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">تاريخ الرتبة</span>
                                {isEditingDetails ? renderInput('lastPromotionDate', '', 'date') : <span className="font-black text-gray-900 dark:text-white block">{viewingTeacher.details?.lastPromotionDate || '---'}</span>}
                           </div>
                       </div>
                       
                        <div className={`p-4 rounded-2xl border transition-all ${promotionStatus.missingTenure ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-gray-50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-700/30'} md:col-span-2`}>
                           <span className="text-xs text-gray-500 dark:text-slate-400 font-bold block mb-1">تاريخ الترسيم</span>
                           {isEditingDetails ? renderInput('tenureDate', '', 'date') : <span className="font-black text-gray-900 dark:text-white block">{viewingTeacher.details?.tenureDate || '---'}</span>}
                       </div>

                       <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 md:col-span-2">
                           <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mb-1">نقطة التفتيش</span>
                           {isEditingDetails ? (
                               <div className="space-y-1">
                                   {renderInput('lastInspectionScore', 'النقطة', 'number')}
                                   {renderInput('lastInspectionDate', '', 'date')}
                               </div>
                           ) : (
                               <>
                                   <span className="font-black text-emerald-700 dark:text-emerald-300 block text-lg">
                                       {viewingTeacher.details?.lastInspectionScore || '--'}/20
                                   </span>
                                   <span className="text-[10px] text-emerald-600/70 block mt-1">
                                       {viewingTeacher.details?.lastInspectionDate || ''}
                                   </span>
                               </>
                           )}
                       </div>
                   </div>

                   {/* Timetable Section */}
                   <div className="border-t border-gray-200 dark:border-slate-700 pt-8">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                <Calendar className="h-6 w-6 text-indigo-500" />
                                جدول الحصص الأسبوعي
                            </h4>
                            <p className="text-xs text-gray-500 font-medium">يمكنك تعديل الجدول بالضغط على الحصص</p>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-200 dark:border-slate-700/50 p-2 sm:p-4 mb-4">
                            <TimetableGrid 
                                sessions={modifiedSessions}
                                onToggleSlot={handleInspectorToggleSlot}
                                onEditSlot={handleInspectorEditSlotRequest}
                                institution={viewingTeacher.details?.institution || ''}
                            />
                        </div>
                   </div>
                </div>

                {/* Modal Footer with Save Button */}
                {hasChanges && (
                    <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
                        <button 
                            onClick={handleSaveChangesToDB}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-95"
                        >
                            <Save className="h-5 w-5" />
                            {isSaving ? 'جاري الحفظ...' : 'حفظ جدول الحصص'}
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal 
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, teacherId: null })}
        onConfirm={handleConfirmDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من رغبتك في حذف هذا الأستاذ نهائياً من المنصة؟ سيتم حذف جميع البيانات الشخصية وجداول الحصص ولا يمكن التراجع عن هذه العملية."
      />

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
              <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl border border-gray-200 dark:border-slate-700 animate-in zoom-in duration-200 transition-colors my-auto">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900 dark:text-slate-100"><Settings className="h-6 w-6 text-indigo-500" /> إعدادات المنصة</h3>
                      <button onClick={() => { setShowSettings(false); setBrandingMsg(null); setPasswordMsg(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-slate-400"><X className="h-6 w-6" /></button>
                  </div>
                  
                  <div className="space-y-8">
                      {/* Access Code Section */}
                      <section className="space-y-4">
                          <h4 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Lock className="h-4 w-4" /> كود الانتساب
                          </h4>
                          <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                              <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-3 font-medium text-center leading-relaxed">
                                  قم بإعطاء هذا الكود للأساتذة الجدد لكي يتمكنوا من ربط حساباتهم بحسابك تلقائياً.
                              </p>
                              <div className="flex items-center justify-center gap-3">
                                  <div className="flex-1 bg-white dark:bg-slate-900 px-6 py-3 rounded-xl border border-indigo-200 dark:border-indigo-700 font-mono text-2xl font-black tracking-[0.2em] text-center text-indigo-600 dark:text-indigo-400">
                                      {inspectorCode || 'جاري التوليد...'}
                                  </div>
                                  <button 
                                      type="button"
                                      onClick={() => { if(inspectorCode) { navigator.clipboard.writeText(inspectorCode); alert('تم نسخ الكود!'); } }}
                                      className="p-3.5 bg-indigo-600 outline-none text-white rounded-xl hover:bg-indigo-700 hover:shadow-lg transition flex items-center justify-center shrink-0"
                                      title="نسخ الكود"
                                  >
                                      <ClipboardList className="h-6 w-6" />
                                  </button>
                              </div>
                          </div>
                      </section>

                      {/* Branding Section */}
                      <section className="space-y-4">
                          <h4 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Building2 className="h-4 w-4" /> هوية المنصة
                          </h4>
                          <form onSubmit={handleUpdateBranding} className="space-y-4">
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-gray-500 dark:text-slate-500 mb-2 block mr-1">شعار الوزارة (صورة)</label>
                                  <div className="flex flex-col gap-3">
                                      <input 
                                          type="file" 
                                          id="logo-upload"
                                          accept="image/*"
                                          onChange={handleLogoUpload}
                                          className="hidden"
                                      />
                                      <label 
                                          htmlFor="logo-upload"
                                          className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-600 dark:text-slate-400 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/30 transition-all"
                                      >
                                          <Upload className="h-5 w-5" />
                                          إختيار صورة من الجهاز
                                      </label>
                                      
                                      <div className="relative group">
                                          <input 
                                            type="url" 
                                            placeholder="أو ضع رابط خارجي هنا..."
                                            value={tempLogoUrl} 
                                            onChange={e => setTempLogoUrl(e.target.value)} 
                                            className="w-full px-5 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-[10px] font-bold text-gray-400 dark:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                          />
                                      </div>
                                  </div>
                              </div>
                              {tempLogoUrl && (
                                  <div className="relative group flex justify-center p-6 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 shadow-inner">
                                      <img src={tempLogoUrl} alt="Preview" className="h-20 object-contain drop-shadow-md" referrerPolicy="no-referrer" />
                                      <button 
                                        type="button"
                                        onClick={() => setTempLogoUrl('')}
                                        className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <X className="h-4 w-4" />
                                      </button>
                                  </div>
                              )}
                              {brandingMsg && <div className={`p-4 rounded-xl text-xs font-bold border ${brandingMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>{brandingMsg.text}</div>}
                              <button type="submit" disabled={brandingLoading} className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                                  {brandingLoading ? 'جاري الحفظ...' : 'حفظ الشعار'}
                              </button>
                          </form>
                      </section>

                      <div className="h-px bg-gray-100 dark:bg-slate-700"></div>

                      {/* Password Section */}
                      <section className="space-y-4">
                          <h4 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Lock className="h-4 w-4" /> الأمان
                          </h4>
                          <form onSubmit={handleUpdatePassword} className="space-y-4">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 dark:text-slate-500 mb-2 block mr-1">كلمة المرور الجديدة</label>
                                  <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-5 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 dark:text-slate-500 mb-2 block mr-1">تأكيد كلمة المرور</label>
                                  <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-5 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                              </div>
                              {passwordMsg && <div className={`p-4 rounded-xl text-xs font-bold border ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>{passwordMsg.text}</div>}
                              <button type="submit" className="w-full py-3 bg-gray-900 dark:bg-slate-700 text-white text-sm font-bold rounded-xl hover:bg-black dark:hover:bg-slate-600 transition-all">تحديث كلمة المرور</button>
                          </form>
                      </section>
                  </div>
              </div>
          </div>
      )}

      <EditSlotModal 
        isOpen={editModalState.isOpen} 
        onClose={() => setEditModalState(prev => ({...prev, isOpen: false}))} 
        onSave={handleInspectorSaveSlot}
        day={editModalState.day}
        time={editModalState.time}
        initialClassName={editModalState.initialClassName}
      />

      {/* Footer */}
      <footer className="py-8 bg-white dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800/50 text-center transition-colors">
         <p className="text-sm text-gray-500 dark:text-slate-500 font-bold mb-1">تطوير وبرمجة أمين سنوسي مفتش مادة التربية البدنية والرياضية</p>
         <p className="text-[10px] text-gray-400 dark:text-slate-600 font-medium tracking-widest">© 2026 جميع الحقوق محفوظة - نظام الرقابة التربوية الذكية</p>
      </footer>
    </div>
  );
};

export default InspectorDashboard;

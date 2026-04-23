
import React, { useState, useEffect, useCallback } from 'react';
import { User, ClassSession, DayOfWeek, TeacherDetails, LicenseRecord } from './types';
import Login from './components/Login';
import TimetableGrid from './components/TimetableGrid';
import ConfirmationModal from './components/ConfirmationModal';
import LicenseModal from './components/LicenseModal';
import EditSlotModal from './components/EditSlotModal';
import TeacherProfileForm from './components/TeacherProfileForm';
import AboutModal from './components/AboutModal';
import { LogOut, Calendar, Send, CloudOff, RefreshCw, Edit, Info, Sun, Moon, FileText, CheckSquare, Edit2, Settings, Lock, X, GraduationCap } from 'lucide-react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

type AppMode = 'login' | 'teacher' | 'loading';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [myLicenses, setMyLicenses] = useState<LicenseRecord[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  // Settings & Password State
  const [showSettings, setShowSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Edit Slot Modal State
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    day: DayOfWeek;
    time: string;
    initialClassName: string;
  }>({ isOpen: false, day: DayOfWeek.MONDAY, time: '08:00', initialClassName: '' });
  
  // وظيفة لتحديد الثيم التلقائي بناءً على الوقت
  const getAutoTheme = (): 'light' | 'dark' => {
    const hour = new Date().getHours();
    return (hour >= 19 || hour < 6) ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return getAutoTheme();
    }
    return 'light';
  });

  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // دالة تحميل بيانات المستخدم
  const loadUserData = useCallback(async (userId: string, email: string, metaName?: string) => {
      // Teacher Data
      let profileDoc = null, detailsDoc = null, sessionSnapshot = null, licenseSnapshot = null;
      try {
        profileDoc = await getDoc(doc(db, 'profiles', userId));
        detailsDoc = await getDoc(doc(db, 'teacher_details', userId));
        const sessionsQuery = query(collection(db, 'timetable_sessions'), where('user_id', '==', userId));
        sessionSnapshot = await getDocs(sessionsQuery);
        const licensesQuery = query(collection(db, 'licenses'), where('user_id', '==', userId));
        licenseSnapshot = await getDocs(licensesQuery);
      } catch (error) {
        console.warn("Could not fetch remote data (might be new user or missing rules):", error);
        // Continue with local storage or defaults instead of failing
      }

      const profile = profileDoc?.exists() ? profileDoc.data() : null;
      const detailsData = detailsDoc?.exists() ? detailsDoc.data() : null;
      const sessionData = sessionSnapshot?.docs.map(d => ({ id: d.id, ...d.data() })) || [];
      const licenseData = licenseSnapshot?.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()) || [];
        
      const localDetailsStr = localStorage.getItem(`teacher_details_${userId}`);
      const localAvatarStr = localStorage.getItem(`avatar_${userId}`);
      const localSessionsStr = localStorage.getItem(`sessions_${userId}`);
      const localAssignedClassesStr = localStorage.getItem(`assigned_classes_${userId}`);

      let finalDetails: TeacherDetails | undefined;
      let finalSessions: ClassSession[] = [];
      let assignedClasses: string[] = [];

      if (localAssignedClassesStr) {
          try { assignedClasses = JSON.parse(localAssignedClassesStr); } catch (e) { assignedClasses = []; }
      }

      if (detailsData) {
            finalDetails = { 
              fullName: detailsData.full_name, 
              paymentId: detailsData.payment_id, 
              recruitmentDate: detailsData.recruitment_date,
              tenureDate: detailsData.tenure_date,
              lastPromotionDate: detailsData.last_promotion_date,
              gradeDate: detailsData.grade_date, 
              genre: detailsData.genre, 
              framework: detailsData.framework, 
              institution: detailsData.institution, 
              school: detailsData.institution, 
              subject: detailsData.subject, 
              grade: detailsData.grade, 
              rank: detailsData.rank, 
              lastInspectionScore: detailsData.last_inspection_score, 
              lastInspectionDate: detailsData.last_inspection_date, 
              inspectorName: detailsData.inspector_name,
              inspectorId: detailsData.inspector_id,
              inspectorEmail: detailsData.inspector_email,
              inspectorCode: detailsData.inspector_code,
              assignedClasses: assignedClasses,
              sector: detailsData.sector || 'public' // Default to public if null
          };
          localStorage.setItem(`teacher_details_${userId}`, JSON.stringify(finalDetails));
          setIsOffline(false);
      } else if (localDetailsStr) {
            finalDetails = JSON.parse(localDetailsStr);
            if (finalDetails) finalDetails.assignedClasses = assignedClasses;
            setIsOffline(true);
      } else {
            // Get name fallback from email if displayName is missing
            const emailPrefix = email.split('@')[0];
            const initialName = metaName || profile?.full_name || emailPrefix;
            
            finalDetails = { 
              fullName: initialName, 
              paymentId: '', 
              recruitmentDate: '', 
              tenureDate: '', 
              genre: 'male', 
              framework: '', 
              institution: '', 
              subject: 'التربية البدنية والرياضية', 
              grade: '', 
              rank: '', 
              lastInspectionScore: '', 
              lastInspectionDate: '', 
              inspectorName: '', 
              assignedClasses: [],
              sector: 'public'
          };
      }

      // تحديد الاسم المعروض: الأولوية للتفاصيل المحفوظة، ثم البروفايل، ثم الاسم من التسجيل (metaName)
      const emailPrefix = email.split('@')[0];
      const displayName = finalDetails?.fullName || profile?.full_name || metaName || emailPrefix;
      const displayAvatar = localAvatarStr || profile?.avatar_url || `https://ui-avatars.com/api/?name=${displayName}&background=random`;

      setUser({ id: userId, email: email, name: displayName, avatarUrl: displayAvatar, details: finalDetails });

      if (sessionData && sessionData.length > 0) {
          finalSessions = sessionData.map((s: any) => ({ 
              id: s.id, 
              day: s.day as DayOfWeek, 
              startTime: s.start_time, 
              endTime: s.end_time, 
              subject: s.subject, 
              className: s.class_name, 
              room: s.room, 
              color: s.color 
          }));
          localStorage.setItem(`sessions_${userId}`, JSON.stringify(finalSessions));
      } else if (localSessionsStr) {
          finalSessions = JSON.parse(localSessionsStr);
          if (sessionData && sessionData.length === 0) setIsOffline(true);
      }
      setSessions(finalSessions);

      if (licenseData) {
          setMyLicenses(licenseData.map((l: any) => ({
              id: l.id,
              startDate: l.start_date,
              endDate: l.end_date,
              reason: l.reason
          })));
      }

      setMode('teacher');
  }, []);

  useEffect(() => {
    // Initial Session Check
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            loadUserData(
                user.uid, 
                user.email || '', 
                user.displayName || ''
            );
        } else {
            setMode('login');
            setUser(null);
            setSessions([]);
            setIsOffline(false);
            setShowSettings(false);
            setIsRecoveryMode(false);
        }
    });

    return () => unsubscribe();
  }, [loadUserData]);

  const handleLogout = async () => { 
      await signOut(auth);
      // Ensure local state is reset even if Supabase doesn't trigger event (e.g. local inspector login)
      setMode('login');
      setUser(null);
      setSessions([]);
      setIsOffline(false);
      setShowSettings(false);
      setIsRecoveryMode(false);
  };
  
  // Handler for local admin login bypass
  const handleLocalInspectorLogin = () => {
      setMode('inspector');
      setUser({ 
          id: 'local-inspector-id', 
          email: INSPECTOR_EMAIL, 
          name: 'المفتش التربوي', 
          avatarUrl: `https://ui-avatars.com/api/?name=Inspector&background=10b981&color=fff` 
      });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
        setPasswordMsg({type: 'error', text: 'كلمتا المرور غير متطابقتين'});
        return;
    }
    
    if (!auth.currentUser) return;

    try {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordMsg({type: 'success', text: 'تم تحديث كلمة المرور بنجاح'});
        setTimeout(() => {
            setShowSettings(false);
            setIsRecoveryMode(false);
            setNewPassword('');
            setConfirmPassword('');
            setPasswordMsg(null);
        }, 2000);
    } catch (error: any) {
        setPasswordMsg({type: 'error', text: error.message});
    }
  };

  const syncWithInspectionApp = async (currentDetails: TeacherDetails, currentSessions: ClassSession[], currentPhotoUrl?: string) => {
      if (!user?.id) return;
      
      const payload = {
          id: user.id,
          full_name: currentDetails.fullName,
          employee_id: String(currentDetails.paymentId || ""),
          genre: currentDetails.genre,
          framework: currentDetails.framework,
          institution: currentDetails.institution,
          subject: currentDetails.subject,
          grade: currentDetails.grade,
          rank: Number(currentDetails.rank) || 0,
          recruitment_date: currentDetails.recruitmentDate || null,
          tenure_date: currentDetails.tenureDate || null,
          grade_date: currentDetails.gradeDate || null,
          last_promotion_date: currentDetails.lastPromotionDate || null,
          promotion_pace: 'rapid',
          sector: currentDetails.sector || 'public',
          image: currentPhotoUrl || user.avatarUrl || null,
          schedule: currentSessions || [],
          inspector_email: currentDetails.inspectorEmail || null, // Crucial for Smart Inspector linking
          inspector_name: currentDetails.inspectorName || null,
          updated_at: new Date().toISOString(),
          is_deleted: false
      };

      try {
          await setDoc(doc(db, "teachers", user.id), payload, { merge: true });
      } catch (error) {
          console.error("Error syncing with inspection app:", error);
      }
  };

  const handleSaveDetails = async (details: TeacherDetails, photoUrl?: string) => {
     if (user?.id) {
         if (details.assignedClasses) {
             localStorage.setItem(`assigned_classes_${user.id}`, JSON.stringify(details.assignedClasses));
         }

         try {
             // Validate Inspector Code if provided
             let validInspectorId = details.inspectorId || null;
             let validInspectorName = details.inspectorName || '';
             
             if (details.inspectorCode) {
                 const normalizedCode = details.inspectorCode.trim().toUpperCase();
                 try {
                     // Query authorized_users directly - this is the source of truth from your Inspector App
                     const q = query(collection(db, 'authorized_users'), where('accessCode', '==', normalizedCode));
                     const codeSnap = await getDocs(q);
                     
                     if (!codeSnap.empty) {
                         const codeDoc = codeSnap.docs[0];
                         const codeData = codeDoc.data();
                         // Syncing based on EMAIL ensures persistence even if codes change or users are re-added
                         validInspectorId = codeData.email; 
                         validInspectorName = codeData.name || codeData.email.split('@')[0];
                         details.inspectorEmail = codeData.email;
                         details.inspectorCode = normalizedCode;
                     } else {
                         showToast(`كود الانتساب (${normalizedCode}) غير موجود في النظام. يرجى التأكد من الكود الممنوح من مفتشك.`, "error");
                         return; 
                     }
                 } catch (validError: any) {
                     console.error("Error validating code:", validError);
                     showToast("حدث خطأ تقني أثناء التحقق من الكود. يرجى المحاولة لاحقاً.", "error");
                     return;
                 }
             }

             await setDoc(doc(db, 'teacher_details', user.id), { 
                 id: user.id, 
                 full_name: details.fullName, 
                 payment_id: details.paymentId || null, 
                 recruitment_date: details.recruitmentDate || null,
                 tenure_date: details.tenureDate || null,
                 last_promotion_date: details.lastPromotionDate || null,
                 grade_date: details.gradeDate || null, 
                 genre: details.genre, 
                 framework: details.framework, 
                 institution: details.institution, 
                 subject: details.subject, 
                 grade: details.grade, 
                 rank: details.rank, 
                 last_inspection_score: details.lastInspectionScore, 
                 last_inspection_date: details.lastInspectionDate, 
                 inspector_name: validInspectorName,
                 inspector_id: validInspectorId,
                 inspector_email: details.inspectorEmail || null,
                 inspector_code: details.inspectorCode || null,
                 sector: details.sector || 'public' // Include sector in save
            }, { merge: true });

             const profileUpdates: any = {
                 id: user.id,
                 full_name: details.fullName,
                 updated_at: new Date().toISOString(),
             };
             
             if (photoUrl) {
                 profileUpdates.avatar_url = photoUrl;
             }

             await setDoc(doc(db, 'profiles', user.id), profileUpdates, { merge: true });
             
             // Update the local details with the validated inspector info
             const updatedDetails = {
                 ...details,
                 inspectorId: validInspectorId || undefined,
                 inspectorName: validInspectorName
             };

             // Sync with inspection app
             await syncWithInspectionApp(updatedDetails, sessions, photoUrl);

             setUser({ 
                 ...user, 
                 name: updatedDetails.fullName, 
                 avatarUrl: photoUrl || user.avatarUrl, 
                 details: updatedDetails 
             });

             localStorage.setItem(`teacher_details_${user.id}`, JSON.stringify(updatedDetails));
             if (photoUrl) {
                 localStorage.setItem(`avatar_${user.id}`, photoUrl);
             }

             setIsEditingProfile(false);
             setIsOffline(false);
             showToast("تم حفظ المعلومات بنجاح");

         } catch (err: any) { 
             console.error("Save error:", err);
             if (err.message?.includes('Missing or insufficient permissions')) {
                 handleFirestoreError(err, OperationType.WRITE, 'teacher_details or profiles');
             }
             setIsOffline(true); 
             setUser({ ...user, name: details.fullName, avatarUrl: photoUrl || user.avatarUrl, details });
             localStorage.setItem(`teacher_details_${user.id}`, JSON.stringify(details));
             if (photoUrl) localStorage.setItem(`avatar_${user.id}`, photoUrl);
             setIsEditingProfile(false);
             showToast("حدث خطأ في الاتصال، تم حفظ المعلومات محلياً", "error");
         }
     }
  };

  const updateLocalSessions = (userId: string, newSessions: ClassSession[]) => {
      localStorage.setItem(`sessions_${userId}`, JSON.stringify(newSessions));
  };

  const handleToggleSlot = async (day: DayOfWeek, startTime: string) => {
    if (!user?.id) return;
    let newSessions = [...sessions];
    const idx = sessions.findIndex(s => s.day === day && s.startTime === startTime);
    
    if (idx >= 0) {
        const toRemove = sessions[idx];
        newSessions = sessions.filter((_, i) => i !== idx);
        setSessions(newSessions);
        updateLocalSessions(user.id, newSessions);

        try {
            await deleteDoc(doc(db, 'timetable_sessions', toRemove.id));
        } catch (error) {
             console.error("Error deleting session:", error);
             setIsOffline(true);
        }
    }
  };

  const handleEditSlotRequest = (day: DayOfWeek, startTime: string) => {
    const existing = sessions.find(s => s.day === day && s.startTime === startTime);
    let initialName = existing?.className || '';
    
    if (!existing) {
        const hStart = parseInt(startTime.split(':')[0]);
        const institution = user?.details?.institution || "";
         if (institution.includes('الإعدادية')) {
           if ((day === DayOfWeek.WEDNESDAY || day === DayOfWeek.FRIDAY) && (hStart === 15 || hStart === 16)) {
               initialName = "ASS";
           }
        } else if (institution.includes('التأهيلية')) {
           if (day === DayOfWeek.FRIDAY && (hStart === 15 || hStart === 16 || hStart === 17)) {
               initialName = "ASS";
           }
        }
    }

    setEditModalState({
      isOpen: true,
      day,
      time: startTime,
      initialClassName: initialName
    });
  };

  const handleSaveSlotDetails = async (className: string) => {
    if (!user?.id) return;
    const { day, time } = editModalState;
    
    let newSessions = [...sessions];
    const existing = newSessions.find(s => s.day === day && s.startTime === time);
    
    if (existing) {
        const idx = newSessions.findIndex(s => s.id === existing.id);
        newSessions[idx] = { ...existing, className: className };
        setSessions(newSessions);
        updateLocalSessions(user.id, newSessions);

        try {
            await setDoc(doc(db, 'timetable_sessions', existing.id), { class_name: className }, { merge: true });
        } catch (error) {
            console.error("Error updating class name:", error);
            setIsOffline(true);
        }
    } else {
        const [h, m] = time.split(':').map(Number);
        const endTime = `${(h+1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        
        const tempId = `temp-${Date.now()}`;
        const newSession = { 
            id: tempId, 
            day, 
            startTime: time, 
            endTime, 
            subject: "التربية البدنية", 
            className, 
            room: "", 
            color: 'bg-indigo-600' 
        };
        
        newSessions.push(newSession);
        setSessions(newSessions);
        
        try {
            const newDocRef = doc(collection(db, 'timetable_sessions'));
            const sessionData = { id: newDocRef.id, user_id: user.id, day, start_time: time, end_time: endTime, subject: "التربية البدنية", class_name: className, room: "", color: 'bg-indigo-600' };
            await setDoc(newDocRef, sessionData);
            
            const finalSessions = newSessions.map(s => s.id === tempId ? { ...s, id: newDocRef.id } : s);
            setSessions(finalSessions);
            updateLocalSessions(user.id, finalSessions);
        } catch (error) {
             console.error("Error creating session with name:", error);
             setIsOffline(true);
        }
    }
  };

  const handleSaveLicense = async (record: LicenseRecord) => {
      if (!user?.id) return;
      try {
          const newDocRef = doc(collection(db, 'licenses'));
          const licenseData = {
              id: newDocRef.id,
              user_id: user.id,
              start_date: record.startDate,
              end_date: record.endDate,
              reason: record.reason
          };
          await setDoc(newDocRef, licenseData);

          const newLicense: LicenseRecord = {
              id: newDocRef.id,
              startDate: record.startDate,
              endDate: record.endDate,
              reason: record.reason
          };
          setMyLicenses(prev => [newLicense, ...prev]);

          showToast(`تم تسجيل الرخصة بنجاح من ${record.startDate} إلى ${record.endDate}. سيتم إشعار السيد المفتش.`);
      } catch (err: any) {
          console.error("Error saving license:", err);
          showToast("حدث خطأ أثناء حفظ الرخصة. يرجى التأكد من اتصالك بالإنترنت.", "error");
      }
  };

  const handleConfirmSend = async () => {
      if (!user?.id) return;
      
      try {
          // 1. Delete existing sessions for this user to ensure clean state
          const q = query(collection(db, 'timetable_sessions'), where('user_id', '==', user.id));
          const querySnapshot = await getDocs(q);
          const batch = writeBatch(db);
          querySnapshot.forEach((doc) => {
              batch.delete(doc.ref);
          });
          await batch.commit();

          // 2. Insert all current sessions
          if (sessions.length > 0) {
              const insertBatch = writeBatch(db);
              const newSessions = sessions.map(s => {
                  const newRef = doc(collection(db, 'timetable_sessions'));
                  const sessionData = {
                      id: newRef.id,
                      user_id: user.id,
                      day: s.day,
                      start_time: s.startTime,
                      end_time: s.endTime,
                      subject: s.subject || 'التربية البدنية',
                      class_name: s.className || '',
                      room: s.room || '',
                      color: s.color || 'bg-indigo-600'
                  };
                  insertBatch.set(newRef, sessionData);
                  return {
                      id: newRef.id,
                      day: s.day as DayOfWeek,
                      startTime: s.startTime,
                      endTime: s.endTime,
                      subject: s.subject,
                      className: s.className,
                      room: s.room,
                      color: s.color
                  };
              });

              await insertBatch.commit();
              
              setSessions(newSessions);
              updateLocalSessions(user.id, newSessions);
              
              // Sync with inspection app
              if (user.details) {
                  await syncWithInspectionApp(user.details, newSessions);
              }
          }

          setIsConfirmModalOpen(false);
          showToast("تم إرسال الجدول وتأكيده بنجاح في قاعدة البيانات");
          setIsOffline(false);

      } catch (error: any) {
          console.error("Error confirming schedule:", error);
          if (error.message?.includes('Missing or insufficient permissions')) {
              handleFirestoreError(error, OperationType.WRITE, 'timetable_sessions');
          }
          showToast("حدث خطأ أثناء إرسال الجدول. يرجى التحقق من الاتصال بالإنترنت.", "error");
          setIsOffline(true);
      }
  };

  if (mode === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (mode === 'login') return <Login onInspectorLogin={handleLocalInspectorLogin} />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col transition-colors duration-300" dir="rtl">
      {(!user.details || !user.details.institution || isEditingProfile) ? (
        <TeacherProfileForm user={user} onSave={handleSaveDetails} onLogout={handleLogout} onCancel={user.details?.institution ? () => setIsEditingProfile(false) : undefined} />
      ) : (
        <>
            <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 z-30 sticky top-0 transition-colors">
                {isOffline && (
                    <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
                        <CloudOff className="h-4 w-4" /> وضع غير متصل: البيانات محفوظة محلياً. <RefreshCw className="h-3 w-3 mr-1" />
                    </div>
                )}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg"><GraduationCap className="h-6 w-6 text-white" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-none">جدول الحصص</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">أوقات العمل</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="تبديل المظهر">
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>
                        <button onClick={() => setShowSettings(true)} className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="إعدادات الحساب">
                            <Settings className="h-5 w-5" />
                        </button>
                        <button onClick={() => setShowAboutModal(true)} className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="حول المنصة"><Info className="h-5 w-5" /></button>
                        <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 p-1.5 rounded-lg transition-colors text-right">
                            <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full border dark:border-slate-600 object-cover" />
                            <div className="text-sm hidden sm:block">
                                <p className="font-medium text-gray-700 dark:text-gray-200 flex items-center gap-1">{user.name} <Edit className="h-3 w-3 text-gray-400" /></p>
                            </div>
                        </button>
                        <button onClick={handleLogout} className="text-gray-500 dark:text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" title="تسجيل الخروج"><LogOut className="h-5 w-5 transform rotate-180" /></button>
                    </div>
                </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="w-full md:w-auto">
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                تعديل الجدول
                            </h2>
                            <div className="flex flex-wrap items-center gap-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700 shadow-sm">
                                    <CheckSquare className="h-3.5 w-3.5 text-indigo-500" />
                                    اضغط المربع للحذف/الإضافة
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-700 shadow-sm">
                                    <Edit2 className="h-3.5 w-3.5 text-indigo-500" />
                                    اضغط الخانة لتعديل الاسم
                                </p>
                           </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <button onClick={() => setIsLicenseModalOpen(true)} className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 border border-indigo-200 dark:border-indigo-900/50 text-sm font-medium rounded-md shadow-sm text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 transition-all">
                            <FileText className="h-4 w-4" /> رخصة
                        </button>
                        <button onClick={() => setShowSettings(true)} className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-all">
                            <Lock className="h-4 w-4" /> تغيير القن
                        </button>
                        <button onClick={() => setIsConfirmModalOpen(true)} disabled={sessions.length === 0} className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-all disabled:opacity-50">
                            <Send className="h-4 w-4 transform -scale-x-100" /> تأكيد الجدول
                        </button>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden transition-all mb-8 ring-2 ring-indigo-500/10">
                    <TimetableGrid 
                      sessions={sessions} 
                      onToggleSlot={handleToggleSlot} 
                      onEditSlot={handleEditSlotRequest}
                      institution={user.details?.institution || ''} 
                    />
                </div>
            </main>

            <footer className="mt-auto py-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 transition-colors">
                <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
                    <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">تطوير وبرمجة أمين سنوسي مفتش مادة التربية البدنية والرياضية</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">كل الحقوق محفوظة 2026 &copy;</p>
                </div>
            </footer>
        </>
      )}

      {/* Settings / Change Password Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl border border-gray-200 dark:border-slate-700 animate-in zoom-in duration-200 transition-colors">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-bold flex items-center gap-3 text-gray-900 dark:text-slate-100">
                          <Lock className="h-6 w-6 text-indigo-500" /> 
                          {isRecoveryMode ? 'تغيير كلمة المرور' : 'إعدادات الحساب'}
                      </h3>
                      {!isRecoveryMode && (
                        <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl text-gray-500 dark:text-slate-400"><X className="h-6 w-6" /></button>
                      )}
                  </div>
                  {isRecoveryMode && (
                      <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm font-bold rounded-lg border border-amber-200 dark:border-amber-800/50">
                          المرجو إنشاء كلمة مرور جديدة لحسابك.
                      </div>
                  )}
                  <form onSubmit={handleUpdatePassword} className="space-y-6">
                      <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-500 mb-2 block mr-1">كلمة المرور الجديدة</label>
                          <input type="password" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-5 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-slate-500 mb-2 block mr-1">تأكيد كلمة المرور</label>
                          <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-5 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      {passwordMsg && <div className={`p-4 rounded-2xl text-xs font-bold border ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>{passwordMsg.text}</div>}
                      <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">تحديث كلمة المرور</button>
                  </form>
              </div>
          </div>
      )}

      <EditSlotModal 
        isOpen={editModalState.isOpen} 
        onClose={() => setEditModalState(prev => ({...prev, isOpen: false}))} 
        onSave={handleSaveSlotDetails}
        day={editModalState.day}
        time={editModalState.time}
        initialClassName={editModalState.initialClassName}
        availableClasses={user?.details?.assignedClasses} 
      />

      <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleConfirmSend} title="تأكيد الجدول" message="هل المعلومات صحيحة؟" />
      <LicenseModal isOpen={isLicenseModalOpen} onClose={() => setIsLicenseModalOpen(false)} onSave={handleSaveLicense} />
      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' 
            ? 'bg-emerald-600 text-white border-emerald-500' 
            : 'bg-red-600 text-white border-red-500'
          }`}>
            {toast.type === 'success' ? (
              <div className="bg-white/20 p-1 rounded-full"><CheckSquare className="h-4 w-4" /></div>
            ) : (
              <div className="bg-white/20 p-1 rounded-full"><X className="h-4 w-4" /></div>
            )}
            <span className="font-bold text-sm text-center">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;


import React, { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { GraduationCap, Info, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import AboutModal from './AboutModal';

interface LoginProps {
  onInspectorLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onInspectorLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const brandingDoc = await getDoc(doc(db, 'settings', 'branding'));
        if (brandingDoc.exists()) {
          setLogoUrl(brandingDoc.data().ministry_logo_url || null);
        }
      } catch (err) {
        console.error("Error fetching branding for login:", err);
      }
    };
    fetchBranding();
  }, []);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google Auth error:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMsg(null);
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMsg("تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.");
      } else if (error.code?.includes('api-key-not-valid') || error.message?.includes('api-key-not-valid')) {
        setErrorMsg("مفتاح API الخاص بـ Firebase غير صالح. يرجى التحقق من إعدادات Firebase.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setErrorMsg("تسجيل الدخول بجوجل غير مفعل حالياً في لوحة تحكم Firebase.");
      } else {
        setErrorMsg("حدث خطأ أثناء تسجيل الدخول باستخدام جوجل.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [showAboutModal, setShowAboutModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 sm:px-6 lg:px-8 transition-colors duration-300" dir="rtl">
      
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 relative transition-all">
        
        {/* Header Controls */}
        <div className="absolute top-4 left-4 flex gap-2">
            <button 
              onClick={toggleTheme}
              className="text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 transition-colors p-2 bg-gray-50 dark:bg-slate-700 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-600"
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button 
              onClick={() => setShowAboutModal(true)}
              className="text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 transition-colors p-2 bg-gray-50 dark:bg-slate-700 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-600"
              title="حول المنصة"
            >
              <Info className="h-5 w-5" />
            </button>
        </div>

        <div className="text-center">
          {logoUrl && (
            <div className="mb-6 flex justify-center">
              <img 
                src={logoUrl} 
                alt="شعار الوزارة" 
                className="h-20 sm:h-24 w-auto object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="relative mx-auto h-20 w-20 flex items-center justify-center mb-4">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20"
            />
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="relative z-10"
            >
              <GraduationCap className="h-10 w-10 text-white" />
            </motion.div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">منصة الأساتذة </h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
            سجل دخولك المهني والتحق بفضاء الأستاذ
          </p>
        </div>

        <div className="space-y-4">
          {errorMsg && (
            <div className="p-4 rounded-xl text-sm text-center border font-bold animate-pulse bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400">
              {errorMsg}
            </div>
          )}
          
          <div className="flex flex-col gap-3 pt-4">
            {/* Google Sign-In */}
            <button 
              type="button" 
              onClick={handleGoogleSignIn} 
              disabled={isLoading} 
              className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-gray-200 dark:border-slate-600 rounded-xl shadow-sm text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              المتابعة باستخدام جوجل
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center space-y-1">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">
            تطوير وبرمجة أمين سنوسي مفتش مادة التربية البدنية والرياضية
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium lowercase">
            VERSION 2.0 • {new Date().getFullYear()} &copy; ALL RIGHTS RESERVED
          </p>
      </footer>

      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </div>
  );
};

export default Login;

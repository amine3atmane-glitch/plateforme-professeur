
import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, updateProfile } from 'firebase/auth';
import { User, Key, Mail, UserPlus, Info, Sun, Moon, CheckSquare, Square, Lock, ArrowRight } from 'lucide-react';
import AboutModal from './AboutModal';

interface LoginProps {
  onInspectorLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onInspectorLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

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
        // User closed the popup, no need to show an error message
        setErrorMsg(null);
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMsg("تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.");
      } else if (error.code?.includes('api-key-not-valid') || error.message?.includes('api-key-not-valid')) {
        setErrorMsg("مفتاح API الخاص بـ Firebase غير صالح. يرجى التحقق من إعدادات Firebase.");
      } else {
        setErrorMsg("حدث خطأ أثناء تسجيل الدخول باستخدام جوجل.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Hardcoded Inspector Bypass
    if (email.trim().toLowerCase() === 'amine3atmane@gmail.com' && password === 'Mof@tich26') {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return;
        } catch (error: any) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    return;
                } catch (signupError: any) {
                    console.error("Inspector signup error:", signupError);
                    setErrorMsg("حدث خطأ أثناء إنشاء حساب المفتش.");
                    setIsLoading(false);
                    return;
                }
            } else {
                setErrorMsg("حدث خطأ أثناء تسجيل دخول المفتش.");
                setIsLoading(false);
                return;
            }
        }
    }

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: fullName });
        
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }

        setSuccessMsg("تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.");
        setIsSignUp(false);
      } else {
        await signInWithEmailAndPassword(auth, email, password);

        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let msg = error.message;
      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      else if (error.code === "auth/email-already-in-use") msg = "هذا البريد الإلكتروني مسجل بالفعل.";
      else if (error.code?.includes('api-key-not-valid') || error.message?.includes('api-key-not-valid')) msg = "مفتاح API الخاص بـ Firebase غير صالح. يرجى التحقق من إعدادات Firebase.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg("تم إرسال رابط لإنشاء كلمة مرور جديدة إلى بريدك الإلكتروني.");
    } catch (error: any) {
      console.error("Reset error:", error);
      let msg = error.message;
      if (error.code === "auth/too-many-requests") msg = "يرجى الانتظار قليلاً قبل المحاولة مرة أخرى.";
      else if (error.code?.includes('api-key-not-valid') || error.message?.includes('api-key-not-valid')) msg = "مفتاح API الخاص بـ Firebase غير صالح. يرجى التحقق من إعدادات Firebase.";
      else msg = "حدث خطأ أثناء إرسال الرابط. تأكد من صحة البريد الإلكتروني.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 sm:px-6 lg:px-8 transition-colors duration-300" dir="rtl">
      
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 relative transition-colors">
        
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
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
            {isResetMode ? (
                <Lock className="h-6 w-6 text-white" />
            ) : isSignUp ? (
                <UserPlus className="h-6 w-6 text-white" />
            ) : (
                <User className="h-6 w-6 text-white" />
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">منصة الأساتذة </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
            {isResetMode 
              ? 'استعادة الوصول للحساب'
              : (isSignUp ? 'إنشاء حساب مهني جديد' : 'تسجيل الدخول للمنصة')}
          </p>
        </div>

        <div className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg text-sm text-center border font-bold animate-pulse bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg text-sm text-center border font-bold animate-pulse bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400">
              {successMsg}
            </div>
          )}
          
          {isResetMode ? (
             /* Forgot Password Form */
             <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4">
                    أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإنشاء كلمة مرور جديدة.
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
                   <div className="relative rounded-lg shadow-sm">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Mail className="h-4 w-4 text-gray-400" />
                     </div>
                     <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none sm:text-sm text-left dark:bg-slate-700 dark:text-white transition-all" placeholder="name@gmail.com" dir="ltr" />
                   </div>
                </div>
                
                <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95 disabled:opacity-50">
                    {isLoading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </button>

                <button 
                    type="button" 
                    onClick={() => { setIsResetMode(false); setErrorMsg(null); setSuccessMsg(null); }}
                    className="w-full flex justify-center items-center gap-2 py-2 px-4 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <ArrowRight className="h-4 w-4" /> العودة لتسجيل الدخول
                </button>
             </form>
          ) : (
             /* Login / Signup Form */
             <form onSubmit={handleAuth} className="space-y-4">
                 {isSignUp && (
                   <div>
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                        الاسم الكامل
                        <span className="text-xs font-normal text-indigo-500 mx-1">(بالعربية)</span>
                     </label>
                     <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none sm:text-sm bg-white dark:bg-slate-700 dark:text-white transition-all" placeholder="مثال: محمد بناني" />
                   </div>
                 )}
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
                   <div className="relative rounded-lg shadow-sm">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Mail className="h-4 w-4 text-gray-400" />
                     </div>
                     <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none sm:text-sm text-left dark:bg-slate-700 dark:text-white transition-all" placeholder="name@gmail.com" dir="ltr" />
                   </div>
                 </div>

                 <div>
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">كلمة المرور</label>
                     <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-4 w-4 text-gray-400" />
                        </div>
                        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none sm:text-sm text-left dark:bg-slate-700 dark:text-white transition-all" placeholder="******" dir="ltr" />
                     </div>
                 </div>

                 <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <button 
                          type="button" 
                          onClick={() => setRememberMe(!rememberMe)}
                          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {rememberMe ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <Square className="h-5 w-5" />}
                          <span className="font-bold">تذكرني</span>
                        </button>
                    </div>

                    {!isSignUp && (
                        <button 
                            type="button"
                            onClick={() => { setIsResetMode(true); setErrorMsg(null); setSuccessMsg(null); }}
                            className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                        >
                            نسيت كلمة المرور؟
                        </button>
                    )}
                 </div>
                 
                 <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95 disabled:opacity-50">
                    {isLoading ? 'جاري المعالجة...' : (isSignUp ? 'تسجيل حساب جديد' : 'دخول للمنصة')}
                  </button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300 dark:border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white dark:bg-slate-800 text-gray-500">أو</span>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={handleGoogleSignIn} 
                    disabled={isLoading} 
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    المتابعة باستخدام جوجل
                  </button>
              </form>
          )}

          {!isResetMode && (
              <div className="text-center text-sm pt-2">
                 <button type="button" onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); setSuccessMsg(null); }} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-bold transition-colors">
                   {isSignUp ? 'لديك حساب بالفعل؟ سجل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                 </button>
              </div>
          )}
        </div>
      </div>

      <footer className="mt-8 text-center space-y-1">
          <p className="text-xs text-gray-500 dark:text-slate-400 font-bold">
            تطوير وبرمجة أمين سنوسي مفتش مادة التربية البدنية والرياضية
          </p>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
            كل الحقوق محفوظة 2026 &copy; نظام التواصل الرقمي التربوي
          </p>
      </footer>

      <AboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </div>
  );
};

export default Login;

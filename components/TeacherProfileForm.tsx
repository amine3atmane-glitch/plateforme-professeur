
import React, { useState, useRef, useEffect } from 'react';
import { User, TeacherDetails } from '../types';
import { Camera, Save, UserCircle, Briefcase, School, FileText, UserCheck, Upload, X, LogOut, Users, BookOpen, CreditCard, Calendar, AlertTriangle, Plus, Trash2, Building2, GraduationCap } from 'lucide-react';

interface TeacherProfileFormProps {
  user: User;
  onSave: (details: TeacherDetails, photoUrl?: string) => void;
  onLogout: () => void;
  onCancel?: () => void; // Support cancelling edit mode
}

const TeacherProfileForm: React.FC<TeacherProfileFormProps> = ({ user, onSave, onLogout, onCancel }) => {
  const [formData, setFormData] = useState<TeacherDetails>({
    fullName: user.name,
    paymentId: '', 
    recruitmentDate: '',
    tenureDate: '',
    framework: '',
    grade: '',
    rank: '',
    gradeDate: '',
    lastPromotionDate: '',
    institution: '',
    school: '', 
    genre: 'male',
    subject: 'التربية البدنية والرياضية',
    lastInspectionScore: '',
    lastInspectionDate: '',
    inspectorName: '',
    assignedClasses: [],
    sector: 'public'
  });
  
  // State for splitting institution name
  const [instType, setInstType] = useState('الثانوية التأهيلية');
  const [instName, setInstName] = useState('');
  
  // State for Assigned Classes
  const [newClassInput, setNewClassInput] = useState('');

  const [photoUrl, setPhotoUrl] = useState(user.avatarUrl);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Populate form if user already has details
    if (user.details) {
        setFormData({
            ...user.details,
            fullName: user.details.fullName || user.name,
            genre: user.details.genre || 'male',
            subject: user.details.subject || 'التربية البدنية والرياضية',
            inspectorName: user.details.inspectorName || '',
            institution: user.details.institution || user.details.school || '',
            paymentId: user.details.paymentId || '',
            recruitmentDate: user.details.recruitmentDate || '',
            tenureDate: user.details.tenureDate || '',
            lastPromotionDate: user.details.lastPromotionDate || '',
            gradeDate: user.details.gradeDate || '',
            assignedClasses: user.details.assignedClasses || [],
            sector: user.details.sector || 'public'
        });

        // Split institution if it exists
        const fullInst = user.details.institution || user.details.school || '';
        let extractedName = '';

        if (fullInst.startsWith('الثانوية التأهيلية')) {
            setInstType('الثانوية التأهيلية');
            extractedName = fullInst.replace('الثانوية التأهيلية', '').trim();
        } else if (fullInst.startsWith('الثانوية الإعدادية')) {
            setInstType('الثانوية الإعدادية');
            extractedName = fullInst.replace('الثانوية الإعدادية', '').trim();
        } else if (fullInst) {
            // Default fallback
            extractedName = fullInst;
        }

        // Specific fix to clear unwanted default value if present
        if (extractedName.includes('الفتح') || extractedName.includes('Al Fath')) {
             setInstName('');
        } else {
             setInstName(extractedName);
        }
    } else {
        // New user, ensure empty
        setInstName('');
    }
    
    return () => {
      stopCamera();
    };
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-update institution type based on framework
    if (name === 'framework') {
        let newInstType = instType;
        if (value === 'أستاذ التعليم الثانوي التأهيلي') {
            newInstType = 'الثانوية التأهيلية';
        } else if (value === 'أستاذ التعليم الثانوي الإعدادي') {
            newInstType = 'الثانوية الإعدادية';
        }
        setInstType(newInstType);
    }

    // Sync institution and school fields for backward compatibility
    if (name === 'institution') {
         setFormData(prev => ({ ...prev, [name]: value, school: value }));
         return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddClass = (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!newClassInput.trim()) return;
      
      const normalizedClass = newClassInput.trim().toUpperCase();
      
      if (!formData.assignedClasses?.includes(normalizedClass)) {
          setFormData(prev => ({
              ...prev,
              assignedClasses: [...(prev.assignedClasses || []), normalizedClass]
          }));
      }
      setNewClassInput('');
  };

  const handleRemoveClass = (className: string) => {
      setFormData(prev => ({
          ...prev,
          assignedClasses: (prev.assignedClasses || []).filter(c => c !== className)
      }));
  };

  const compressImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300; 
        let width = img.width;
        let height = img.height;
        if (width > height) {
            if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
            }
        } else {
            if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
            }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        } else {
            resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        try {
            const compressed = await compressImage(result);
            setPhotoUrl(compressed);
        } catch (error) {
            console.error("Compression failed", error);
            setPhotoUrl(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setCameraError("لا يمكن الوصول للكاميرا. يرجى التحقق من الصلاحيات.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const size = Math.min(video.videoWidth, video.videoHeight);
      const outputSize = 320; 

      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const xOffset = (video.videoWidth - size) / 2;
        const yOffset = (video.videoHeight - size) / 2;
        ctx.translate(outputSize, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, xOffset, yOffset, size, size, 0, 0, outputSize, outputSize);
        setPhotoUrl(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Sanitize institution name: Remove user-typed prefixes if they exist
    const cleanName = instName
        .replace(/الثانوية التأهيلية/g, '')
        .replace(/الثانوية الإعدادية/g, '')
        .trim();

    // Combine institution parts
    const finalInstitution = `${instType} ${cleanName}`.trim();
    const updatedData = { ...formData, institution: finalInstitution, school: finalInstitution };

    setTimeout(() => {
        onSave(updatedData, photoUrl);
        setIsSaving(false);
    }, 100);
  };

  // Helper boolean to check if private sector is selected
  const isPrivateSector = formData.sector === 'private';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative" dir="rtl">
      
      {/* Top Controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
          {onCancel && (
            <button 
                onClick={onCancel}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200"
            >
                <X className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">إغلاق</span>
            </button>
          )}
          <button 
             onClick={onLogout}
             className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200"
             title="تسجيل الخروج"
           >
             <LogOut className="h-4 w-4 transform rotate-180" />
             <span className="text-sm font-medium hidden sm:inline">خروج</span>
           </button>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <div className="relative w-full max-w-lg p-4">
             <button onClick={stopCamera} className="absolute top-2 right-4 z-10 text-white p-2 bg-gray-800 rounded-full hover:bg-gray-700">
               <X className="h-6 w-6" />
             </button>
             {cameraError ? (
                <div className="bg-white p-6 rounded-lg text-center">
                    <p className="text-red-600 mb-4">{cameraError}</p>
                    <button onClick={stopCamera} className="px-4 py-2 bg-gray-200 rounded text-gray-800">إغلاق</button>
                </div>
             ) : (
                <div className="flex flex-col items-center gap-4">
                    <div className="relative overflow-hidden rounded-full border-4 border-white shadow-2xl w-64 h-64 sm:w-80 sm:h-80 bg-black">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform -scale-x-100" />
                    </div>
                    <p className="text-white text-sm">قم بتعديل وضعيتك لتكون في وسط الإطار</p>
                    <button onClick={capturePhoto} className="mt-4 flex items-center justify-center h-16 w-16 bg-white rounded-full shadow-lg hover:bg-gray-200 transition-transform active:scale-95">
                      <div className="h-14 w-14 border-4 border-indigo-600 rounded-full"></div>
                    </button>
                </div>
             )}
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-100">
          <div className="mb-8 text-center">
             <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
               <GraduationCap className="h-6 w-6 text-indigo-600" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900">الملف المهني للأستاذ</h2>
             <p className="mt-2 text-sm text-gray-600">
                {onCancel ? 'تعديل المعلومات المهنية' : 'المرجو إتمام ملء معلوماتكم المهنية للمتابعة'}
             </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative">
                <img src={photoUrl} alt="Profile" className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-indigo-50" />
              </div>
              <div className="flex gap-3 mt-5 w-full">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                   <Upload className="h-4 w-4" /> تحميل صورة
                </button>
                <button type="button" onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                   <Camera className="h-4 w-4" /> التقاط صورة
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

             {/* Sector Selection - MOVED HERE */}
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نوع القطاع</label>
                <div className="grid grid-cols-2 gap-3">
                   <div 
                     onClick={() => setFormData({...formData, sector: 'public'})}
                     className={`cursor-pointer p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${formData.sector === 'public' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                   >
                       <Building2 className="h-5 w-5" />
                       <span className="font-bold">عمومي</span>
                   </div>
                   <div 
                     onClick={() => setFormData({...formData, sector: 'private'})}
                     className={`cursor-pointer p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${formData.sector === 'private' ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                   >
                       <Briefcase className="h-5 w-5" />
                       <span className="font-bold">خصوصي</span>
                   </div>
                </div>
            </div>

            {/* General Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم والنسب
                <span className="text-indigo-600 text-xs mx-1">(يرجى الكتابة بالعربية)</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><UserCircle className="h-5 w-5 text-gray-400" /></div>
                <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="مثال: محمد بناني" className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الجنس</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Users className="h-5 w-5 text-gray-400" /></div>
                    <select name="genre" required value={formData.genre} onChange={handleChange} className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border text-gray-900 dark:text-white bg-white dark:bg-slate-700">
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                    </select>
                  </div>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم التأجير (PPR) {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><CreditCard className="h-5 w-5 text-gray-400" /></div>
                    <input type="text" name="paymentId" required={!isPrivateSector} value={formData.paymentId || ''} onChange={handleChange} placeholder="رقم التأجير" className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التوظيف {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                  <div className="relative rounded-md shadow-sm">
                    <input type="date" name="recruitmentDate" value={formData.recruitmentDate || ''} onChange={handleChange} className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                  </div>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الترسيم {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                  <div className="relative rounded-md shadow-sm">
                    <input type="date" name="tenureDate" value={formData.tenureDate || ''} onChange={handleChange} className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                  </div>
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الإطار {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                 <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Briefcase className="h-4 w-4 text-gray-400" /></div>
                  <select name="framework" required={!isPrivateSector} value={formData.framework} onChange={handleChange} className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border text-gray-900 dark:text-white bg-white dark:bg-slate-700">
                    <option value="">اختر الإطار...</option>
                    <option value="أستاذ التعليم الثانوي التأهيلي">أستاذ التعليم الثانوي التأهيلي</option>
                    <option value="أستاذ التعليم الثانوي الإعدادي">أستاذ التعليم الثانوي الإعدادي</option>
                    <option value="أستاذ التعليم الابتدائي (تكليف)">أستاذ التعليم الابتدائي (تكليف)</option>
                  </select>
                </div>
            </div>
              
            {/* Grade Block */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 ${isPrivateSector ? 'opacity-70' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الدرجة {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                  <select name="grade" required={!isPrivateSector} value={formData.grade} onChange={handleChange} className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border text-gray-900 dark:text-white bg-white dark:bg-slate-700">
                    <option value="">اختر الدرجة...</option>
                    <option value="الدرجة الثانية">الدرجة الثانية</option>
                    <option value="الدرجة الأولى">الدرجة الأولى</option>
                    <option value="الدرجة الممتازة">الدرجة الممتازة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسمية في الدرجة {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                  <input type="date" name="gradeDate" value={formData.gradeDate || ''} onChange={handleChange} className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                </div>
            </div>

            {/* Rank Block */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 ${isPrivateSector ? 'opacity-70' : ''}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الرتبة {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                  <input type="number" name="rank" placeholder="1-13" required={!isPrivateSector} value={formData.rank} onChange={handleChange} min="1" max="13" className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ التسمية في الرتبة {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                  <input type="date" name="lastPromotionDate" value={formData.lastPromotionDate || ''} onChange={handleChange} className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                </div>
            </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المادة التي تدرسها {isPrivateSector && <span className="text-xs font-normal text-gray-400">(اختياري)</span>}</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><BookOpen className="h-4 w-4 text-gray-400" /></div>
                  <input type="text" name="subject" required={!isPrivateSector} value={formData.subject} onChange={handleChange} placeholder="مثال: التربية البدنية والرياضية" className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                </div>
             </div>

             {/* Assigned Classes Section */}
             <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800/30">
                <label className="block text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2">
                    الأقسام المسندة (مهم للجدول)
                </label>
                <div className="flex gap-2 mb-3">
                    <input 
                        type="text" 
                        value={newClassInput}
                        onChange={(e) => setNewClassInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddClass();
                            }
                        }}
                        placeholder="أضف قسماً (مثال: 1م1، 2باك2)"
                        className="flex-1 block w-full px-3 py-2 border border-indigo-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-slate-800 dark:text-white dark:border-indigo-700"
                    />
                    <button 
                        type="button" 
                        onClick={() => handleAddClass()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {formData.assignedClasses && formData.assignedClasses.length > 0 ? (
                        formData.assignedClasses.map((cls, idx) => (
                            <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 shadow-sm">
                                {cls}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveClass(cls)}
                                    className="ml-2 -mr-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-indigo-400 hover:bg-indigo-200 hover:text-indigo-600 focus:outline-none"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))
                    ) : (
                        <p className="text-xs text-indigo-400 italic">لم تتم إضافة أي أقسام بعد.</p>
                    )}
                </div>
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المؤسسة التعليمية</label>
                <div className="flex gap-2">
                    <div className="w-1/2">
                        <select 
                            value={instType} 
                            onChange={(e) => setInstType(e.target.value)} 
                            className="block w-full py-2.5 px-3 border border-gray-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                            <option value="الثانوية التأهيلية">الثانوية التأهيلية</option>
                            <option value="الثانوية الإعدادية">الثانوية الإعدادية</option>
                            {isPrivateSector && <option value="مؤسسة">مؤسسة خصوصية</option>}
                        </select>
                    </div>
                    <div className="w-1/2">
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><School className="h-4 w-4 text-gray-400" /></div>
                            <input 
                                type="text" 
                                value={instName} 
                                onChange={(e) => setInstName(e.target.value)} 
                                required
                                placeholder="اسم المؤسسة (مثال: ابن خلدون)" 
                                className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2.5 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" 
                            />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="h-3 w-3" />
                    <p className="text-[10px] font-bold">
                        تنبيه: لا تقم بإعادة كتابة "الثانوية الإعدادية" أو "الثانوية التأهيلية" في خانة الاسم
                    </p>
                </div>
            </div>

             <div className={`bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2 ${isPrivateSector ? 'opacity-70' : ''}`}>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><FileText className="h-3 w-3" />بيانات التفتيش الأخير</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">آخر نقطة <span className="text-[10px] text-gray-400 font-normal">(اختياري)</span></label>
                      <input type="number" step="0.01" name="lastInspectionScore" placeholder="20/.." value={formData.lastInspectionScore} onChange={handleChange} className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">تاريخها</label>
                        <input type="date" name="lastInspectionDate" value={formData.lastInspectionDate} onChange={handleChange} className="block w-full border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                    </div>
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-gray-700 mb-1">المفتش المسؤول <span className="text-xs font-normal text-gray-400">(اختياري)</span></label>
                     <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><UserCheck className="h-4 w-4 text-gray-400" /></div>
                        <input type="text" name="inspectorName" required={false} value={formData.inspectorName} onChange={handleChange} placeholder="اسم المفتش" className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border text-gray-900 dark:text-white bg-white dark:bg-slate-700" />
                      </div>
                  </div>
                </div>
             </div>
             
            <button type="submit" disabled={isSaving} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all mt-6 disabled:opacity-50">
              <Save className="h-5 w-5 ml-2" />
              {isSaving ? 'جاري الحفظ...' : 'حفظ المعلومات والمتابعة'}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          سيتم استخدام هذه المعلومات في تقارير التفتيش الرسمية
        </p>
      </div>
    </div>
  );
};

export default TeacherProfileForm;

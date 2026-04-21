
import React, { useState, useEffect } from 'react';
import { X, Save, Eraser, Plus } from 'lucide-react';
import { DayOfWeek } from '../types';

interface EditSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (className: string) => void;
  day: DayOfWeek;
  time: string;
  initialClassName: string;
  availableClasses?: string[]; // New prop for user's assigned classes
}

const EditSlotModal: React.FC<EditSlotModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  day, 
  time, 
  initialClassName,
  availableClasses = [] 
}) => {
  const [className, setClassName] = useState(initialClassName);

  useEffect(() => {
    setClassName(initialClassName);
  }, [initialClassName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(className.trim());
    onClose();
  };

  const handleSelectClass = (cls: string) => {
      setClassName(cls);
      // Optional: Auto-save on selection if you want faster workflow
      // onSave(cls);
      // onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500/75 dark:bg-slate-900/80 backdrop-blur-sm"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-xl text-right overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full border border-gray-100 dark:border-slate-700">
          <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 relative">
            <button onClick={onClose} className="absolute top-4 left-4 text-gray-400 hover:text-gray-500 dark:hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">اختر القسم</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{day} - الساعة {time}</p>

            {/* Quick Select Grid */}
            {availableClasses.length > 0 ? (
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        الأقسام المسندة إليك
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {availableClasses.map((cls, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectClass(cls)}
                                className={`px-2 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm border ${className === cls ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-300 dark:ring-indigo-900' : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'}`}
                            >
                                {cls}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400 text-center">
                    لم تقم بتحديد الأقسام المسندة إليك في الملف الشخصي بعد.
                </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">كتابة يدوية (اختياري)</label>
                <input 
                  type="text" 
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="مثال: 1م3"
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white transition-colors text-center font-bold"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  type="submit" 
                  className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-indigo-600 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  حفظ
                </button>
                <button 
                  type="button" 
                  onClick={() => setClassName('')}
                  className="inline-flex justify-center items-center gap-2 rounded-xl border border-gray-300 dark:border-slate-600 shadow-sm px-4 py-2.5 bg-white dark:bg-slate-700 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all active:scale-95"
                  title="مسح الاسم"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditSlotModal;

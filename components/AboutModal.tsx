import React from 'react';
import { X, Info } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 dark:bg-slate-900/80 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-2xl text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-100 dark:border-slate-700">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 relative">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-500 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-full">
                <Info className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">الغرض من المنصة</h3>
            </div>

            <div className="space-y-5">
                {/* Why Section - Light Blue */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2 text-base">لماذا هذه المنصة؟</h4>
                    <p className="text-indigo-800 dark:text-indigo-300 text-sm leading-relaxed font-medium">
                        تأتي هذه المبادرة في إطار تحديث الإدارة التربوية، كوسيلة لربط جسر تواصل رقمي مباشر وسريع مع السيد المفتش.
                    </p>
                </div>

                {/* Description Text */}
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed font-medium">
                    تمكنك هذه المنصة من مسك جدول حصصك وتعديله في أي وقت، ليطلع عليه المفتش بشكل آني، مما يضمن دقة المعطيات وسرعة التواصل.
                </p>

                {/* Goals Section - Light Gray */}
                <div className="bg-gray-50 dark:bg-slate-700/30 p-5 rounded-xl border border-gray-100 dark:border-slate-600/50">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3 text-sm">أهداف المنصة:</h4>
                    <ul className="space-y-2.5 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                            <li className="flex items-start gap-2.5">
                            <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-gray-500 dark:bg-gray-400 shrink-0"></span>
                           إجراء التفتيشات والزيارات في الوقت المناسب لكي لا تضيع حقوق الأستاذ(ة).
                        </li>
                        <li className="flex items-start gap-2.5">
                            <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-gray-500 dark:bg-gray-400 shrink-0"></span>
                            رقمنة جداول الحصص في انتظار التوصل بالأوراق.
                        </li>
                        <li className="flex items-start gap-2.5">
                            <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-gray-500 dark:bg-gray-400 shrink-0"></span>
                            تسهيل عملية التحيين عن بعد.
                        </li>
                        <li className="flex items-start gap-2.5">
                            <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-gray-500 dark:bg-gray-400 shrink-0"></span>
                            إنشاء قاعدة معطيات دقيقة لتسهيل التتبع التربوي.
                        </li>
                        <li className="flex items-start gap-2.5">
                            <span className="block w-1.5 h-1.5 mt-2 rounded-full bg-gray-500 dark:bg-gray-400 shrink-0"></span>
                            توفير فضاء خاص  للأستاذ(ة) للاطلاع على وضعيته الإدارية.
                        </li>
                    </ul>
                </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-slate-700/30 px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-xl border border-gray-300 dark:border-slate-600 shadow-sm px-4 py-3 bg-white dark:bg-slate-800 text-base font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-full sm:text-sm transition-all active:scale-95"
            >
              فهمت، شكراً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
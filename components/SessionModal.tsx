import React, { useState, useEffect } from 'react';
import { ClassSession, DayOfWeek, DAYS_ORDER, check48HourGap } from '../types';
import { parseClassDetailsWithGemini } from '../services/geminiService';
import { X, Wand2, Loader2, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessions: (Omit<ClassSession, 'id'> | ClassSession)[]) => void;
  initialData?: ClassSession | null;
  defaultValues?: { day: DayOfWeek; startTime: string } | null;
}

const SessionModal: React.FC<SessionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  defaultValues 
}) => {
  // Common Data
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('التربية البدنية');
  const [color, setColor] = useState('bg-blue-100 border-blue-200 text-blue-800');

  // Session 1 Data
  const [s1Day, setS1Day] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [s1Start, setS1Start] = useState('08:00');
  const [s1End, setS1End] = useState('10:00');
  const [s1Room, setS1Room] = useState('القاعة');

  // Session 2 Data (Only used if creating new class pair)
  const [s2Day, setS2Day] = useState<DayOfWeek>(DayOfWeek.THURSDAY);
  const [s2Start, setS2Start] = useState('08:00');
  const [s2End, setS2End] = useState('10:00');
  const [s2Room, setS2Room] = useState('الملعب');

  // State management
  const [isEditMode, setIsEditMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit Mode: specific session
        setIsEditMode(true);
        setClassName(initialData.className);
        setSubject(initialData.subject);
        setColor(initialData.color || 'bg-blue-100 border-blue-200 text-blue-800');
        
        setS1Day(initialData.day);
        setS1Start(initialData.startTime);
        setS1End(initialData.endTime);
        setS1Room(initialData.room);
      } else {
        // Create Mode
        setIsEditMode(false);
        setClassName('');
        setSubject('التربية البدنية');
        setAiPrompt('');
        setColor('bg-blue-100 border-blue-200 text-blue-800');
        
        // Defaults
        if (defaultValues) {
            setS1Day(defaultValues.day);
            setS1Start(defaultValues.startTime);
            // Default 2 hour duration for EPS
            const [h, m] = defaultValues.startTime.split(':').map(Number);
            const endH = h + 2;
            const formattedEnd = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            setS1End(formattedEnd);
            
            // Try to intelligently set S2 based on S1 + 3 days roughly
            const daysArr = Object.values(DayOfWeek);
            const idx1 = DAYS_ORDER.indexOf(defaultValues.day);
            const idx2 = (idx1 + 3) % DAYS_ORDER.length; 
            // Ensure we don't wrap to Sunday if possible for school
            const nextDay = DAYS_ORDER[idx2] || DayOfWeek.THURSDAY; 
            
            setS2Day(nextDay);
            setS2Start(defaultValues.startTime);
            setS2End(formattedEnd);

        } else {
            setS1Day(DayOfWeek.MONDAY);
            setS1Start('08:00');
            setS1End('10:00');
            setS2Day(DayOfWeek.THURSDAY);
            setS2Start('08:00');
            setS2End('10:00');
        }
        setS1Room('القاعة');
        setS2Room('الملعب');
      }
      setAiError(null);
    }
  }, [isOpen, initialData, defaultValues]);

  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    setAiError(null);

    try {
      const result = await parseClassDetailsWithGemini(aiPrompt);
      if (result) {
        setClassName(result.className || className);
        setSubject(result.subject || 'EPS');
        
        if (result.sessions && result.sessions.length > 0) {
          // Map first session
          const sess1 = result.sessions[0];
          if (sess1) {
            if (Object.values(DayOfWeek).includes(sess1.day)) setS1Day(sess1.day);
            if (sess1.startTime) setS1Start(sess1.startTime);
            if (sess1.endTime) setS1End(sess1.endTime);
            if (sess1.room) setS1Room(sess1.room);
          }
          
          // Map second session if exists
          if (result.sessions.length > 1) {
            const sess2 = result.sessions[1];
            if (Object.values(DayOfWeek).includes(sess2.day)) setS2Day(sess2.day);
            if (sess2.startTime) setS2Start(sess2.startTime);
            if (sess2.endTime) setS2End(sess2.endTime);
            if (sess2.room) setS2Room(sess2.room);
          }
        }
      } else {
        setAiError("عذراً، لم أتمكن من الفهم. جرب: '6A الإثنين 8h القاعة والخميس 10h الملعب'");
      }
    } catch (error) {
      setAiError("خطأ في الاتصال بالذكاء الاصطناعي.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const isGapValid = check48HourGap(s1Day, s1Start, s2Day, s2Start);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className) return;

    if (isEditMode && initialData) {
      // Return single updated session
      onSave([{
        id: initialData.id,
        className, subject, color,
        day: s1Day, startTime: s1Start, endTime: s1End, room: s1Room
      }]);
    } else {
      // Create Pair
      if (!isGapValid) {
        if (!window.confirm("تنبيه: الفاصل الزمني بين الحصتين أقل من 48 ساعة. هل تود المتابعة؟")) {
          return;
        }
      }
      
      const session1: Omit<ClassSession, 'id'> = {
        className, subject, color,
        day: s1Day, startTime: s1Start, endTime: s1End, room: s1Room
      };

      const session2: Omit<ClassSession, 'id'> = {
        className, subject, color,
        day: s2Day, startTime: s2Start, endTime: s2End, room: s2Room
      };

      onSave([session1, session2]);
    }
    onClose();
  };

  if (!isOpen) return null;

  const colors = [
    { label: 'Bleu', value: 'bg-blue-100 border-blue-200 text-blue-800' },
    { label: 'Vert', value: 'bg-green-100 border-green-200 text-green-800' },
    { label: 'Rouge', value: 'bg-red-100 border-red-200 text-red-800' },
    { label: 'Jaune', value: 'bg-yellow-100 border-yellow-200 text-yellow-800' },
    { label: 'Orange', value: 'bg-orange-100 border-orange-200 text-orange-800' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-center mb-5 border-b pb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {isEditMode ? 'تعديل الحصة' : 'إضافة قسم جديد'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* AI Assistant */}
            {!isEditMode && (
              <div className="mb-6 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <label className="text-sm font-medium text-indigo-900 mb-2 flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-indigo-600" />
                  إدخال سريع بالذكاء الاصطناعي
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="مثال: 1م1 الإثنين 8h القاعة والخميس 14h الملعب"
                    className="flex-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                  />
                  <button 
                    onClick={handleAiParse}
                    disabled={isAiLoading || !aiPrompt}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'توليد'}
                  </button>
                </div>
                {aiError && <p className="mt-2 text-xs text-red-600">{aiError}</p>}
              </div>
            )}

            <form id="session-form" onSubmit={handleSubmit} className="space-y-6">
              {/* General Class Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">القسم / الفوج</label>
                  <input type="text" required value={className} onChange={e => setClassName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="مثال: 1 متوسط 2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">المادة</label>
                  <input type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
              </div>

              {/* Sessions Container */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                     {isEditMode ? 'تفاصيل الحصة' : 'الحصة 1'}
                   </h4>
                   {!isEditMode && <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">إجباري</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                     <label className="block text-xs font-medium text-gray-500">اليوم</label>
                     <select value={s1Day} onChange={e => setS1Day(e.target.value as DayOfWeek)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm text-sm">
                       {DAYS_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
                     </select>
                  </div>
                  <div className="sm:col-span-1">
                     <label className="block text-xs font-medium text-gray-500">المكان</label>
                     <input type="text" value={s1Room} onChange={e => setS1Room(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
                  </div>
                  <div className="sm:col-span-1">
                     <label className="block text-xs font-medium text-gray-500">البداية</label>
                     <input type="time" required value={s1Start} onChange={e => setS1Start(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
                  </div>
                  <div className="sm:col-span-1">
                     <label className="block text-xs font-medium text-gray-500">النهاية</label>
                     <input type="time" required value={s1End} onChange={e => setS1End(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
                  </div>
                </div>
              </div>

              {!isEditMode && (
                <>
                  <div className="flex justify-center -my-3 z-10 relative">
                     <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${isGapValid ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                        {isGapValid ? <CheckCircle2 className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                        {isGapValid ? 'فاصل زمني > 48 سا (محترم)' : 'فاصل زمني < 48 سا !'}
                     </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">الحصة 2</h4>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">إجباري</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-500">اليوم</label>
                        <select value={s2Day} onChange={e => setS2Day(e.target.value as DayOfWeek)} className="mt-1 block w-full p-2 border-gray-300 rounded-md shadow-sm text-sm">
                          {DAYS_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-500">المكان</label>
                        <input type="text" value={s2Room} onChange={e => setS2Room(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-500">البداية</label>
                        <input type="time" required value={s2Start} onChange={e => setS2Start(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-500">النهاية</label>
                        <input type="time" required value={s2End} onChange={e => setS2End(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">لون البطاقة</label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 ${c.value.split(' ')[0]} ${color === c.value ? 'ring-2 ring-offset-2 ring-indigo-500 border-gray-400' : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>

            </form>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="submit"
              form="session-form"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
            >
              <Save className="h-4 w-4 ml-2" />
              {isEditMode ? 'تحديث' : 'حفظ التغييرات'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionModal;
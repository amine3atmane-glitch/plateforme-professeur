
import React from 'react';
import { ClassSession, DayOfWeek, DAYS_ORDER, TIME_SLOTS } from '../types';
import { Check, Calendar, Plus } from 'lucide-react';

interface TimetableGridProps {
  sessions: ClassSession[];
  onToggleSlot: (day: DayOfWeek, time: string) => void;
  onEditSlot?: (day: DayOfWeek, time: string) => void; 
  institution?: string;
}

const TimetableGrid: React.FC<TimetableGridProps> = ({ 
  sessions, 
  onToggleSlot,
  onEditSlot,
  institution = ''
}) => {
  
  const getSession = (day: DayOfWeek, time: string) => {
    return sessions.find(s => s.day === day && s.startTime === time);
  };

  const formatTimeSlotLabel = (time: string, index: number) => {
    const nextTime = TIME_SLOTS[index + 1];
    if (!nextTime) return time;
    return `${nextTime.replace(':00', 'h')} - ${time.replace(':00', 'h')}`;
  };

  const getDayLabel = (day: string) => day;

  // Function to determine if a slot should be colored green (ASS hours)
  const isAssociationSportsSlot = (day: DayOfWeek, time: string) => {
    const h = parseInt(time.split(':')[0]);
    
    // Check for Middle School (Collège / الإعدادية)
    if (institution.includes('الإعدادية')) {
       // Wednesday & Friday: 15h, 16h (i.e. 15-16, 16-17)
       if ((day === DayOfWeek.WEDNESDAY || day === DayOfWeek.FRIDAY) && (h === 15 || h === 16)) {
         return true;
       }
    }
    // Check for High School (Lycée / التأهيلية)
    else if (institution.includes('التأهيلية')) {
       // Friday: 15h, 16h, 17h (i.e. 15-16, 16-17, 17-18)
       if (day === DayOfWeek.FRIDAY && (h === 15 || h === 16 || h === 17)) {
         return true;
       }
    }

    return false;
  };

  const handleCheckboxClick = (e: React.MouseEvent | React.TouchEvent, day: DayOfWeek, time: string, isActive: boolean) => {
    e.stopPropagation(); 
    if (isActive) {
        // If active, toggle (delete)
        onToggleSlot(day, time);
    } else {
        // If inactive, open modal (add)
        if (onEditSlot) onEditSlot(day, time);
    }
  };

  const handleCellClick = (day: DayOfWeek, time: string, isActive: boolean) => {
      if (isActive && onEditSlot) {
          onEditSlot(day, time);
      }
  };

  return (
    <>
    {/* DESKTOP VIEW */}
    <div className="hidden md:flex bg-gray-100 dark:bg-slate-800 rounded-lg shadow flex-col border border-gray-200 dark:border-slate-700 overflow-hidden relative" dir="rtl">
      {/* Header Row (Time Slots) */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 sticky top-0 z-10 shadow-sm">
        <div className="w-16 flex-shrink-0 flex items-center justify-center font-bold text-gray-400 dark:text-slate-500 text-xs">
          الأيام
        </div>
        <div className="flex-1 flex gap-1">
          {TIME_SLOTS.slice(0, -1).map((time, index) => (
            <div key={time} className="flex-1 rounded-md bg-gray-50 dark:bg-slate-700/50 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-slate-300 text-center leading-tight px-1">
              {formatTimeSlotLabel(time, index)}
            </div>
          ))}
        </div>
      </div>

      <div className="no-scrollbar p-2 flex flex-col gap-2">
        {DAYS_ORDER.map((day) => (
          <div key={day} className="flex gap-1 min-h-[64px]">
            <div className="w-16 flex-shrink-0 bg-white dark:bg-slate-700 rounded-md shadow-sm border border-gray-100 dark:border-slate-600 flex items-center justify-center text-[10px] sm:text-xs font-bold text-gray-700 dark:text-slate-200">
              {getDayLabel(day)}
            </div>
            <div className="flex-1 flex gap-1">
              {TIME_SLOTS.slice(0, -1).map((time) => {
                const session = getSession(day, time);
                const active = !!session;
                const isSpecial = isAssociationSportsSlot(day, time);
                
                return (
                  <div 
                    key={`${day}-${time}`} 
                    onClick={() => handleCellClick(day, time, active)}
                    className={`
                      flex-1 rounded-md transition-all duration-200 flex flex-col items-center justify-center group relative border select-none cursor-pointer
                      ${active 
                        ? (isSpecial 
                            ? 'bg-emerald-600 border-emerald-600 shadow-md' // Active & Special
                            : 'bg-indigo-600 border-indigo-600 shadow-md'   // Active only
                          )
                        : (isSpecial 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30 hover:border-emerald-300' // Special only
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm' // Default
                          )
                      }
                    `}
                    title={`${day} : ${time}`}
                  >
                     {/* Checkbox for Toggle - Always visible/accessible */}
                     <div 
                        onClick={(e) => handleCheckboxClick(e, day, time, active)}
                        className="absolute bottom-0.5 left-0.5 z-30 p-1.5 cursor-pointer hover:bg-black/10 rounded-full transition-colors"
                        title={active ? "اضغط للحذف" : "اضغط للإضافة"}
                     >
                        <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center transition-all ${active ? 'bg-white border-white' : 'bg-white border-gray-300 shadow-sm'}`}>
                            {active ? (
                                <Check className={`w-3 h-3 ${isSpecial ? 'text-emerald-600' : 'text-indigo-600'}`} strokeWidth={4} />
                            ) : (
                                <Plus className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={4} />
                            )}
                        </div>
                    </div>

                    <div className={`
                      transform transition-all duration-200 flex flex-col items-center w-full px-1
                      ${active ? 'scale-100 opacity-100' : 'scale-0 opacity-0 group-hover:scale-75 group-hover:opacity-30'}
                    `}>
                      <Check className={`w-5 h-5 ${active ? 'text-white' : 'text-indigo-400'}`} strokeWidth={3} />
                      {session?.className && (
                          <span className="text-[10px] font-bold text-white mt-1 leading-none text-center px-1 truncate w-full">{session.className}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* MOBILE VIEW */}
    <div className="flex md:hidden flex-col gap-4 pb-8" dir="rtl">
        {DAYS_ORDER.map((day) => (
            <div key={day} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors relative">
                <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        <h3 className="font-bold text-gray-800 dark:text-white">{day}</h3>
                    </div>
                </div>
                <div className="p-3 grid grid-cols-4 gap-2">
                    {TIME_SLOTS.slice(0, -1).filter(t => t !== '12:00' && t !== '13:00').map((time) => {
                        const session = getSession(day, time);
                        const active = !!session;
                        const isSpecial = isAssociationSportsSlot(day, time);
                        const h = parseInt(time.split(':')[0]);

                        return (
                             <div 
                                key={`${day}-${time}-mob`}
                                onClick={() => handleCellClick(day, time, active)}
                                className={`
                                    aspect-square rounded-lg border flex flex-col items-center justify-center transition-all select-none relative cursor-pointer
                                    ${active 
                                        ? (isSpecial 
                                             ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
                                             : 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                          )
                                        : (isSpecial
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-400'
                                          )
                                    }
                                `}
                             >
                                {/* Checkbox for Toggle (Mobile) */}
                                <div 
                                    onClick={(e) => handleCheckboxClick(e, day, time, active)}
                                    className="absolute bottom-0 left-0 z-30 p-2 cursor-pointer active:scale-90 transition-transform"
                                    title={active ? "اضغط للحذف" : "اضغط للإضافة"}
                                >
                                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center shadow-sm ${active ? 'bg-white border-white' : 'bg-gray-50 border-gray-300'}`}>
                                        {active && <Check className={`w-3.5 h-3.5 ${isSpecial ? 'text-emerald-600' : 'text-indigo-600'}`} strokeWidth={4} />}
                                    </div>
                                </div>

                                <span className={`text-[10px] font-bold mb-1 ${active ? 'text-indigo-50' : (isSpecial ? 'text-emerald-600/70 dark:text-emerald-400/70' : 'text-gray-400')}`}>
                                    {h+1}-{h}
                                </span>
                                {active ? (
                                    <div className="flex flex-col items-center w-full px-1 overflow-hidden">
                                         <Check className="h-5 w-5" strokeWidth={3} />
                                         {session?.className && (
                                            <span className="text-[9px] font-bold leading-none mt-0.5 truncate w-full text-center">{session.className}</span>
                                         )}
                                    </div>
                                ) : (
                                    <div className={`h-4 w-4 rounded-full border-2 ${isSpecial ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900' : 'border-gray-100 dark:border-slate-700'}`}></div>
                                )}
                             </div>
                        );
                    })}
                </div>
            </div>
        ))}
    </div>
    </>
  );
};

export default TimetableGrid;

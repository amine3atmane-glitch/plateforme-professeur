import { User, ClassSession, DayOfWeek, DAYS_ORDER, TIME_SLOTS } from '../types';

export interface TeacherProfile extends User {
  id: string;
  sessions: ClassSession[];
}

const FIRST_NAMES = ["Jean", "Marie", "Pierre", "Sophie", "Lucas", "Julie", "Thomas", "Emma", "Nicolas", "Sarah"];
const LAST_NAMES = ["Dupont", "Martin", "Bernard", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent"];

const generateRandomSessions = (): ClassSession[] => {
  const sessions: ClassSession[] = [];
  // Generate between 10 and 18 hours of classes
  const numberOfSlots = Math.floor(Math.random() * 8) + 10; 

  for (let i = 0; i < numberOfSlots; i++) {
    const day = DAYS_ORDER[Math.floor(Math.random() * DAYS_ORDER.length)];
    const timeIndex = Math.floor(Math.random() * (TIME_SLOTS.length - 1));
    const startTime = TIME_SLOTS[timeIndex];
    
    // Simple 1h duration logic for mock data
    const [h, m] = startTime.split(':').map(Number);
    const endTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    // Avoid duplicates
    if (!sessions.some(s => s.day === day && s.startTime === startTime)) {
      sessions.push({
        id: crypto.randomUUID(),
        day,
        startTime,
        endTime,
        subject: "EPS",
        className: "",
        room: Math.random() > 0.5 ? "Gymnase" : "Stade",
        color: 'bg-indigo-600'
      });
    }
  }
  return sessions;
};

export const MOCK_TEACHERS: TeacherProfile[] = Array.from({ length: 15 }).map((_, i) => {
  const firstNameIndex = i % FIRST_NAMES.length;
  const firstName = FIRST_NAMES[firstNameIndex];
  const lastName = LAST_NAMES[i % LAST_NAMES.length];
  const name = `${firstName} ${lastName}`;
  const paymentId = Math.floor(100000 + Math.random() * 900000).toString(); // Random 6 digit PPR
  
  // Assign genre based on even/odd index in FIRST_NAMES (e.g. Jean=0=Male, Marie=1=Female)
  const genre = firstNameIndex % 2 === 0 ? 'male' : 'female';

  return {
    id: `teacher-${i}`,
    name: name,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@academie.fr`,
    avatarUrl: `https://ui-avatars.com/api/?name=${name}&background=random&color=fff`,
    sessions: generateRandomSessions(),
    details: {
        fullName: name,
        paymentId: paymentId,
        genre: genre,
        institution: "Lycée Exemplaire",
        subject: "التربية البدنية",
        school: "Lycée Exemplaire",
        framework: "أستاذ التعليم الثانوي التأهيلي",
        grade: "الدرجة الأولى",
        rank: Math.floor(Math.random() * 10 + 1).toString(),
        lastInspectionScore: (10 + Math.random() * 10).toFixed(2),
        lastInspectionDate: "2023-10-15",
        inspectorName: "المفتش العام"
    }
  };
});
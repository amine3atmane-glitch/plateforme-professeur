import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = (): string => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("مفتاح API مفقود. يرجى التحقق من الإعدادات.");
  }
  return apiKey;
};

export const parseClassDetailsWithGemini = async (text: string): Promise<any> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const modelId = "gemini-3-flash-preview"; 

    const response = await ai.models.generateContent({
      model: modelId,
      contents: `You are an assistant for a PE (EPS) teacher. 
      Extract class details from: "${text}".
      A PE class typically has 2 sessions in the week.
      Map days to Arabic: الإثنين, الثلاثاء, الأربعاء, الخميس, الجمعة, السبت, الأحد.
      Time to HH:mm.
      Subject defaults to 'التربية البدنية' (EPS) if not specified.
      Room defaults to 'القاعة' (Gymnase) or 'الملعب' (Stade) if implied.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            className: { type: Type.STRING, description: "Name of the class (e.g. 6ème B)" },
            subject: { type: Type.STRING },
            sessions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { 
                    type: Type.STRING, 
                    enum: ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"] 
                  },
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  room: { type: Type.STRING }
                }
              }
            }
          },
          required: ["className", "sessions"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) return null;
    
    return JSON.parse(resultText);

  } catch (error) {
    console.error("Error parsing with Gemini:", error);
    throw error;
  }
};
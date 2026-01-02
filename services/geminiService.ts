import { GoogleGenAI, Type } from "@google/genai";
import { Asset, AssetType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert file to base64 for Gemini
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeAssetImage = async (base64Image: string): Promise<any> => {
  try {
    const model = "gemini-3-flash-preview"; // Optimized for multimodal tasks (image to text)
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, can detect from header
              data: base64Image
            }
          },
          {
            text: `قم بتحليل صورة هذا الجهاز التقني. استخرج المعلومات التالية بتنسيق JSON:
            1. النوع (type): اختر واحداً من [لابتوب, حاسوب مكتبي, خادم, طابعة, أجهزة شبكة, هاتف/جهاز لوحي].
            2. العلامة التجارية (brand).
            3. الرقم التسلسلي (serialNumber) إن وجد وظاهر بوضوح.
            4. تقييم الحالة الظاهرية (conditionAssessment).
            5. اقتراح (suggestion) لكيفية تصنيفه.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            brand: { type: Type.STRING },
            serialNumber: { type: Type.STRING },
            conditionAssessment: { type: Type.STRING },
            suggestion: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'development') {
      console.error("Gemini Image Analysis Error:", error);
    }
    throw error;
  }
};

export const generateSmartReport = async (assets: Asset[]): Promise<string> => {
  try {
    const model = "gemini-3-flash-preview";
    
    // Simplification of asset data to reduce token usage
    const assetSummary = assets.map(a => ({
      type: a.type,
      status: a.status,
      warranty: a.warrantyExpiry,
      brand: a.brand
    }));

    const response = await ai.models.generateContent({
      model: model,
      contents: `أنت مساعد ذكي لمدير تقنية المعلومات. لديك قائمة بأصول الأجهزة (Assets) التالية:
      ${JSON.stringify(assetSummary)}
      
      المطلوب:
      1. قدم ملخصاً تنفيذياً عن حالة الأجهزة.
      2. حدد أي مخاطر محتملة (مثلاً: أجهزة كثيرة خارج الضمان قريباً، أو نسبة عالية من الأعطال).
      3. اقترح تحسينات في توزيع الأجهزة.
      
      اكتب التقرير باللغة العربية بتنسيق Markdown احترافي.`
    });

    return response.text || "لم يتم إنشاء التقرير.";
  } catch (error) {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'development') {
      console.error("Gemini Report Generation Error:", error);
    }
    return "حدث خطأ أثناء توليد التقرير الذكي.";
  }
};
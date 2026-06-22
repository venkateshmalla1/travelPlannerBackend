import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';

let ai;

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required to generate itineraries.');
  }
  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
};

// Image generator with fallback
export const generateImageBase64 = async (destinationName) => {
  try {
    const client = getGeminiClient();
    const prompt = `A breathtaking professional travel photo of ${destinationName}, showcasing landmarks and vibrant culture.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
    });

    console.log("Gemini image response:", JSON.stringify(response, null, 2));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png';
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }
    }

    // Wikimedia fallback
    return `https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/${encodeURIComponent(destinationName)}.jpg/400px-${encodeURIComponent(destinationName)}.jpg`;
  } catch (error) {
    console.error("Image generation failed:", error.message);
    return null;
  }
};

// Itinerary schema
export const ItineraryJsonSchema = {
  type: Type.OBJECT,
  properties: {
    tripSummary: {
      type: Type.OBJECT,
      properties: {
        destination: { type: Type.STRING },
        destinationImageUrl: { type: Type.STRING },
        days: { type: Type.INTEGER },
        budgetCategory: { type: Type.STRING },
        bestSeason: { type: Type.STRING },
        currency: { type: Type.STRING },
        language: { type: Type.STRING }
      }
    },
    dailyItinerary: { type: Type.ARRAY },
    recommendedHotels: { type: Type.ARRAY },
    thingsToCarry: { type: Type.OBJECT },
    safetyAndCautionTips: { type: Type.OBJECT },
    budgetBreakdown: { type: Type.OBJECT }
  }
};

// Itinerary generator
export const generateItineraryFromAI = async (promptText) => {
  const response = await getGeminiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: promptText,
    config: { responseMimeType: 'application/json', responseSchema: ItineraryJsonSchema, temperature: 0.2 }
  });
  if (!response.text) throw new Error("Empty response received from Gemini engine.");
  return JSON.parse(response.text);
};

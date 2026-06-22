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

export const ItineraryJsonSchema = {
  type: Type.OBJECT,
  properties: {
    tripSummary: {
      type: Type.OBJECT,
      properties: {
        destination: { type: Type.STRING },
        days: { type: Type.INTEGER },
        budgetCategory: { type: Type.STRING },
        bestSeason: { type: Type.STRING },
        currency: { type: Type.STRING },
        language: { type: Type.STRING }
      },
      required: ["destination", "days", "budgetCategory", "bestSeason", "currency", "language"]
    },
    dailyItinerary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          schedule: {
            type: Type.OBJECT,
            properties: { morning: { type: Type.STRING }, afternoon: { type: Type.STRING }, evening: { type: Type.STRING } },
            required: ["morning", "afternoon", "evening"]
          },
          meals: {
            type: Type.OBJECT,
            properties: {
              breakfast: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, cuisine: { type: Type.STRING }, costEstimate: { type: Type.STRING }, mapsSearchPhrase: { type: Type.STRING } } },
              lunch: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, cuisine: { type: Type.STRING }, costEstimate: { type: Type.STRING }, mapsSearchPhrase: { type: Type.STRING } } },
              dinner: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, cuisine: { type: Type.STRING }, costEstimate: { type: Type.STRING }, mapsSearchPhrase: { type: Type.STRING } } }
            }
          }
        }
      }
    },
    recommendedHotels: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING }, area: { type: Type.STRING }, tier: { type: Type.STRING }, costPerNight: { type: Type.STRING }, amenities: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    },
    thingsToCarry: {
      type: Type.OBJECT,
      properties: {
        documents: { type: Type.ARRAY, items: { type: Type.STRING } },
        electronics: { type: Type.ARRAY, items: { type: Type.STRING } },
        clothing: { type: Type.ARRAY, items: { type: Type.STRING } },
        healthAndMedical: { type: Type.ARRAY, items: { type: Type.STRING } },
        essentials: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    safetyAndCautionTips: {
      type: Type.OBJECT,
      properties: {
        localScams: { type: Type.ARRAY, items: { type: Type.STRING } },
        weatherAndTerrain: { type: Type.ARRAY, items: { type: Type.STRING } },
        emergencyContacts: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    budgetBreakdown: {
      type: Type.OBJECT,
      properties: {
        flightsOrTransit: { type: Type.INTEGER },
        accommodation: { type: Type.INTEGER },
        food: { type: Type.INTEGER },
        activities: { type: Type.INTEGER },
        miscellaneous: { type: Type.INTEGER },
        totalEstimatedBudget: { type: Type.INTEGER }
      }
    }
  }
};

export const generateItineraryFromAI = async (promptText) => {
  const response = await getGeminiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: promptText,
    config: { responseMimeType: 'application/json', responseSchema: ItineraryJsonSchema, temperature: 0.2 }
  });
  if (!response.text) throw new Error("Empty response received from Gemini engine.");
  return JSON.parse(response.text);
};

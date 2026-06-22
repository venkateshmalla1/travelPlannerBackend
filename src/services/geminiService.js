import 'dotenv/config';
<<<<<<< HEAD
import { GoogleGenAI } from '@google/genai';

let aiInstance = null;
=======
import { GoogleGenAI, Type } from '@google/genai';

let ai;
>>>>>>> 982f53935fea38209f90d24ca577fc84b3db83b3

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required to generate itineraries.');
  }
<<<<<<< HEAD
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
};

export const DailyItinerarySchema = {
  type: "object",
  properties: {
    day: { type: "integer" },
    schedule: {
      type: "object",
      properties: { 
        morning: { type: "string" }, 
        afternoon: { type: "string" }, 
        evening: { type: "string" } 
      },
      required: ["morning", "afternoon", "evening"]
    },
    meals: {
      type: "object",
      properties: {
        breakfast: {
          type: "object",
          properties: { name: { type: "string" }, cuisine: { type: "string" }, costEstimate: { type: "string" }, mapsSearchPhrase: { type: "string" } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        },
        lunch: {
          type: "object",
          properties: { name: { type: "string" }, cuisine: { type: "string" }, costEstimate: { type: "string" }, mapsSearchPhrase: { type: "string" } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        },
        dinner: {
          type: "object",
          properties: { name: { type: "string" }, cuisine: { type: "string" }, costEstimate: { type: "string" }, mapsSearchPhrase: { type: "string" } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        }
      },
      required: ["breakfast", "lunch", "dinner"]
    }
  },
  required: ["day", "schedule", "meals"]
=======

  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
>>>>>>> 982f53935fea38209f90d24ca577fc84b3db83b3
};

export const ItineraryJsonSchema = {
  type: "object",
  properties: {
    tripSummary: {
      type: "object",
      properties: {
<<<<<<< HEAD
        destination: { type: "string" },
        days: { type: "integer" },
        budgetCategory: { type: "string" },
        bestSeason: { type: "string" },
        currency: { type: "string", description: "Currency SYMBOL (e.g. $, €, ₹)" },
        language: { type: "string" }
=======
        destination: { type: Type.STRING },
        days: { type: Type.INTEGER },
        budgetCategory: { type: Type.STRING },
        bestSeason: { type: Type.STRING },
        currency: { 
  type: Type.STRING,
  description: "Currency SYMBOL for the destination (e.g. '$', '€', '₹', '£', '¥'). Do not use currency codes."
},
        language: { type: Type.STRING }
>>>>>>> 982f53935fea38209f90d24ca577fc84b3db83b3
      },
      required: ["destination", "days", "budgetCategory", "bestSeason", "currency", "language"]
    },
    dailyItinerary: {
      type: "array",
      items: DailyItinerarySchema
    },
    recommendedHotels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" }, area: { type: "string" }, tier: { type: "string" }, costPerNight: { type: "string" }, amenities: { type: "array", items: { type: "string" } }
        },
        required: ["name", "area", "tier", "costPerNight", "amenities"]
      }
    },
    thingsToCarry: {
      type: "object",
      properties: {
        documents: { type: "array", items: { type: "string" } },
        electronics: { type: "array", items: { type: "string" } },
        clothing: { type: "array", items: { type: "string" } },
        healthAndMedical: { type: "array", items: { type: "string" } },
        essentials: { type: "array", items: { type: "string" } }
      },
      required: ["documents", "electronics", "clothing", "healthAndMedical", "essentials"]
    },
    safetyAndCautionTips: {
      type: "object",
      properties: {
        localScams: { type: "array", items: { type: "string" } },
        weatherAndTerrain: { type: "array", items: { type: "string" } },
        emergencyContacts: { type: "array", items: { type: "string" } }
      },
      required: ["localScams", "weatherAndTerrain", "emergencyContacts"]
    },
    budgetBreakdown: {
      type: "object",
      properties: {
        flightsOrTransit: { type: "integer" },
        accommodation: { type: "integer" },
        food: { type: "integer" },
        activities: { type: "integer" },
        miscellaneous: { type: "integer" },
        totalEstimatedBudget: { type: "integer" }
      },
      required: ["flightsOrTransit", "accommodation", "food", "activities", "miscellaneous", "totalEstimatedBudget"]
    }
  },
  required: ["tripSummary", "dailyItinerary", "recommendedHotels", "thingsToCarry", "safetyAndCautionTips", "budgetBreakdown"]
};

<<<<<<< HEAD
export const generateItineraryFromAI = async (promptText, customSchema = ItineraryJsonSchema) => {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: promptText,
    config: { 
      responseMimeType: 'application/json', 
      responseSchema: customSchema, 
      temperature: 0.2 
    }
  });
  if (!response.text) throw new Error("Empty response received from Gemini engine.");
  return JSON.parse(response.text);
};
=======
export const generateItineraryFromAI = async (promptText) => {
  const response = await getGeminiClient().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: promptText,
    config: { responseMimeType: 'application/json', responseSchema: ItineraryJsonSchema, temperature: 0.2 }
  });
  if (!response.text) throw new Error("Empty response received from Gemini engine.");
  return JSON.parse(response.text);
};
>>>>>>> 982f53935fea38209f90d24ca577fc84b3db83b3

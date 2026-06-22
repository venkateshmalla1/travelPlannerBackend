import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

let ai = null;

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required to generate itineraries.');
  }

  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return ai;
};

// Using structural string literals instead of relying on package-level Type enum mappings
export const DailyItinerarySchema = {
  type: 'OBJECT',
  properties: {
    day: { type: 'INTEGER' },
    schedule: {
      type: 'OBJECT',
      properties: { 
        morning: { type: 'STRING' }, 
        afternoon: { type: 'STRING' }, 
        evening: { type: 'STRING' } 
      },
      required: ["morning", "afternoon", "evening"]
    },
    meals: {
      type: 'OBJECT',
      properties: {
        breakfast: {
          type: 'OBJECT',
          properties: { name: { type: 'STRING' }, cuisine: { type: 'STRING' }, costEstimate: { type: 'STRING' }, mapsSearchPhrase: { type: 'STRING' } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        },
        lunch: {
          type: 'OBJECT',
          properties: { name: { type: 'STRING' }, cuisine: { type: 'STRING' }, costEstimate: { type: 'STRING' }, mapsSearchPhrase: { type: 'STRING' } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        },
        dinner: {
          type: 'OBJECT',
          properties: { name: { type: 'STRING' }, cuisine: { type: 'STRING' }, costEstimate: { type: 'STRING' }, mapsSearchPhrase: { type: 'STRING' } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        }
      },
      required: ["breakfast", "lunch", "dinner"]
    }
  },
  required: ["day", "schedule", "meals"]
};

export const ItineraryJsonSchema = {
  type: 'OBJECT',
  properties: {
    tripSummary: {
      type: 'OBJECT',
      properties: {
        destination: { type: 'STRING' },
        days: { type: 'INTEGER' },
        budgetCategory: { type: 'STRING' },
        bestSeason: { type: 'STRING' },
        currency: { 
          type: 'STRING',
          description: "Currency SYMBOL for the destination (e.g. '$', '€', '₹', '£', '¥'). Do not use currency codes."
        },
        language: { type: 'STRING' }
      },
      required: ["destination", "days", "budgetCategory", "bestSeason", "currency", "language"]
    },
    dailyItinerary: {
      type: 'ARRAY',
      items: DailyItinerarySchema
    },
    recommendedHotels: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' }, area: { type: 'STRING' }, tier: { type: 'STRING' }, costPerNight: { type: 'STRING' }, amenities: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ["name", "area", "tier", "costPerNight", "amenities"]
      }
    },
    thingsToCarry: {
      type: 'OBJECT',
      properties: {
        documents: { type: 'ARRAY', items: { type: 'STRING' } },
        electronics: { type: 'ARRAY', items: { type: 'STRING' } },
        clothing: { type: 'ARRAY', items: { type: 'STRING' } },
        healthAndMedical: { type: 'ARRAY', items: { type: 'STRING' } },
        essentials: { type: 'ARRAY', items: { type: 'STRING' } }
      },
      required: ["documents", "electronics", "clothing", "healthAndMedical", "essentials"]
    },
    safetyAndCautionTips: {
      type: 'OBJECT',
      properties: {
        localScams: { type: 'ARRAY', items: { type: 'STRING' } },
        weatherAndTerrain: { type: 'ARRAY', items: { type: 'STRING' } },
        emergencyContacts: { type: 'ARRAY', items: { type: 'STRING' } }
      },
      required: ["localScams", "weatherAndTerrain", "emergencyContacts"]
    },
    budgetBreakdown: {
      type: 'OBJECT',
      properties: {
        flightsOrTransit: { type: 'INTEGER' },
        accommodation: { type: 'INTEGER' },
        food: { type: 'INTEGER' },
        activities: { type: 'INTEGER' },
        miscellaneous: { type: 'INTEGER' },
        totalEstimatedBudget: { type: 'INTEGER' }
      },
      required: ["flightsOrTransit", "accommodation", "food", "activities", "miscellaneous", "totalEstimatedBudget"]
    }
  },
  required: ["tripSummary", "dailyItinerary", "recommendedHotels", "thingsToCarry", "safetyAndCautionTips", "budgetBreakdown"]
};

export const generateItineraryFromAI = async (promptText, customSchema = ItineraryJsonSchema) => {
  try {
    const response = await getGeminiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${promptText}\n\nIMPORTANT: Produce valid JSON data mapping the target parameters cleanly.`,
      config: { 
        responseMimeType: 'application/json', 
        responseSchema: customSchema, 
        temperature: 0.2 
      }
    });
    if (!response.text) throw new Error("Empty response received from Gemini engine.");
    return JSON.parse(response.text);
  } catch (error) {
    console.error("CRITICAL AI PIPELINE REJECTION TRACE:", error);
    throw error;
  }
};

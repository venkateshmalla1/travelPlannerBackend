import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

let aiInstance = null;

const getGeminiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required to generate itineraries.');
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
};

// Simplified clean schema nodes to eliminate strict validation runtime traps
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
          properties: { name: { type: "string" }, cuisine: { type: "string" }, costEstimate: { type: "string" }, mapsSearchPhrase: { type: "string" } }
        },
        lunch: {
          type: "object",
          properties: { name: { type: "string" }, cuisine: { type: "string" }, costEstimate: { type: "string" }, mapsSearchPhrase: { type: "string" } }
        },
        dinner: {
          type: "object",
          properties: { name: { type: "string" }, cuisine: { type: "string" }, costEstimate: { type: "string" }, mapsSearchPhrase: { type: "string" } }
        }
      }
    }
  },
  required: ["day", "schedule", "meals"]
};

export const ItineraryJsonSchema = {
  type: "object",
  properties: {
    tripSummary: {
      type: "object",
      properties: {
        destination: { type: "string" },
        days: { type: "integer" },
        budgetCategory: { type: "string" },
        bestSeason: { type: "string" },
        currency: { type: "string" },
        language: { type: "string" }
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
          name: { type: "string" }, 
          area: { type: "string" }, 
          tier: { type: "string" }, 
          costPerNight: { type: "string" }, 
          amenities: { type: "array", items: { type: "string" } }
        }
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
      }
    },
    safetyAndCautionTips: {
      type: "object",
      properties: {
        localScams: { type: "array", items: { type: "string" } },
        weatherAndTerrain: { type: "array", items: { type: "string" } },
        emergencyContacts: { type: "array", items: { type: "string" } }
      }
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
      }
    }
  },
  required: ["tripSummary", "dailyItinerary", "recommendedHotels", "budgetBreakdown"]
};

export const generateItineraryFromAI = async (promptText, customSchema = ItineraryJsonSchema) => {
  const client = getGeminiClient();
  
  // Adjusted execution syntax mapping specifically for newer @google/genai structured outputs
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: promptText,
    config: {
      responseMimeType: 'application/json',
      responseSchema: customSchema,
      temperature: 0.2
    }
  });

  if (!response || !response.text) {
    throw new Error("Empty response received from Gemini engine structure.");
  }
  
  return JSON.parse(response.text);
};

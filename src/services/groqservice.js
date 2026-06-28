import 'dotenv/config';
import OpenAI from 'openai';

let groq;

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required to generate itineraries.');
  }
  groq ??= new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"   // ✅ Groq’s OpenAI-compatible endpoint
  });
  return groq;
};

// ✅ Exported DailyItinerarySchema
export const DailyItinerarySchema = {
  type: 'object',
  properties: {
    day: { type: 'integer' },
    schedule: {
      type: 'object',
      properties: {
        morning: { type: 'string' },
        afternoon: { type: 'string' },
        evening: { type: 'string' }
      },
      required: ["morning", "afternoon", "evening"],
      additionalProperties: false
    },
    meals: {
      type: 'object',
      properties: {
        breakfast: { type: 'object', properties: { name: { type: 'string' }, cuisine: { type: 'string' }, costEstimate: { type: 'string' }, mapsSearchPhrase: { type: 'string' } }, required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"], additionalProperties: false },
        lunch: { type: 'object', properties: { name: { type: 'string' }, cuisine: { type: 'string' }, costEstimate: { type: 'string' }, mapsSearchPhrase: { type: 'string' } }, required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"], additionalProperties: false },
        dinner: { type: 'object', properties: { name: { type: 'string' }, cuisine: { type: 'string' }, costEstimate: { type: 'string' }, mapsSearchPhrase: { type: 'string' } }, required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"], additionalProperties: false }
      },
      required: ["breakfast", "lunch", "dinner"],
      additionalProperties: false
    }
  },
  required: ["day", "schedule", "meals"],
  additionalProperties: false
};

// ✅ Exported ItineraryJsonSchema with currency descriptions
export const ItineraryJsonSchema = {
  type: 'object',
  properties: {
    tripSummary: {
      type: 'object',
      properties: {
        destination: { type: 'string' },
        days: { type: 'integer' },
        budgetCategory: { type: 'string' },
        travelType: { type: 'string' },
        bestSeason: { type: 'string' },
        currency: { type: 'string', description: "Currency code (e.g. 'USD', 'INR')" },
        currencySymbol: { type: 'string', description: "Currency SYMBOL only (e.g. '$', '₹', '€', '£'). Do not return currency names." },
        language: { type: 'string' }
      },
      required: ["destination", "days", "budgetCategory", "bestSeason", "currency", "currencySymbol", "language"],
      additionalProperties: false
    },
    dailyItinerary: { type: 'array', items: DailyItinerarySchema },
    recommendedHotels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          area: { type: 'string' },
          tier: { type: 'string' },
          costPerNight: { type: 'string' },
          amenities: { type: 'array', items: { type: 'string' } },
          imageUrl: { type: 'string' }
        },
        required: ["name", "area", "tier", "costPerNight", "amenities", "imageUrl"],
        additionalProperties: false
      }
    },
    thingsToCarry: {
      type: 'object',
      properties: {
        documents: { type: 'array', items: { type: 'string' } },
        electronics: { type: 'array', items: { type: 'string' } },
        clothing: { type: 'array', items: { type: 'string' } },
        healthAndMedical: { type: 'array', items: { type: 'string' } },
        essentials: { type: 'array', items: { type: 'string' } }
      },
      additionalProperties: false
    },
    safetyAndCautionTips: {
      type: 'object',
      properties: {
        localScams: { type: 'array', items: { type: 'string' } },
        weatherAndTerrain: { type: 'array', items: { type: 'string' } },
        emergencyContacts: { type: 'array', items: { type: 'string' } }
      },
      additionalProperties: false
    },
    budgetBreakdown: {
      type: 'object',
      properties: {
        currency: { type: 'string', description: "Currency SYMBOL only (e.g. '$', '₹', '€', '£')" },
        flightsOrTransit: { type: 'integer' },
        accommodation: { type: 'integer' },
        food: { type: 'integer' },
        activities: { type: 'integer' },
        miscellaneous: { type: 'integer' },
        totalEstimatedBudget: { type: 'integer' }
      },
      required: ["currency", "flightsOrTransit", "accommodation", "food", "activities", "miscellaneous", "totalEstimatedBudget"],
      additionalProperties: false
    }
  },
  required: ["tripSummary", "dailyItinerary", "recommendedHotels", "thingsToCarry", "safetyAndCautionTips", "budgetBreakdown"],
  additionalProperties: false
};

// ✅ Exported generator function using Groq’s OpenAI-compatible client
export const generateItineraryFromAI = async (promptText, customSchema = ItineraryJsonSchema) => {
  try {
    const groq = getGroqClient();

    const response = await groq.responses.create({
      model: "openai/gpt-oss-20b", // ✅ Groq’s OpenAI-compatible model
      input: `You are an expert travel planner. Return ONLY a valid JSON object that matches the schema.
Rules:
- tripSummary.currency must be the currency code (e.g. USD, INR).
- tripSummary.currencySymbol must be the symbol (e.g. $, ₹).
- budgetBreakdown.currency must also be a symbol.
Do not return words like "USD" or "INR" in currencySymbol.

User prompt: ${promptText}`,
      response_format: { type: "json_object" }
    });

    if (!response.output_text) throw new Error("Empty response from Groq.");
    return JSON.parse(response.output_text);

  } catch (error) {
    console.error("CRITICAL AI PIPELINE REJECTION TRACE:", error);
    throw error;
  }
};

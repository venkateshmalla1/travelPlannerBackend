import 'dotenv/config';
import Groq from 'groq-sdk';

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required to generate itineraries.');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

// Groq schema types must be standard lowercase strings ('object', 'string', 'integer', 'array')
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
      required: ["morning", "afternoon", "evening"]
    },
    meals: {
      type: 'object',
      properties: {
        breakfast: {
          type: 'object',
          properties: { name: { type: 'string' }, cuisine: { type: 'string' }, costEstimate: { type: 'string' }, mapsSearchPhrase: { type: 'string' } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        },
        lunch: {
          type: 'object',
          properties: { name: { type: 'string' }, cuisine: { type: 'string' }, costEstimate: { type: 'string' }, mapsSearchPhrase: { type: 'string' } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        },
        dinner: {
          type: 'object',
          properties: { name: { type: 'string' }, cuisine: { type: 'string' }, costEstimate: { type: 'string' }, mapsSearchPhrase: { type: 'string' } },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"]
        }
      },
      required: ["breakfast", "lunch", "dinner"]
    }
  },
  required: ["day", "schedule", "meals"]
};

export const ItineraryJsonSchema = {
  type: 'object',
  properties: {
    tripSummary: {
      type: 'object',
      properties: {
        destination: { type: 'string' },
        days: { type: 'integer' },
        budgetCategory: { type: 'string' },
        bestSeason: { type: 'string' },
        currency: { 
          type: 'string',
          description: "Currency SYMBOL for the destination (e.g. '$', '€', '₹'). Do not use alphanumeric currency codes."
        },
        language: { type: 'string' }
      },
      required: ["destination", "days", "budgetCategory", "bestSeason", "currency", "language"]
    },
    dailyItinerary: {
      type: 'array',
      items: DailyItinerarySchema
    },
    recommendedHotels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' }, area: { type: 'string' }, tier: { type: 'string' }, costPerNight: { type: 'string' }, amenities: { type: 'array', items: { type: 'string' } }
        },
        required: ["name", "area", "tier", "costPerNight", "amenities"]
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
      required: ["documents", "electronics", "clothing", "healthAndMedical", "essentials"]
    },
    safetyAndCautionTips: {
      type: 'object',
      properties: {
        localScams: { type: 'array', items: { type: 'string' } },
        weatherAndTerrain: { type: 'array', items: { type: 'string' } },
        emergencyContacts: { type: 'array', items: { type: 'string' } }
      },
      required: ["localScams", "weatherAndTerrain", "emergencyContacts"]
    },
    budgetBreakdown: {
      type: 'object',
      properties: {
        flightsOrTransit: { type: 'integer' },
        accommodation: { type: 'integer' },
        food: { type: 'integer' },
        activities: { type: 'integer' },
        miscellaneous: { type: 'integer' },
        totalEstimatedBudget: { type: 'integer' }
      },
      required: ["flightsOrTransit", "accommodation", "food", "activities", "miscellaneous", "totalEstimatedBudget"]
    }
  },
  required: ["tripSummary", "dailyItinerary", "recommendedHotels", "thingsToCarry", "safetyAndCautionTips", "budgetBreakdown"]
};

/**
 * Generates structured travel data from Groq utilizing strict JSON schema enforcement.
 * @param {string} promptText - The prompt containing user travel preferences or modification context.
 * @param {object} customSchema - Defaults to the entire multi-day layout, or can accept DailyItinerarySchema for single-day modifications.
 */
export const generateItineraryFromAI = async (promptText, customSchema = ItineraryJsonSchema) => {
  try {
    const groq = getGroqClient();
    
    // Dynamically derive a schema name configuration depending on the applied layout context
    const schemaName = customSchema === ItineraryJsonSchema ? "travel_itinerary" : "modified_day_itinerary";

    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192', 
      messages: [
        { 
          role: 'system', 
          content: 'You are an elite, professional travel planner. Return a pure, unadorned JSON object conforming structurally to the strict schema provided. Avoid all markdown wrappers or chat prefaces.' 
        },
        { 
          role: 'user', 
          content: promptText 
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schemaName,
          schema: customSchema
        }
      },
      temperature: 0.2 // Lowered for precise data adherence and structural stability
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response received from Groq engine.");
    
    return JSON.parse(content);
  } catch (error) {
    console.error("CRITICAL AI PIPELINE REJECTION TRACE:", error);
    throw error;
  }
};
import 'dotenv/config';
import OpenAI from 'openai';

let groq;

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required to generate itineraries.');
  }
  groq ??= new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
  });
  return groq;
};

// ✅ Schemas
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
        currency: { type: 'string' },
        currencySymbol: { type: 'string' },
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
      required: ["documents", "electronics", "clothing", "healthAndMedical", "essentials"],
      additionalProperties: false
    },
    safetyAndCautionTips: {
      type: 'object',
      properties: {
        localScams: { type: 'array', items: { type: 'string' } },
        weatherAndTerrain: { type: 'array', items: { type: 'string' } },
        emergencyContacts: { type: 'array', items: { type: 'string' } }
      },
      required: ["localScams", "weatherAndTerrain", "emergencyContacts"],
      additionalProperties: false
    },
    budgetBreakdown: {
      type: 'object',
      properties: {
        currency: { type: 'string' },
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

export const generateItineraryFromAI = async (promptText, customSchema = ItineraryJsonSchema) => {
  try {
    const client = getGroqClient();

    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",           // Best balance for token limits
      messages: [
        {
          role: "system",
          content: `You are an expert travel planner. Respond with ONLY a valid JSON object matching the schema exactly.
Include all required fields. Use realistic data.

Rules:
- tripSummary.currency = currency code (e.g. "USD", "INR")
- tripSummary.currencySymbol = symbol only (e.g. "$", "₹", "€")
- budgetBreakdown.currency = symbol only`
        },
        {
          role: "user",
          content: promptText
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 6000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq.");

    return JSON.parse(content);

  } catch (error) {
    console.error("CRITICAL AI PIPELINE REJECTION TRACE:", error);
    throw error;
  }
};
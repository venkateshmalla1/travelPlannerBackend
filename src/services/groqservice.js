import 'dotenv/config';
import Groq from 'groq-sdk';

const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required to generate itineraries.');
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
};

// Updated schemas with additionalProperties: false for strict mode
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
        breakfast: {
          type: 'object',
          properties: { 
            name: { type: 'string' }, 
            cuisine: { type: 'string' }, 
            costEstimate: { type: 'string' }, 
            mapsSearchPhrase: { type: 'string' } 
          },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"],
          additionalProperties: false
        },
        lunch: {
          type: 'object',
          properties: { 
            name: { type: 'string' }, 
            cuisine: { type: 'string' }, 
            costEstimate: { type: 'string' }, 
            mapsSearchPhrase: { type: 'string' } 
          },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"],
          additionalProperties: false
        },
        dinner: {
          type: 'object',
          properties: { 
            name: { type: 'string' }, 
            cuisine: { type: 'string' }, 
            costEstimate: { type: 'string' }, 
            mapsSearchPhrase: { type: 'string' } 
          },
          required: ["name", "cuisine", "costEstimate", "mapsSearchPhrase"],
          additionalProperties: false
        }
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
        bestSeason: { type: 'string' },
        currency: { type: 'string', description: "Currency SYMBOL (e.g. '$', '₹')." },
        language: { type: 'string' }
      },
      required: ["destination", "days", "budgetCategory", "bestSeason", "currency", "language"],
      additionalProperties: false
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
          name: { type: 'string' }, 
          area: { type: 'string' }, 
          tier: { type: 'string' }, 
          costPerNight: { type: 'string' }, 
          amenities: { type: 'array', items: { type: 'string' } }
        },
        required: ["name", "area", "tier", "costPerNight", "amenities"],
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
        flightsOrTransit: { type: 'integer' }, 
        accommodation: { type: 'integer' }, 
        food: { type: 'integer' }, 
        activities: { type: 'integer' }, 
        miscellaneous: { type: 'integer' }, 
        totalEstimatedBudget: { type: 'integer' }
      },
      required: ["flightsOrTransit", "accommodation", "food", "activities", "miscellaneous", "totalEstimatedBudget"],
      additionalProperties: false
    }
  },
  required: ["tripSummary", "dailyItinerary", "recommendedHotels", "thingsToCarry", "safetyAndCautionTips", "budgetBreakdown"],
  additionalProperties: false
};

export const generateItineraryFromAI = async (promptText, customSchema = ItineraryJsonSchema) => {
  try {
    const groq = getGroqClient();
    const schemaName = customSchema === ItineraryJsonSchema ? "travel_itinerary" : "modified_day_itinerary";

    const response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional travel planner. Return a pure JSON object matching the schema exactly. Do not add any extra text, explanations, or markdown.' 
        },
        { role: 'user', content: promptText }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { 
          name: schemaName, 
          strict: true,
          schema: customSchema 
        }
      },
      temperature: 0.2
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response received from Groq engine.");

    return JSON.parse(content);
  } catch (error) {
    console.error("CRITICAL AI PIPELINE REJECTION TRACE:", error);

    if (error?.message?.includes('json_schema') || error?.status === 400) {
      console.warn("json_schema not supported. Falling back to json_object mode...");
      return await fallbackJsonGeneration(promptText);
    }

    throw error;
  }
};

const fallbackJsonGeneration = async (promptText) => {
  try {
    const groq = getGroqClient();

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { 
          role: 'system', 
          content: 'You are a professional travel planner. Respond ONLY with valid JSON matching the exact structure requested. No extra text.' 
        },
        { role: 'user', content: promptText }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response in fallback mode.");

    return JSON.parse(content);
  } catch (fallbackError) {
    console.error("Fallback also failed:", fallbackError);
    throw fallbackError;
  }
};
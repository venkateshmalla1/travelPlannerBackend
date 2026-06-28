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

// Dummy exports to prevent import errors in api.js
export const DailyItinerarySchema = {};
export const ItineraryJsonSchema = {};

export const generateItineraryFromAI = async (promptText) => {
  try {
    const client = getGroqClient();

    const systemPrompt = `You are an expert travel planner. Return ONLY valid JSON with this exact structure:

{
  "tripSummary": {
    "destination": "",
    "days": 0,
    "budgetCategory": "",
    "travelType": "",
    "bestSeason": "",
    "currency": "",
    "currencySymbol": "",
    "language": ""
  },
  "dailyItinerary": [
    {
      "day": 1,
      "schedule": { "morning": "", "afternoon": "", "evening": "" },
      "meals": {
        "breakfast": { "name": "", "cuisine": "", "costEstimate": "", "mapsSearchPhrase": "" },
        "lunch": { "name": "", "cuisine": "", "costEstimate": "", "mapsSearchPhrase": "" },
        "dinner": { "name": "", "cuisine": "", "costEstimate": "", "mapsSearchPhrase": "" }
      }
    }
  ],
  "recommendedHotels": [
    { "name": "", "area": "", "tier": "", "costPerNight": "", "amenities": [], "imageUrl": "" }
  ],
  "thingsToCarry": {
    "documents": [], "electronics": [], "clothing": [], "healthAndMedical": [], "essentials": []
  },
  "safetyAndCautionTips": {
    "localScams": [], "weatherAndTerrain": [], "emergencyContacts": []
  },
  "budgetBreakdown": {
    "currency": "",
    "flightsOrTransit": 0,
    "accommodation": 0,
    "food": 0,
    "activities": 0,
    "miscellaneous": 0,
    "totalEstimatedBudget": 0
  }
}

Fill all sections with realistic data. No extra text.`;

    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptText }
      ],
      temperature: 0.3,
      max_tokens: 5500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq.");

    return JSON.parse(content);

  } catch (error) {
    console.error("CRITICAL AI PIPELINE REJECTION TRACE:", error);
    throw error;
  }
};
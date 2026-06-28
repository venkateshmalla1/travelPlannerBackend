// src/services/grokqservice.js
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateItineraryFromAI(destination, days, budgetCategory) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-70b-versatile",   // ✅ updated model
      messages: [
        {
          role: "system",
          content: "You are a travel planner AI. Generate a detailed itinerary."
        },
        {
          role: "user",
          content: `Plan a ${days}-day trip to ${destination} with a ${budgetCategory} budget. 
                    Include trip summary, daily itinerary, recommended hotels, and activities.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    // Extract AI response
    const itineraryText = response.choices[0].message.content;
    return JSON.parse(itineraryText); // assuming your AI returns JSON
  } catch (err) {
    console.error("AI itinerary generation failed:", err);
    throw err;
  }
}

// Locate this block inside routes/api.js and update the route handler:
import { generateItineraryFromAI, generateImageBase64 } from '../services/geminiService.js';

router.post('/trips/generate', authenticateToken, async (req, res) => {
  try {
    const { destination, numberOfDays, budgetCategory, interests = [] } = req.body;
    const interestList = Array.isArray(interests) ? interests : [interests].filter(Boolean];
    
    // Create tracking reference in DB
    const travelDetails = await TravelDetails.create({ userId: req.userId, destination, numberOfDays, budgetCategory, interests: interestList });

    const prompt = `Create a travel itinerary for "${destination}". Duration: ${numberOfDays} days. Budget: "${budgetCategory}". Interests: ${interestList.join(', ')}. Include thingsToCarry, safetyAndCautionTips, and contextually categorized hotel suggestions.`;

    // RUN CONCURRENTLY: Generate itinerary structure and render the destination asset
    const [structuredAiOutput, base64ImageString] = await Promise.all([
      generateItineraryFromAI(prompt),
      generateImageBase64(destination)
    ]);

    // Bind the generated data-uri image string inside the trip Summary node
    if (structuredAiOutput.tripSummary) {
      structuredAiOutput.tripSummary.destinationImageUrl = base64ImageString || "";
    }

    // Save final combined object to DB
    const savedItinerary = await AiResponse.create({ 
      userId: req.userId, 
      travelDetailsId: travelDetails._id, 
      ...structuredAiOutput 
    });

    res.status(201).json({ travelDetails, itinerary: savedItinerary });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

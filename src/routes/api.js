import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, TravelDetails, AiResponse } from '../models/Schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateItineraryFromAI, DailyItinerarySchema } from '../services/grokqservice.js';

const router = Router();

// Helper to safely catch 4XX/5XX API token limits or structural crashes
const handleAiCall = async (res, logLabel, aiTaskPromise) => {
  try {
    return await aiTaskPromise;
  } catch (aiErr) {
    console.error(`${logLabel} FAILURE:`, aiErr);

    // Extract status code if available from the API response error object (defaults to 503)
    const statusCode = aiErr.status || aiErr.response?.status || 503;
    
    // Catch any 4XX (e.g. 429 Too Many Requests) or 5XX (e.g. 500 Internal Error)
    if (statusCode >= 400 && statusCode < 600) {
      return res.status(statusCode).json({ error: "AI is busy, please try again later" });
    }
    
    // Fallback error fallback if it's an unrelated code failure
    return res.status(500).json({ error: aiErr.message });
  }
};

// Authentication Handling
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser._id, name, email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Clean Generation Pipeline
router.post('/trips/generate', authenticateToken, async (req, res) => {
  try {
    let { destination, numberOfDays, budgetCategory, interests = [] } = req.body;
    if (!destination || !numberOfDays || !budgetCategory) {
      return res.status(400).json({ error: "Missing required core itinerary fields." });
    }

    // Capitalize to prevent strict Mongoose Schema enum verification rejections ('low' -> 'Low')
    budgetCategory = budgetCategory.trim().charAt(0).toUpperCase() + budgetCategory.trim().slice(1).toLowerCase();

    const interestList = Array.isArray(interests) ? interests : [interests].filter(Boolean);
    const travelDetails = await TravelDetails.create({ userId: req.userId, destination, numberOfDays: Number(numberOfDays), budgetCategory, interests: interestList });

    const prompt = `Create a travel itinerary for "${destination}". Duration: ${numberOfDays} days. Budget: "${budgetCategory}". Interests: ${interestList.join(', ')}. Populate structural fields accurately according to the JSON format schemas.`;
    
    // Safely execute the AI pipeline
    const structuredAiOutput = await handleAiCall(
      res, 
      "AI GENERATOR INTERNAL CRASH TRACE", 
      generateItineraryFromAI(prompt)
    );
    if (!structuredAiOutput || res.headersSent) return; // Stop execution if helper already responded with error

    const savedItinerary = await AiResponse.create({ userId: req.userId, travelDetailsId: travelDetails._id, ...structuredAiOutput });
    res.status(201).json({ travelDetails, itinerary: savedItinerary });
  } catch (err) { 
    console.error("GLOBAL SERVER BLOCK RUNTIME FAILURE:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message }); 
  }
});

router.get('/trips', authenticateToken, async (req, res) => {
  try {
    const userItineraries = await AiResponse.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(userItineraries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/trips/:id/modify-day', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetDay, changeInstructions } = req.body;

    const currentTrip = await AiResponse.findOne({ _id: id, userId: req.userId });
    if (!currentTrip) return res.status(404).json({ error: 'Trip not found or access denied.' });

    const dayIndex = currentTrip.dailyItinerary.findIndex(d => d.day === Number(targetDay));
    if (dayIndex === -1) return res.status(400).json({ error: 'Target day sequence not found.' });

    const daySchedule = currentTrip.dailyItinerary[dayIndex];
    const prompt = `Modify Day ${targetDay} of an itinerary for ${currentTrip.tripSummary.destination}. Current state: ${JSON.stringify(daySchedule)}. Instruction: "${changeInstructions}". Return a single updated dailyItinerary day item node matching structural specifications.`;
    
    // Safely execute modification AI pipeline
    const updatedDayJson = await handleAiCall(
      res,
      "AI GENERATOR MODIFY DAY CRASH TRACE",
      generateItineraryFromAI(prompt, DailyItinerarySchema)
    );
    if (!updatedDayJson || res.headersSent) return; // Stop execution if helper already responded with error
    
    // FIX: Replaced direct object overwrite with Mongoose `.set()` to safely trigger internal change flags
    currentTrip.dailyItinerary[dayIndex].set({ ...updatedDayJson, day: Number(targetDay) });
    await currentTrip.save();
    
    res.status(200).json({ message: "Itinerary day altered cleanly", refreshedTrip: currentTrip });
  } catch (err) { 
    console.error("MODIFY DAY ERROR:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message }); 
  }
});

export default router;

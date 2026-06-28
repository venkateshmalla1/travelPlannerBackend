import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, TravelDetails, AiResponse } from '../models/Schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateItineraryFromAI } from '../services/groqservice.js';

const router = Router();

// Helper to safely catch AI errors
const handleAiCall = async (res, logLabel, aiTaskPromise) => {
  try {
    return await aiTaskPromise;
  } catch (aiErr) {
    console.error(`${logLabel} FAILURE:`, aiErr);
    const statusCode = aiErr.status || aiErr.response?.status || 503;
    if (statusCode >= 400 && statusCode < 600) {
      return res.status(statusCode).json({ error: "AI processing capacity is busy, please try again shortly." });
    }
    return res.status(500).json({ error: aiErr.message });
  }
};

// Authentication: Register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password fields are all required.' });
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) return res.status(400).json({ error: 'User already exists with this email address.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email: sanitizedEmail, password: hashedPassword });
    
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser._id, name, email: sanitizedEmail } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Authentication: Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Both email and password elements are required.' });

    const sanitizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password parameters' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: sanitizedEmail } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Trip Generation Endpoint
router.post('/trips/generate', authenticateToken, async (req, res) => {
  try {
    let { destination, numberOfDays, budgetCategory, interests = [] } = req.body;
    if (!destination || !numberOfDays || !budgetCategory) {
      return res.status(400).json({ error: "Missing required core itinerary fields." });
    }

    budgetCategory = budgetCategory.trim().charAt(0).toUpperCase() + budgetCategory.trim().slice(1).toLowerCase();
    const interestList = Array.isArray(interests) ? interests : [interests].filter(Boolean);

    const travelDetails = await TravelDetails.create({
      userId: req.userId,
      destination,
      numberOfDays: Number(numberOfDays),
      budgetCategory,
      interests: interestList
    });

    // High fidelity schema instruction block inside prompt context string
    const prompt = `Create an exhaustive travel itinerary for destination: "${destination}". Duration: ${numberOfDays} days. Budget Category Target: "${budgetCategory}". Traveler Interests: ${interestList.join(', ')}. 
    Your returned JSON object must strictly fulfill this layout scheme:
    { 
      "tripSummary": { "destination": "${destination}", "days": ${numberOfDays}, "budgetCategory": "${budgetCategory}", "bestSeason": "", "currency": "", "language": "" },
      "dailyItinerary": [ { "day": 1, "schedule": { "morning": "", "afternoon": "", "evening": "" }, "meals": { "breakfast": { "name": "", "cuisine": "", "costEstimate": "", "mapsSearchPhrase": "" }, "lunch": {}, "dinner": {} } } ],
      "recommendedHotels": [ { "name": "", "area": "", "tier": "", "costPerNight": "", "amenities": [] } ],
      "thingsToCarry": { "documents": [], "electronics": [], "clothing": [], "healthAndMedical": [], "essentials": [] },
      "safetyAndCautionTips": { "localScams": [], "weatherAndTerrain": [], "emergencyContacts": [] },
      "budgetBreakdown": { "flightsOrTransit": 0, "accommodation": 0, "food": 0, "activities": 0, "miscellaneous": 0, "totalEstimatedBudget": 0 }
    }`;

    const structuredAiOutput = await handleAiCall(
      res,
      "AI GENERATOR INTERNAL CRASH TRACE",
      generateItineraryFromAI(prompt)
    );
    if (!structuredAiOutput || res.headersSent) return;

    const savedItinerary = await AiResponse.create({
      userId: req.userId,
      travelDetailsId: travelDetails._id,
      ...structuredAiOutput
    });

    res.status(201).json({ travelDetails, itinerary: savedItinerary });
  } catch (err) {
    console.error("GLOBAL SERVER BLOCK RUNTIME FAILURE:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Fetch Active User Histories
router.get('/trips', authenticateToken, async (req, res) => {
  try {
    const userItineraries = await AiResponse.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(userItineraries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Modify Single Targeted Target Day In-Place
router.patch('/trips/:id/modify-day', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetDay, changeInstructions } = req.body;

    if (!targetDay || !changeInstructions) {
      return res.status(400).json({ error: "Target day indicator and target change instructions are required." });
    }

    const currentTrip = await AiResponse.findOne({ _id: id, userId: req.userId });
    if (!currentTrip) return res.status(404).json({ error: 'Requested trip profile profile not found or access unauthorized.' });

    const dayIndex = currentTrip.dailyItinerary.findIndex(d => d.day === Number(targetDay));
    if (dayIndex === -1) return res.status(400).json({ error: 'Target day sequence index path not found.' });

    const daySchedule = currentTrip.dailyItinerary[dayIndex];
    const prompt = `Modify Day ${targetDay} of travel itinerary for ${currentTrip.tripSummary.destination}. 
    Current structure layout value: ${JSON.stringify(daySchedule)}. 
    Modification Requirement instruction: "${changeInstructions}". 
    Return an updated JSON object corresponding ONLY to the nested structure map of a single target daily item: { "schedule": { "morning": "", "afternoon": "", "evening": "" }, "meals": { "breakfast": {"name":"","cuisine":"","costEstimate":"","mapsSearchPhrase":""}, "lunch": {...}, "dinner": {...} } }`;

    const updatedDayJson = await handleAiCall(
      res,
      "AI GENERATOR MODIFY DAY CRASH TRACE",
      generateItineraryFromAI(prompt)
    );
    if (!updatedDayJson || res.headersSent) return;

    currentTrip.dailyItinerary[dayIndex].set({ ...updatedDayJson, day: Number(targetDay) });
    await currentTrip.save();

    res.status(200).json({ message: "Itinerary sequence data structural correction altered cleanly.", refreshedTrip: currentTrip });
  } catch (err) {
    console.error("MODIFY DAY RUNTIME TRACK EXCEPTION:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

export default router;
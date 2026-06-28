import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, TravelDetails, AiResponse } from '../models/Schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateItineraryFromAI, DailyItinerarySchema } from '../services/groqservice.js';

const router = Router();

const handleAiCall = async (res, logLabel, aiTaskPromise) => {
  try {
    return await aiTaskPromise;
  } catch (aiErr) {
    console.error(`${logLabel} FAILURE:`, aiErr);
    res.status(503).json({ error: "AI processing capacity is busy, please try again shortly." });
    return null;
  }
};

// Auth Routes
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });

    const sanitizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) return res.status(400).json({ error: 'User already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email: sanitizedEmail, password: hashedPassword });
    
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser._id, name, email: sanitizedEmail } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '7d' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Trip Management Routes
router.post('/trips/generate', authenticateToken, async (req, res) => {
  try {
    let { destination, numberOfDays, budgetCategory, interests = [] } = req.body;
    if (!destination || !numberOfDays || !budgetCategory) return res.status(400).json({ error: "Missing core itinerary fields." });

    budgetCategory = budgetCategory.trim().charAt(0).toUpperCase() + budgetCategory.trim().slice(1).toLowerCase();
    const travelDetails = await TravelDetails.create({
      userId: req.userId, destination, numberOfDays: Number(numberOfDays), budgetCategory, interests: Array.isArray(interests) ? interests : [interests]
    });

    const prompt = `Create an exhaustive travel itinerary for destination: "${destination}". Duration: ${numberOfDays} days. Budget Profile: "${budgetCategory}". Interests: ${interests}.`;
    const structuredAiOutput = await handleAiCall(res, "GENERATOR", generateItineraryFromAI(prompt));
    
    if (!structuredAiOutput) return;

    const savedItinerary = await AiResponse.create({ userId: req.userId, travelDetailsId: travelDetails._id, ...structuredAiOutput });
    res.status(201).json({ travelDetails, itinerary: savedItinerary });
  } catch (err) { 
    if (!res.headersSent) res.status(500).json({ error: err.message }); 
  }
});

router.get('/trips', authenticateToken, async (req, res) => {
  try {
    const itineraries = await AiResponse.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(itineraries);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/trips/:id/modify-day', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetDay, changeInstructions } = req.body;

    const currentTrip = await AiResponse.findOne({ _id: id, userId: req.userId });
    if (!currentTrip) return res.status(404).json({ error: 'Trip context not found.' });

    const dayIndex = currentTrip.dailyItinerary.findIndex(d => d.day === Number(targetDay));
    if (dayIndex === -1) return res.status(400).json({ error: 'Target day sequence index out of bounds.' });

    const prompt = `Modify Day ${targetDay} of itinerary for ${currentTrip.tripSummary.destination}. Current state: ${JSON.stringify(currentTrip.dailyItinerary[dayIndex])}. Adjustment instruction: "${changeInstructions}".`;
    const updatedDayJson = await handleAiCall(res, "MODIFY_DAY", generateItineraryFromAI(prompt, DailyItinerarySchema));
    
    if (!updatedDayJson) return;

    // ✅ Normalize AI output: unwrap if nested inside dailyItinerary
    const dynamicDayData = updatedDayJson.dailyItinerary?.[0] || updatedDayJson;

    currentTrip.dailyItinerary[dayIndex].set({ ...dynamicDayData, day: Number(targetDay) });
    await currentTrip.save();
    res.status(200).json({ message: "Itinerary day modified clean.", refreshedTrip: currentTrip });
  } catch (err) { 
    if (!res.headersSent) res.status(500).json({ error: err.message }); 
  }
});

export default router;

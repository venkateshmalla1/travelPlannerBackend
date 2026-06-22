import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, TravelDetails, AiResponse } from '../models/Schemas.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateItineraryFromAI, generateImageBase64 } from '../services/geminiService.js';

const router = Router();

// Register
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password: hashedPassword });
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: newUser._id, name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate trip itinerary
router.post('/trips/generate', authenticateToken, async (req, res) => {
  try {
    const { destination, numberOfDays, budgetCategory, interests = [] } = req.body;
    const interestList = Array.isArray(interests) ? interests : [interests].filter(Boolean);

    const travelDetails = await TravelDetails.create({
      userId: req.userId,
      destination,
      numberOfDays,
      budgetCategory,
      interests: interestList
    });

    const prompt = `Create a travel itinerary for "${destination}".
Duration: ${numberOfDays} days.
Budget: "${budgetCategory}".
Interests: ${interestList.join(', ')}.
Include thingsToCarry, safetyAndHealthTips, and a structured dailyItinerary.`;

    const structuredAiOutput = await generateItineraryFromAI(prompt);

    // Try to generate an image; if it fails, use a safe fallback URL
    let destinationImageUrl = await generateImageBase64(destination);
    if (!destinationImageUrl) {
      // Wikimedia fallback (best-effort). Adjust or replace with your preferred placeholder.
      destinationImageUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/${encodeURIComponent(destination)}.jpg/400px-${encodeURIComponent(destination)}.jpg`;
    }

    const savedItinerary = await AiResponse.create({
      userId: req.userId,
      travelDetailsId: travelDetails._id,
      ...structuredAiOutput,
      tripSummary: {
        ...structuredAiOutput.tripSummary,
        destinationImageUrl
      }
    });

    res.status(201).json({ travelDetails, itinerary: savedItinerary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trips
router.get('/trips', authenticateToken, async (req, res) => {
  try {
    const userItineraries = await AiResponse.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(userItineraries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modify a specific day in trip itinerary
router.patch('/trips/:id/modify-day', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { targetDay, changeInstructions } = req.body;

    const currentTrip = await AiResponse.findOne({ _id: id, userId: req.userId });
    if (!currentTrip) return res.status(404).json({ error: 'Trip not found or access denied.' });

    const daySchedule = currentTrip.dailyItinerary.find(d => d.day === Number(targetDay));
    if (!daySchedule) return res.status(400).json({ error: 'Target day sequence not found.' });

    const prompt = `Modify Day ${targetDay} of an itinerary for ${currentTrip.tripSummary.destination}.
Current: ${JSON.stringify(daySchedule)}.
Instruction: "${changeInstructions}".
Return a single updated dailyItinerary day node item.`;

    const updatedDayJson = await generateItineraryFromAI(prompt);
    const dynamicDayData = updatedDayJson.dailyItinerary?.[0] || updatedDayJson.dailyItinerary;

    await AiResponse.updateOne(
      { _id: id, "dailyItinerary.day": Number(targetDay) },
      { $set: { "dailyItinerary.$": { ...dynamicDayData, day: Number(targetDay) } } }
    );

    res.status(200).json({
      message: "Itinerary day altered cleanly",
      refreshedTrip: await AiResponse.findById(id)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

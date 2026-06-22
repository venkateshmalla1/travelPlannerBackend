import { Schema, model } from 'mongoose';

// User Schema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }
}, { timestamps: true, collection: 'userData' });

// Travel Details Schema
const TravelDetailsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  destination: { type: String, required: true },
  numberOfDays: { type: Number, required: true },
  budgetCategory: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  interests: [{ type: String }]
}, { timestamps: true, collection: 'travelDetails' });

// AiResponse Schema (corrected + destinationImageUrl added)
const AiResponseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  travelDetailsId: { type: Schema.Types.ObjectId, ref: 'TravelDetails', required: true },
  tripSummary: {
    destination: String,
    destinationImageUrl: String, // ✅ Added field for base64 image asset
    days: Number,
    budgetCategory: String,
    bestSeason: String,
    currency: String,
    language: String
  },
  dailyItinerary: [{
    day: Number,
    schedule: { morning: String, afternoon: String, evening: String },
    meals: {
      breakfast: { name: String, cuisine: String, costEstimate: String, mapsSearchPhrase: String },
      lunch: { name: String, cuisine: String, costEstimate: String, mapsSearchPhrase: String },
      dinner: { name: String, cuisine: String, costEstimate: String, mapsSearchPhrase: String }
    }
  }],
  recommendedHotels: [{
    name: String,
    area: String,
    tier: String,
    costPerNight: String,
    amenities: [String]
  }],
  thingsToCarry: {
    documents: [String],
    electronics: [String],
    clothing: [String],
    healthAndMedical: [String],
    essentials: [String]
  },
  safetyAndCautionTips: {
    localScams: [String],
    weatherAndTerrain: [String],
    emergencyContacts: [String]
  },
  budgetBreakdown: {
    flightsOrTransit: Number,
    accommodation: Number,
    food: Number,
    activities: Number,
    miscellaneous: Number,
    totalEstimatedBudget: Number
  }
}, { timestamps: true, collection: 'aiResponses' });

// ✅ Proper exports
export const User = model('User', UserSchema);
export const TravelDetails = model('TravelDetails', TravelDetailsSchema);
export const AiResponse = model('AiResponse', AiResponseSchema);

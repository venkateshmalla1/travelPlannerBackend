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

// AiResponse Schema
const AiResponseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  travelDetailsId: { type: Schema.Types.ObjectId, ref: 'TravelDetails', required: true },
  tripSummary: {
    destination: { type: String, default: '' },
    destinationImageUrl: { type: String, default: '' },
    days: { type: Number, default: 0 },
    budgetCategory: { type: String, default: '' },
    bestSeason: { type: String, default: '' },
    currency: { type: String, default: '' },
    language: { type: String, default: '' }
  },
  dailyItinerary: [{
    day: { type: Number, required: true },
    schedule: { morning: String, afternoon: String, evening: String },
    meals: {
      breakfast: { name: String, cuisine: String, costEstimate: String, mapsSearchPhrase: String },
      lunch: { name: String, cuisine: String, costEstimate: String, mapsSearchPhrase: String },
      dinner: { name: String, cuisine: String, costEstimate: String, mapsSearchPhrase: String }
    }
  }],
  recommendedHotels: [{
    name: String, area: String, tier: String, costPerNight: String, amenities: [String]
  }],
  thingsToCarry: {
    documents: [String], electronics: [String], clothing: [String], healthAndMedical: [String], essentials: [String]
  },
  safetyAndCautionTips: {
    localScams: [String], weatherAndTerrain: [String], emergencyContacts: [String]
  },
  budgetBreakdown: {
    flightsOrTransit: String, accommodation: String, food: String, activities: String, miscellaneous: String, totalEstimatedBudget: String
  }
}, { timestamps: true, collection: 'aiResponses' });

// Exports
export const User = model('User', UserSchema);
export const TravelDetails = model('TravelDetails', TravelDetailsSchema);
export const AiResponse = model('AiResponse', AiResponseSchema);

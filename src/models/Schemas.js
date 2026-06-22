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
    destination: { type: String, default: '' },
    destinationImageUrl: { type: String, default: '' }, // ✅ Base64 image asset
    days: { type: Number, default: 0 },
    budgetCategory: { type: String, default: '' },
    bestSeason: { type: String, default: '' },
    currency: { type: String, default: '' },
    language: { type: String, default: '' }
  },
  dailyItinerary: [{
    day: { type: Number, required: true },
    schedule: { 
      morning: { type: String, default: '' }, 
      afternoon: { type: String, default: '' }, 
      evening: { type: String, default: '' } 
    },
    meals: {
      breakfast: { 
        name: { type: String, default: '' }, 
        cuisine: { type: String, default: '' }, 
        costEstimate: { type: String, default: '' }, 
        mapsSearchPhrase: { type: String, default: '' } 
      },
      lunch: { 
        name: { type: String, default: '' }, 
        cuisine: { type: String, default: '' }, 
        costEstimate: { type: String, default: '' }, 
        mapsSearchPhrase: { type: String, default: '' } 
      },
      dinner: { 
        name: { type: String, default: '' }, 
        cuisine: { type: String, default: '' }, 
        costEstimate: { type: String, default: '' }, 
        mapsSearchPhrase: { type: String, default: '' } 
      }
    }
  }],
  recommendedHotels: [{
    name: { type: String, default: '' },
    area: { type: String, default: '' },
    tier: { type: String, default: '' },
    costPerNight: { type: String, default: '' },
    amenities: [{ type: String }]
  }],
  thingsToCarry: {
    documents: [{ type: String }],
    electronics: [{ type: String }],
    clothing: [{ type: String }],
    healthAndMedical: [{ type: String }],
    essentials: [{ type: String }]
  },
  safetyAndCautionTips: {
    localScams: [{ type: String }],
    weatherAndTerrain: [{ type: String }],
    emergencyContacts: [{ type: String }]
  },
  budgetBreakdown: {
    flightsOrTransit: { type: String, default: '0' },
    accommodation: { type: String, default: '0' },
    food: { type: String, default: '0' },
    activities: { type: String, default: '0' },
    miscellaneous: { type: String, default: '0' },
    totalEstimatedBudget: { type: String, default: '0' }
  }
}, { timestamps: true, collection: 'aiResponses' });

// ✅ Proper exports
export const User = model('User', UserSchema);
export const TravelDetails = model('TravelDetails', TravelDetailsSchema);
export const AiResponse = model('AiResponse', AiResponseSchema);

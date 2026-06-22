// Locate inside models/Schemas.js and replace the AiResponseSchema definition:

const AiResponseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  travelDetailsId: { type: Schema.Types.ObjectId, ref: 'TravelDetails', required: true },
  tripSummary: {
    destination: String, 
    destinationImageUrl: String, // ADDED: Field for holding base64 string image asset
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
    name: String, area: String, tier: String, costPerNight: String, amenities: [String]
  }],
  thingsToCarry: {
    documents: [String], electronics: [String], clothing: [String], healthAndMedical: [String], essentials: [String]
  },
  safetyAndCautionTips: {
    localScams: [String], weatherAndTerrain: [String], emergencyContacts: [String]
  },
  budgetBreakdown: {
    flightsOrTransit: Number, accommodation: Number, food: Number, activities: Number, miscellaneous: Number, totalEstimatedBudget: Number
  }
}, { timestamps: true, collection: 'aiResponses' });

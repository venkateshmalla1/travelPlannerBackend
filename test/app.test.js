import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import app from '../src/app.js';
import { ItineraryJsonSchema } from '../src/services/geminiService.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test('GET /health returns online status', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'Online');
  assert.ok(Date.parse(body.date));
});

test('Gemini itinerary schema includes required top-level itinerary sections', () => {
  assert.ok(ItineraryJsonSchema.properties.tripSummary);
  assert.ok(ItineraryJsonSchema.properties.dailyItinerary);
  assert.ok(ItineraryJsonSchema.properties.recommendedHotels);
  assert.ok(ItineraryJsonSchema.properties.thingsToCarry);
  assert.ok(ItineraryJsonSchema.properties.safetyAndCautionTips);
  assert.ok(ItineraryJsonSchema.properties.budgetBreakdown);
});

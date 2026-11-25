import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createFarmerContext(role: "user" | "admin" = "user", userId = 501): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `test-farmer-${userId}`,
      name: "Ravi Farmer",
      email: "ravi@rytha.example",
      farmLocation: "Kolar, Karnataka",
      preferredLanguage: "English",
      avatarUrl: null,
      phoneNumber: null,
      notificationChannel: "in_app",
      loginMethod: "direct",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as NonNullable<TrpcContext["user"]>,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Namma Rytha 10 Advanced Features API", () => {
  it("1. Digital Twin: simulates rainfall drop, fertilizer increase, and crop switching", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const sim = await caller.digitalTwin.simulate({
      plotName: "Plot A · Tomato",
      baseCrop: "Tomato",
      areaAcres: 2,
      soilType: "Red loam",
      growthStage: "Flowering",
      soilMoisturePct: 45,
      rainfallDeltaPct: -40,
      fertilizerCostDeltaPct: 25,
      switchToCrop: "Ragi",
      irrigationReductionPct: 20,
      harvestDelayDays: 5,
    });
    expect(sim.baseline.crop).toBe("Tomato");
    expect(sim.simulated.crop).toBe("Ragi");
    expect(sim.simulated.waterLiters).toBeLessThan(sim.baseline.waterLiters);
    expect(sim.alerts.length).toBeGreaterThan(0);
  });

  it("2. Predictive Disease Risk: combines humidity/rain weather and diagnosis history", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const risk = await caller.disease.forecastRisk({ crop: "Tomato", lat: 13.135, lng: 78.132 });
    expect(risk.crop).toBe("Tomato");
    expect(risk.overallRiskPct).toBeGreaterThan(0);
    expect(risk.risks.length).toBeGreaterThan(0);
  });

  it("3. Smart Irrigation Water Budget Planner: allocates limited water across crops", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const result = await caller.irrigationIntel.budgetPlan({ availableDailyLiters: 18000, lat: 13.135, lng: 78.132 });
    expect(result.plan.availableDailyLiters).toBe(18000);
    expect(result.plan.allocations.length).toBeGreaterThanOrEqual(2);
    expect(["Surplus / Balanced", "Water Deficit"]).toContain(result.plan.status);
  });

  it("4. Mandi Negotiation Assistant: calculates break-even price and verdict", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const evalLow = await caller.mandi.evaluateOffer({
      crop: "Tomato",
      quantityQuintals: 40,
      buyerOfferPerQuintal: 1400,
      productionCostTotal: 64000,
    });
    expect(evalLow.breakEvenPerQuintal).toBe(1600);
    expect(evalLow.verdict).toBe("TAKE_TO_MANDI");
    expect(evalLow.mandiComparisons.length).toBeGreaterThanOrEqual(3);
  });

  it("5. Multi-Crop Profit Simulator: compares 3+ crops and recommends switching", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const res = await caller.profit.compareCrops({
      crops: [
        { crop: "Tomato", areaAcres: 2 },
        { crop: "Ragi", areaAcres: 2 },
        { crop: "Maize", areaAcres: 2 },
      ],
      constraints: {
        currentCrop: "Tomato",
        availableWaterLevel: "Scarce",
        maxBudgetTotal: 40000,
        riskAppetite: "Conservative",
      },
    });
    expect(res.comparisons).toHaveLength(3);
    expect(res.topRecommendation.crop).toBe("Ragi");
  });

  it("6. Voice Assistant: supports English and Kannada farm answers", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const en = await caller.assistant.ask({
      question: "When should I irrigate?",
      language: "English",
      crop: "Tomato",
      stage: "Flowering",
      soilMoisture: 30,
      threshold: 35,
      recommendation: "Irrigate within 4 hours",
      temperature: 29,
      rainProbability: 15,
    });
    expect(en.answer.toLowerCase()).toContain("tomato");

    const kn = await caller.assistant.ask({
      question: "ನನ್ನ ಬೆಳೆಯ ಎಲೆಗಳು ಏಕೆ ಹಳದಿಯಾಗುತ್ತಿವೆ?",
      language: "Kannada",
      crop: "Tomato",
      stage: "Flowering",
      soilMoisture: 46,
      threshold: 35,
      recommendation: "Moisture OK",
      temperature: 28,
      rainProbability: 20,
    });
    expect(kn.answer.length).toBeGreaterThan(20);
  });

  it("7. Satellite Health: generates NDVI zones and historical trend", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const sat = await caller.satellite.insights();
    expect(sat.plots.length).toBeGreaterThan(0);
    expect(sat.plots[0]!.zones).toHaveLength(4);
    expect(sat.plots[0]!.history.length).toBeGreaterThanOrEqual(4);
  });

  it("8. Farm Waste Exchange: lists, creates, filters, and allows owner status updates", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const created = await caller.wasteExchange.create({
      category: "compost",
      title: "Fresh Banana Pseudostem Compost",
      description: "Organic mulch composted 90 days.",
      quantityKg: 500,
      pricePerKg: 5,
      isFree: false,
      location: "Malur",
      district: "Kolar",
      contactPhone: "+919845112233",
    });
    expect(created.id).toBeGreaterThan(0);
    const list = await caller.wasteExchange.list({ category: "compost" });
    expect(list.some((l) => l.id === created.id)).toBe(true);
    const closed = await caller.wasteExchange.setStatus({ id: created.id, status: "claimed" });
    expect(closed.success).toBe(true);
  });

  it("9. Local Farmer Intelligence: submits unverified report and restricts verification to admin", async () => {
    const farmerCaller = appRouter.createCaller(createFarmerContext("user", 502));
    const report = await farmerCaller.regionalIntel.submit({
      category: "pest_attack",
      title: "Whitefly surge on eastern Tomato belt",
      crop: "Tomato",
      severity: "high",
      description: "Noticed heavy nymph colony under leaves across 2 plots.",
      location: "Hegganahalli",
      latitude: 13.137,
      longitude: 78.133,
    });
    expect(report.verified).toBe(false);
    await expect(farmerCaller.regionalIntel.verify({ reportId: report.id, verified: true })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminCaller = appRouter.createCaller(createFarmerContext("admin", 1));
    const ok = await adminCaller.regionalIntel.verify({ reportId: report.id, verified: true });
    expect(ok).toBe(true);
  });

  it("10. Crop Failure Analysis: distinguishes possible causes from strong/confirmed indicators", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const res = await caller.failureAnalysis.analyze({
      crop: "Tomato",
      soilType: "Red sandy loam",
      soilPh: 5.1,
      irrigationMethod: "Flood",
      irrigationFrequency: "Irregular every 7 days",
      fertilizerUsage: "Heavy Urea only",
      weatherConditions: "Heatwave 37C followed by heavy rain",
      symptoms: ["Yellow lower leaves", "Flower drop", "Dark leaf spots"],
      historicalYieldQ: 90,
      actualYieldQ: 42,
      saveToHistory: true,
    });
    expect(res.yieldDropPct).toBe(53);
    expect(res.confirmedIndicators.length).toBeGreaterThan(0);
    expect(res.possibleCauses.length).toBeGreaterThan(0);
  });

  it("11. Rytha 2.0 Dashboard: returns prioritized farm today actions and allows marking done", async () => {
    const caller = appRouter.createCaller(createFarmerContext("admin", 1));
    const actions = await caller.dashboard.farmToday();
    expect(actions.length).toBeGreaterThan(0);
    const first = actions[0]!;
    const done = await caller.dashboard.markActionDone({ actionId: first.id, taskId: first.taskId });
    expect(done).toBe(true);
  });

  it("12. Rytha 2.0 Farm Memory: creates, lists, updates, and deletes farm records", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const created = await caller.farmMemory.create({
      recordType: "harvest",
      crop: "Tomato",
      plotName: "Plot A",
      quantityQ: 24,
      pricePerQ: 2600,
      notes: "Good fruit size after drip fertigation.",
    });
    expect(created.id).toBeGreaterThan(0);
    const list = await caller.farmMemory.list();
    expect(list.some((r) => r.id === created.id)).toBe(true);
    const updated = await caller.farmMemory.update({ id: created.id, quantityQ: 26 });
    expect(updated.quantityQ).toBe(26);
    const deleted = await caller.farmMemory.delete({ id: created.id });
    expect(deleted.success).toBe(true);
  });

  it("13. Rytha 2.0 Crop Rotation: recommends ranked disease-breaking rotation crops", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const rec = await caller.cropRotation.recommend({
      previousCrop: "Tomato",
      soilType: "Red loam",
      soilPh: 6.5,
      irrigationLevel: "Drip/Sprinkler",
      diseaseHistory: "Early blight last season",
      district: "Kolar",
    });
    expect(rec.recommendations).toHaveLength(3);
    expect(rec.warnings.length).toBeGreaterThan(0);
  });

  it("14. Rytha 2.0 Cooperatives & Traceability: manages groups, bulk requests, harvest batches & events", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const coop = await caller.cooperative.create({ name: "Malur Drip FPO", description: "Bulk bio-inputs", district: "Kolar" });
    expect(coop.id).toBeGreaterThan(0);
    const bulk = await caller.cooperative.bulkPurchase.create({ coopId: coop.id, itemName: "Neem Cake", quantityKg: 500, unitPrice: 22 });
    expect(bulk).toBeTruthy();

    const batch = await caller.traceability.create({ crop: "Tomato", plotName: "Plot A", harvestDate: "2026-11-20", quantityKg: 800, qualityGrade: "A", certifications: ["GAP"] });
    expect(batch.batchCode).toContain("RYT-TOM");
    const ev = await caller.traceability.addEvent({ batchId: batch.id as number, eventType: "packed", location: "Kolar Packhouse" });
    expect(ev.success).toBe(true);
  });

  it("15. Rytha 2.0 Financial Forecast, Anomaly Detection, Mandi Offer History, Profit Plans & Treatments", async () => {
    const caller = appRouter.createCaller(createFarmerContext());
    const forecast = await caller.finance.forecast({ crop: "Tomato", plotName: "Plot A", areaAcres: 2, season: "Kharif 2026" });
    expect(forecast.seasons.length).toBeGreaterThanOrEqual(3);
    expect(forecast.optimisticProfit).toBeGreaterThan(forecast.conservativeProfit);

    const anomalyRes = await caller.anomaly.detect();
    expect(typeof anomalyRes.detected).toBe("number");

    const offer = await caller.mandi.saveOffer({ crop: "Tomato", quantityQ: 40, buyerOfferPerQ: 2400, verdict: "ACCEPT", bestMandi: "Kolar APMC", netProfit: 31400 });
    expect(offer).toBeTruthy();
    const plan = await caller.profit.savePlan({ crop: "Ragi", scenarioMode: "Expected", budgetTotal: 60000, expectedNetProfit: 80800, roiPct: 299 });
    expect(plan).toBeTruthy();
    const tr = await caller.disease.logTreatment({ plotName: "Plot A", crop: "Tomato", conditionName: "Early Blight", treatmentApplied: "Neem oil 3ml/L", outcome: "improving" });
    expect(tr).toBeTruthy();
  });
});

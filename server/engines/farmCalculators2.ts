// NEW RYTHA 2.0 ENGINE FUNCTIONS - append to farmCalculators.ts

import { CROP_CATALOG, resolveCropProfile } from "./agronomyData";

// CROP ROTATION RECOMMENDATION ENGINE
export type CropRotationInput = {
  previousCrop: string;
  soilType: string;
  soilPh: number;
  irrigationLevel: string;
  diseaseHistory: string;
  district: string;
};

export function recommendCropRotation(input: CropRotationInput) {
  const prevCropLower = input.previousCrop.toLowerCase();
  const isNightshade = ["tomato", "chilli", "pepper", "potato", "brinjal"].some(c => prevCropLower.includes(c));
  const isCereal = ["ragi", "maize", "rice", "wheat", "sorghum"].some(c => prevCropLower.includes(c));
  const isLegume = ["groundnut", "bengal gram", "soybean", "cowpea"].some(c => prevCropLower.includes(c));

  const isLowIrr = input.irrigationLevel.toLowerCase().includes("rain");
  const isHighIrr = input.irrigationLevel.toLowerCase().includes("drip") || input.irrigationLevel.toLowerCase().includes("flood");

  const recommendations: Array<{
    rank: number;
    crop: string;
    reasoning: string;
    diseaseBreak: string;
    nutrientBenefit: string;
    waterRequirement: string;
    estimatedCostPerAcre: number;
    estimatedYieldQ: number;
    suitabilityScore: number;
  }> = [];

  // Build candidates based on rotation principles
  const candidates: Array<{ crop: string; score: number; reason: string; diseaseBreak: string; nutrient: string }> = [];

  if (isNightshade) {
    candidates.push({
      crop: "Ragi", score: 90,
      reason: "Ragi is an ideal rotation after tomato/chilli. It breaks soilborne pathogen cycles (Fusarium, Pythium) and improves soil structure with deep fibrous roots.",
      diseaseBreak: "Breaks early blight (Alternaria) and Fusarium wilt cycles that persist in nightshade family residue.",
      nutrient: "Deep root system improves soil aeration and organic matter. Low nitrogen demand allows soil recovery."
    });
    candidates.push({
      crop: "Groundnut", score: 85,
      reason: "Legume rotation after nightshade crops fixes atmospheric nitrogen and suppresses root knot nematodes common in tomato plots.",
      diseaseBreak: "Non-host for Phytophthora and Alternaria. Interrupts soilborne disease continuity from previous tomato cycle.",
      nutrient: "Fixes 50–80 kg N/ha through Rhizobium symbiosis, reducing fertilizer costs for the next crop."
    });
    candidates.push({
      crop: "Maize", score: 78,
      reason: "Cereal rotation breaks nightshade pest and disease cycles. Maize provides good residue for soil organic matter.",
      diseaseBreak: "No common hosts for tomato-specific pathogens. Reduces nematode population over the season.",
      nutrient: "Deep tap roots improve subsoil drainage. Stover can be incorporated as green manure."
    });
  } else if (isCereal) {
    candidates.push({
      crop: "Groundnut", score: 92,
      reason: "Classic cereal-legume rotation. Groundnut fixes nitrogen that was depleted by cereal crops and suppresses cereal-specific fungal pathogens.",
      diseaseBreak: "Breaks downy mildew and smut cycles from ragi/maize. No shared pathogen hosts with cereals.",
      nutrient: "Adds 50–80 kg N/ha to soil. Peg zone improves top 15 cm soil structure."
    });
    candidates.push({
      crop: "Tomato", score: 80,
      reason: "High-value nightshade after cereal maximizes income potential. Cereals have left soil with lower pathogen pressure for tomato establishment.",
      diseaseBreak: "Cereal residue suppresses some soilborne pathogens. Fresh soil for tomato reduces early blight risk.",
      nutrient: "Cereal residue adds organic matter. Apply N top-dress at flowering to match tomato's high N demand."
    });
    candidates.push({
      crop: "Chilli", score: 72,
      reason: "Spice crop rotation after cereal diversifies income and uses existing irrigation infrastructure effectively.",
      diseaseBreak: "No shared pathogen hosts with Ragi/Maize. Reduces cereal fungal spore load.",
      nutrient: "Moderate N demand. Benefits from residual phosphorus left by cereal fertilization."
    });
  } else if (isLegume) {
    candidates.push({
      crop: "Tomato", score: 90,
      reason: "Nitrogen-rich legume soil is perfect for high-demand tomato. Groundnut residue improves soil structure and reduces fertilizer needs.",
      diseaseBreak: "Legume residue suppresses soilborne pathogens. Fresh soil for tomato means lower early blight inoculum.",
      nutrient: "Legume-fixed nitrogen reduces urea requirement by 25–30%. Phosphorus-rich soil from groundnut suits tomato."
    });
    candidates.push({
      crop: "Ragi", score: 82,
      reason: "Ragi after legume forms the classic Karnataka dryland rotation. The nitrogen boost from groundnut improves ragi tiller density.",
      diseaseBreak: "Completely breaks all legume-specific pathogen cycles. No shared pests.",
      nutrient: "Uses residual nitrogen from legume. Reduces ragi fertilizer cost by 20–30%."
    });
    candidates.push({
      crop: "Maize", score: 76,
      reason: "High-yielding cereal benefits strongly from legume-fixed nitrogen. Maize stover adds organic matter back.",
      diseaseBreak: "No shared pathogen with groundnut. Interrupts legume disease cycles.",
      nutrient: "Maize uses nitrogen efficiently. Residual legume N reduces urea requirement significantly."
    });
  } else {
    // Generic rotation
    candidates.push({ crop: "Ragi", score: 80, reason: "Ragi is a safe, low-input rotation choice for Karnataka soils.", diseaseBreak: "Breaks soilborne pathogen cycles from previous season.", nutrient: "Low input demand; improves soil structure." });
    candidates.push({ crop: "Groundnut", score: 78, reason: "Nitrogen-fixing legume improves soil fertility.", diseaseBreak: "Interrupts non-legume pathogen cycles.", nutrient: "Adds 50–80 kg N/ha through biological fixation." });
    candidates.push({ crop: "Maize", score: 72, reason: "Cereal rotation diversifies crop family and income.", diseaseBreak: "Breaks non-cereal disease cycles.", nutrient: "Deep roots improve drainage and soil organic matter." });
  }

  // Adjust scores for pH and irrigation
  candidates.forEach(c => {
    const profile = resolveCropProfile(c.crop);
    if (input.soilPh < profile.idealPhRange[0] - 0.5 || input.soilPh > profile.idealPhRange[1] + 0.5) {
      c.score -= 10;
    }
    if (isLowIrr && profile.waterSensitivity === "High") {
      c.score -= 15;
    }
    if (isHighIrr && profile.droughtTolerance === "High") {
      c.score -= 5; // Slight penalty for over-irrigation risk on drought-tolerant crops
    }
  });

  candidates.sort((a, b) => b.score - a.score);

  for (let i = 0; i < Math.min(3, candidates.length); i++) {
    const c = candidates[i]!;
    const profile = resolveCropProfile(c.crop);
    const costPerAcre = Object.values(profile.costsPerAcre).reduce((a, b) => a + b, 0);
    recommendations.push({
      rank: i + 1,
      crop: c.crop,
      reasoning: c.reason,
      diseaseBreak: c.diseaseBreak,
      nutrientBenefit: c.nutrient,
      waterRequirement: `${profile.waterMmPerSeason} mm/season · ${profile.waterSensitivity} sensitivity`,
      estimatedCostPerAcre: costPerAcre,
      estimatedYieldQ: profile.baseYieldQuintalsPerAcre,
      suitabilityScore: Math.min(100, Math.max(40, c.score)),
    });
  }

  const warnings: string[] = [];
  if (input.diseaseHistory.toLowerCase().includes("blight")) {
    warnings.push("Blight history detected: avoid re-planting the same family for at least 1 season. Prioritize cereals or legumes.");
  }
  if (input.soilPh < 5.5) {
    warnings.push(`Soil pH ${input.soilPh} is acidic. Apply agricultural lime (1–2 t/acre) before the next crop for best results.`);
  }
  if (input.soilPh > 8.0) {
    warnings.push(`Soil pH ${input.soilPh} is alkaline. Apply gypsum or sulfur amendments for optimal nutrient uptake.`);
  }

  return {
    recommendations,
    rotationPrinciple: isNightshade
      ? "Nightshade → Cereal/Legume rotation breaks soilborne pathogen cycles and nitrogen depletion."
      : isCereal
      ? "Cereal → Legume rotation restores soil nitrogen and diversifies disease pressure."
      : isLegume
      ? "Legume → Demanding crop rotation uses biological nitrogen to boost profitability."
      : "Diversified rotation: rotating crop families is the best strategy for long-term soil health.",
    warnings,
  };
}

// SEASONAL FINANCIAL FORECAST
export type FinancialForecastInput = {
  crop: string;
  plotName: string;
  areaAcres: number;
  season: string;
};

export function buildSeasonalFinancialForecast(input: FinancialForecastInput) {
  const profile = resolveCropProfile(input.crop);
  const acres = Math.max(0.25, input.areaAcres);
  const durationDays = profile.durationDays;
  const months = Math.ceil(durationDays / 30);

  const totalCosts = {
    seed: Math.round(profile.costsPerAcre.seed * acres),
    fertilizer: Math.round(profile.costsPerAcre.fertilizer * acres),
    labour: Math.round(profile.costsPerAcre.labour * acres),
    water: Math.round(profile.costsPerAcre.water * acres),
    machinery: Math.round(profile.costsPerAcre.machinery * acres),
  };
  const totalInvestment = Object.values(totalCosts).reduce((a, b) => a + b, 0);

  // Build monthly cost schedule (seed/machinery upfront, fertilizer spread, labour peaks at harvest)
  const seasons: Array<{
    label: string;
    month: number;
    conservative: number;
    expected: number;
    optimistic: number;
    cumulativeCost: number;
  }> = [];

  let cumulativeCost = 0;
  for (let m = 1; m <= months; m++) {
    // Cost schedule: 30% upfront (seed+machinery), 40% mid (fertilizer+water), 30% harvest (labour)
    const isFirst = m === 1;
    const isLast = m === months;
    const isMid = !isFirst && !isLast;
    const monthCost = isFirst
      ? totalCosts.seed + totalCosts.machinery + totalCosts.water * 0.3
      : isLast
      ? totalCosts.labour * 0.5 + totalCosts.water * 0.3
      : isMid
      ? (totalCosts.fertilizer + totalCosts.labour * 0.5 + totalCosts.water * 0.4) / Math.max(1, months - 2)
      : totalCosts.fertilizer / months;
    cumulativeCost += Math.round(monthCost);

    // Revenue only flows in last month
    const baseRevenue = isLast ? Math.round(profile.baseYieldQuintalsPerAcre * acres * profile.benchmarkPricePerQuintal) : 0;
    const conservativeRevenue = isLast ? Math.round(baseRevenue * 0.75) : 0;
    const optimisticRevenue = isLast ? Math.round(baseRevenue * 1.25) : 0;

    // Cumulative net at each month
    const netExpected = -cumulativeCost + (isLast ? baseRevenue : 0);
    const netConservative = -cumulativeCost + conservativeRevenue;
    const netOptimistic = -cumulativeCost + optimisticRevenue;

    seasons.push({
      label: `M${m}`,
      month: m,
      conservative: netConservative,
      expected: netExpected,
      optimistic: netOptimistic,
      cumulativeCost,
    });
  }

  const baseRevenue = Math.round(profile.baseYieldQuintalsPerAcre * acres * profile.benchmarkPricePerQuintal);

  return {
    crop: profile.crop,
    plotName: input.plotName,
    seasons,
    totalInvestment,
    conservativeProfit: Math.round(baseRevenue * 0.75) - totalInvestment,
    expectedProfit: baseRevenue - totalInvestment,
    optimisticProfit: Math.round(baseRevenue * 1.25) - totalInvestment,
    assumptions: [
      `Base yield: ${profile.baseYieldQuintalsPerAcre} q/acre from CROP_CATALOG agronomic data.`,
      `Benchmark price: ₹${profile.benchmarkPricePerQuintal}/quintal from Karnataka APMC historical benchmarks.`,
      `Conservative: 75% of expected yield (drought/pest risk). Optimistic: 125% (ideal season).`,
      `Cost schedule: 30% upfront, 40% mid-season, 30% at harvest.`,
      `Area: ${acres} acres. Season duration: ${durationDays} days (${months} months).`,
      `Actual results depend on market prices at time of sale, weather, and farm management quality.`,
    ],
    dataMode: "estimated" as const,
  };
}

// ANOMALY DETECTION
export type SensorReading = {
  plotId: number;
  moisture: number;
  temperature: number;
  battery: number;
  recordedAt: Date | string;
};

export function detectFarmAnomalies(readings: SensorReading[]): Array<{
  plotId: number;
  anomalyType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}> {
  const anomalies: Array<{ plotId: number; anomalyType: string; severity: "low" | "medium" | "high" | "critical"; description: string }> = [];

  for (const r of readings) {
    if (r.moisture < 15) {
      anomalies.push({ plotId: r.plotId, anomalyType: "critical_moisture_low", severity: "critical", description: `Soil moisture critically low at ${r.moisture}%. Immediate irrigation required to prevent crop stress.` });
    } else if (r.moisture < 25) {
      anomalies.push({ plotId: r.plotId, anomalyType: "moisture_low", severity: "high", description: `Soil moisture at ${r.moisture}% is below safe threshold. Schedule irrigation within 4 hours.` });
    }

    if (r.temperature > 42) {
      anomalies.push({ plotId: r.plotId, anomalyType: "heat_stress", severity: "critical", description: `Temperature at ${r.temperature}°C exceeds critical threshold. Assess crop for heat stress and provide shade if possible.` });
    } else if (r.temperature > 38) {
      anomalies.push({ plotId: r.plotId, anomalyType: "high_temperature", severity: "high", description: `Temperature at ${r.temperature}°C is elevated. Monitor closely and ensure adequate irrigation.` });
    }

    if (r.battery < 10) {
      anomalies.push({ plotId: r.plotId, anomalyType: "battery_critical", severity: "critical", description: `Sensor battery at ${r.battery}% — replace immediately to avoid data gaps.` });
    } else if (r.battery < 20) {
      anomalies.push({ plotId: r.plotId, anomalyType: "battery_low", severity: "medium", description: `Sensor battery at ${r.battery}%. Schedule battery replacement within 48 hours.` });
    }
  }

  return anomalies;
}

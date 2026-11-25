export type CropKey = "Tomato" | "Ragi" | "Maize" | "Chilli" | "Onion" | "Groundnut";

export type CropProfile = {
  crop: CropKey;
  kannadaName: string;
  durationDays: number;
  kcByStage: Record<"Seedling" | "Vegetative" | "Flowering" | "Fruiting" | "Tillering" | "Maturity", number>;
  idealTempRange: [number, number];
  idealHumidityMax: number;
  idealPhRange: [number, number];
  waterMmPerSeason: number;
  waterLitersPerAcreDayBase: number;
  baseYieldQuintalsPerAcre: number;
  benchmarkPricePerQuintal: number;
  costsPerAcre: {
    seed: number;
    fertilizer: number;
    labour: number;
    water: number;
    machinery: number;
  };
  waterSensitivity: "High" | "Medium" | "Low";
  droughtTolerance: "Low" | "Moderate" | "High";
  commonDiseases: Array<{
    name: string;
    humidityTrigger: number;
    tempRange: [number, number];
    symptoms: string;
    prevention: string;
  }>;
};

export const CROP_CATALOG: Record<CropKey, CropProfile> = {
  Tomato: {
    crop: "Tomato",
    kannadaName: "ಟೊಮೆಟೊ",
    durationDays: 105,
    kcByStage: { Seedling: 0.6, Vegetative: 0.85, Flowering: 1.15, Fruiting: 1.1, Tillering: 0.9, Maturity: 0.8 },
    idealTempRange: [18, 30],
    idealHumidityMax: 72,
    idealPhRange: [6.0, 7.2],
    waterMmPerSeason: 520,
    waterLitersPerAcreDayBase: 18500,
    baseYieldQuintalsPerAcre: 95,
    benchmarkPricePerQuintal: 2450,
    costsPerAcre: { seed: 4200, fertilizer: 7800, labour: 12500, water: 4500, machinery: 3800 },
    waterSensitivity: "High",
    droughtTolerance: "Low",
    commonDiseases: [
      {
        name: "Early Blight (Alternaria solani)",
        humidityTrigger: 68,
        tempRange: [22, 31],
        symptoms: "Dark concentric target-board rings on older lower leaves with yellow halos.",
        prevention: "Prune lower leaves touching wet soil, avoid overhead evening irrigation, mulch beds, and scout every 48h after rain.",
      },
      {
        name: "Late Blight (Phytophthora infestans)",
        humidityTrigger: 80,
        tempRange: [15, 25],
        symptoms: "Water-soaked dark green to brown blotches with white mold underneath in cool wet mornings.",
        prevention: "Improve airflow spacing, drain standing water immediately, and consult an agronomist before preventive sprays.",
      },
    ],
  },
  Ragi: {
    crop: "Ragi",
    kannadaName: "ರಾಗಿ",
    durationDays: 110,
    kcByStage: { Seedling: 0.5, Vegetative: 0.75, Flowering: 1.0, Fruiting: 0.9, Tillering: 0.85, Maturity: 0.55 },
    idealTempRange: [20, 34],
    idealHumidityMax: 78,
    idealPhRange: [5.5, 7.5],
    waterMmPerSeason: 340,
    waterLitersPerAcreDayBase: 11200,
    baseYieldQuintalsPerAcre: 14,
    benchmarkPricePerQuintal: 3850,
    costsPerAcre: { seed: 1100, fertilizer: 2600, labour: 5800, water: 1600, machinery: 2400 },
    waterSensitivity: "Low",
    droughtTolerance: "High",
    commonDiseases: [
      {
        name: "Finger Millet Blast (Pyricularia grisea)",
        humidityTrigger: 76,
        tempRange: [23, 30],
        symptoms: "Spindle-shaped lesions with grey centers and brown margins on leaves and neck of panicle.",
        prevention: "Avoid excess nitrogen fertilizer during tillering, use clean seed treatment, and clear bund weeds.",
      },
    ],
  },
  Maize: {
    crop: "Maize",
    kannadaName: "ಮೆಕ್ಕೆಜೋಳ",
    durationDays: 100,
    kcByStage: { Seedling: 0.5, Vegetative: 0.85, Flowering: 1.2, Fruiting: 1.05, Tillering: 0.8, Maturity: 0.6 },
    idealTempRange: [20, 33],
    idealHumidityMax: 75,
    idealPhRange: [5.8, 7.2],
    waterMmPerSeason: 460,
    waterLitersPerAcreDayBase: 15800,
    baseYieldQuintalsPerAcre: 26,
    benchmarkPricePerQuintal: 2220,
    costsPerAcre: { seed: 2400, fertilizer: 4800, labour: 6400, water: 3200, machinery: 3400 },
    waterSensitivity: "Medium",
    droughtTolerance: "Moderate",
    commonDiseases: [
      {
        name: "Turcicum Leaf Blight",
        humidityTrigger: 74,
        tempRange: [18, 28],
        symptoms: "Long cigar-shaped greyish-green lesions stretching along leaf veins.",
        prevention: "Maintain balanced potassium, clear crop residue from prior maize season, and improve drainage.",
      },
    ],
  },
  Chilli: {
    crop: "Chilli",
    kannadaName: "ಮೆಣಸಿನಕಾಯಿ",
    durationDays: 150,
    kcByStage: { Seedling: 0.6, Vegetative: 0.85, Flowering: 1.05, Fruiting: 1.0, Tillering: 0.85, Maturity: 0.75 },
    idealTempRange: [20, 32],
    idealHumidityMax: 70,
    idealPhRange: [6.0, 7.3],
    waterMmPerSeason: 560,
    waterLitersPerAcreDayBase: 16400,
    baseYieldQuintalsPerAcre: 22,
    benchmarkPricePerQuintal: 9800,
    costsPerAcre: { seed: 5400, fertilizer: 9200, labour: 18500, water: 5200, machinery: 4100 },
    waterSensitivity: "High",
    droughtTolerance: "Low",
    commonDiseases: [
      {
        name: "Leaf Curl / Thrips-Mite Complex",
        humidityTrigger: 55,
        tempRange: [26, 36],
        symptoms: "Upward or downward curling of tender young leaves with stunted shoot tips.",
        prevention: "Install yellow/blue sticky traps, monitor leaf undersides weekly, and avoid dry stress during flowering.",
      },
    ],
  },
  Onion: {
    crop: "Onion",
    kannadaName: "ಈರುಳ್ಳಿ",
    durationDays: 115,
    kcByStage: { Seedling: 0.65, Vegetative: 0.85, Flowering: 1.0, Fruiting: 0.95, Tillering: 0.85, Maturity: 0.7 },
    idealTempRange: [15, 29],
    idealHumidityMax: 68,
    idealPhRange: [6.0, 7.4],
    waterMmPerSeason: 440,
    waterLitersPerAcreDayBase: 14500,
    baseYieldQuintalsPerAcre: 75,
    benchmarkPricePerQuintal: 2350,
    costsPerAcre: { seed: 6500, fertilizer: 6800, labour: 14000, water: 4000, machinery: 3200 },
    waterSensitivity: "High",
    droughtTolerance: "Low",
    commonDiseases: [
      {
        name: "Purple Blotch (Alternaria porri)",
        humidityTrigger: 72,
        tempRange: [21, 30],
        symptoms: "Sunken purple-brown lesions with yellow zones on tubular onion leaves.",
        prevention: "Ensure raised-bed drainage, irrigate in early morning only, and rotate away from allium crops.",
      },
    ],
  },
  Groundnut: {
    crop: "Groundnut",
    kannadaName: "ಕಡಲೆಕಾಯಿ",
    durationDays: 110,
    kcByStage: { Seedling: 0.45, Vegetative: 0.75, Flowering: 1.0, Fruiting: 0.95, Tillering: 0.8, Maturity: 0.55 },
    idealTempRange: [22, 33],
    idealHumidityMax: 75,
    idealPhRange: [6.0, 7.0],
    waterMmPerSeason: 410,
    waterLitersPerAcreDayBase: 12600,
    baseYieldQuintalsPerAcre: 11,
    benchmarkPricePerQuintal: 6450,
    costsPerAcre: { seed: 4800, fertilizer: 3400, labour: 7200, water: 2400, machinery: 2900 },
    waterSensitivity: "Medium",
    droughtTolerance: "Moderate",
    commonDiseases: [
      {
        name: "Tikka Leaf Spot",
        humidityTrigger: 75,
        tempRange: [24, 32],
        symptoms: "Circular dark brown spots surrounded by a bright yellow ring leading to premature leaf drop.",
        prevention: "Deep summer ploughing, seed treatment, and balanced calcium/gypsum application at pegging stage.",
      },
    ],
  },
};

export function resolveCropProfile(cropName: string): CropProfile {
  const normalized = cropName.trim().toLowerCase();
  const match = (Object.keys(CROP_CATALOG) as CropKey[]).find(
    (k) => k.toLowerCase() === normalized || normalized.includes(k.toLowerCase())
  );
  return CROP_CATALOG[match ?? "Tomato"];
}

export const KARNATAKA_MANDI_BENCHMARKS: Array<{
  mandi: string;
  district: string;
  distanceKm: number;
  mandiFeePct: number;
  pricesByCrop: Record<CropKey, { min: number; modal: number; max: number; changePct: number }>;
}> = [
  {
    mandi: "Kolar APMC",
    district: "Kolar",
    distanceKm: 18,
    mandiFeePct: 1.5,
    pricesByCrop: {
      Tomato: { min: 2550, modal: 2840, max: 3020, changePct: 8.4 },
      Ragi: { min: 3650, modal: 3880, max: 4050, changePct: 2.1 },
      Maize: { min: 2100, modal: 2240, max: 2350, changePct: 1.4 },
      Chilli: { min: 8900, modal: 9650, max: 10400, changePct: 5.2 },
      Onion: { min: 2050, modal: 2320, max: 2550, changePct: 3.1 },
      Groundnut: { min: 6100, modal: 6420, max: 6750, changePct: 1.8 },
    },
  },
  {
    mandi: "Bengaluru Binny Mill / KR Market",
    district: "Bengaluru",
    distanceKm: 54,
    mandiFeePct: 2.0,
    pricesByCrop: {
      Tomato: { min: 2450, modal: 2720, max: 2960, changePct: 4.1 },
      Ragi: { min: 3750, modal: 3960, max: 4180, changePct: 2.8 },
      Maize: { min: 2150, modal: 2310, max: 2420, changePct: 2.2 },
      Chilli: { min: 9200, modal: 10150, max: 11100, changePct: 6.4 },
      Onion: { min: 2200, modal: 2490, max: 2780, changePct: 4.7 },
      Groundnut: { min: 6250, modal: 6580, max: 6900, changePct: 2.4 },
    },
  },
  {
    mandi: "Chikkaballapur APMC",
    district: "Chikkaballapur",
    distanceKm: 32,
    mandiFeePct: 1.5,
    pricesByCrop: {
      Tomato: { min: 2250, modal: 2490, max: 2700, changePct: -1.6 },
      Ragi: { min: 3580, modal: 3810, max: 3980, changePct: 0.9 },
      Maize: { min: 2060, modal: 2190, max: 2310, changePct: -0.5 },
      Chilli: { min: 8800, modal: 9500, max: 10100, changePct: 3.0 },
      Onion: { min: 1980, modal: 2250, max: 2480, changePct: 1.2 },
      Groundnut: { min: 6050, modal: 6380, max: 6620, changePct: 1.1 },
    },
  },
  {
    mandi: "Tumakuru APMC",
    district: "Tumakuru",
    distanceKm: 98,
    mandiFeePct: 1.5,
    pricesByCrop: {
      Tomato: { min: 2300, modal: 2580, max: 2820, changePct: 2.4 },
      Ragi: { min: 3820, modal: 4040, max: 4240, changePct: 3.9 },
      Maize: { min: 2120, modal: 2270, max: 2390, changePct: 1.7 },
      Chilli: { min: 9050, modal: 9820, max: 10600, changePct: 4.2 },
      Onion: { min: 2100, modal: 2390, max: 2640, changePct: 2.9 },
      Groundnut: { min: 6350, modal: 6720, max: 7050, changePct: 4.1 },
    },
  },
];

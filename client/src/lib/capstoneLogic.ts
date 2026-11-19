export type IrrigationRecommendation = {
  tone: "amber" | "blue" | "green";
  label: string;
  detail: string;
};

export function getIrrigationRecommendation(soilMoisture: number, threshold: number, rainProbability: number): IrrigationRecommendation {
  if (soilMoisture < threshold && rainProbability < 50) {
    return { tone: "amber", label: "Irrigate soon", detail: `Moisture is ${soilMoisture}%, below the ${threshold}% threshold. Run a short cycle and recheck tomorrow.` };
  }
  if (soilMoisture < threshold && rainProbability >= 50) {
    return { tone: "blue", label: "Wait for rain", detail: `${rainProbability}% rain is expected. Hold irrigation and reassess after the forecast window.` };
  }
  return { tone: "green", label: "Moisture is healthy", detail: "The plot is within its target range. Keep monitoring before the next watering decision." };
}

export type LiveWeatherSummary = {
  temperature: number;
  humidity: number;
  rainProbability: number;
  rainExpectedMm48h: number;
  windSpeed: number;
  et0DailyMm: number;
  soilMoistureTopPct: number;
  weatherCode: number;
  hourly: Array<{
    time: string;
    temperature: number;
    rainProbability: number;
    precipitation: number;
    humidity: number;
    weatherCode: number;
  }>;
  daily: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    rainMm: number;
    rainProbabilityMax: number;
    et0Mm: number;
  }>;
  source: "live" | "fallback";
  fetchedAt: string;
};

export async function fetchOpenMeteoForecast(lat: number, lng: number): Promise<LiveWeatherSummary> {
  const now = new Date();
  const fallback: LiveWeatherSummary = {
    temperature: 28,
    humidity: 68,
    rainProbability: 40,
    rainExpectedMm48h: 6.4,
    windSpeed: 12,
    et0DailyMm: 4.3,
    soilMoistureTopPct: 46,
    weatherCode: 2,
    hourly: Array.from({ length: 6 }, (_, i) => ({
      time: new Date(now.getTime() + i * 3 * 3600_000).toISOString(),
      temperature: [28, 29, 25, 23, 22, 24][i] ?? 26,
      rainProbability: [20, 30, 55, 65, 45, 25][i] ?? 40,
      precipitation: [0, 0.2, 1.8, 2.4, 0.8, 0][i] ?? 0,
      humidity: [64, 61, 74, 80, 78, 70][i] ?? 68,
      weatherCode: [2, 2, 61, 61, 3, 2][i] ?? 2,
    })),
    daily: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(now.getTime() + i * 86400_000).toISOString().slice(0, 10),
      tempMax: [29, 30, 28, 27, 29, 30, 31][i] ?? 29,
      tempMin: [19, 20, 19, 18, 19, 20, 20][i] ?? 19,
      rainMm: [2.5, 4.0, 8.2, 1.5, 0, 0.5, 1.0][i] ?? 2.0,
      rainProbabilityMax: [40, 55, 70, 35, 15, 20, 25][i] ?? 35,
      et0Mm: [4.3, 4.1, 3.6, 4.4, 4.8, 4.9, 4.7][i] ?? 4.3,
    })),
    source: "fallback",
    fetchedAt: now.toISOString(),
  };

  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,soil_moisture_0_to_7cm",
      hourly: "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration",
      forecast_days: "7",
      timezone: "auto",
    }).toString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return fallback;

    const payload = (await response.json()) as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        weather_code?: number;
        soil_moisture_0_to_7cm?: number;
      };
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        relative_humidity_2m?: number[];
        precipitation_probability?: number[];
        precipitation?: number[];
        weather_code?: number[];
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        precipitation_probability_max?: number[];
        et0_fao_evapotranspiration?: number[];
      };
    };

    const current = payload.current;
    const hourly = payload.hourly;
    const daily = payload.daily;
    if (!current || !hourly?.time || !daily?.time) return fallback;

    const rain48h = (daily.precipitation_sum ?? []).slice(0, 2).reduce((sum, v) => sum + (Number(v) || 0), 0);
    // Open-Meteo volumetric soil moisture is ~0.10 to 0.45 m3/m3 -> scale to 0-100 agricultural percentage
    const rawVolSoil = current.soil_moisture_0_to_7cm;
    const scaledSoilPct =
      typeof rawVolSoil === "number" && rawVolSoil > 0
        ? Math.min(95, Math.max(15, Math.round((rawVolSoil / 0.45) * 100)))
        : fallback.soilMoistureTopPct;

    return {
      temperature: Math.round(current.temperature_2m ?? fallback.temperature),
      humidity: Math.round(current.relative_humidity_2m ?? fallback.humidity),
      rainProbability: Math.round(hourly.precipitation_probability?.[0] ?? fallback.rainProbability),
      rainExpectedMm48h: Number(rain48h.toFixed(1)),
      windSpeed: Math.round(current.wind_speed_10m ?? fallback.windSpeed),
      et0DailyMm: Number((daily.et0_fao_evapotranspiration?.[0] ?? fallback.et0DailyMm).toFixed(2)),
      soilMoistureTopPct: scaledSoilPct,
      weatherCode: current.weather_code ?? fallback.weatherCode,
      hourly: hourly.time.slice(0, 8).map((time, index) => ({
        time,
        temperature: Math.round(hourly.temperature_2m?.[index] ?? fallback.temperature),
        rainProbability: Math.round(hourly.precipitation_probability?.[index] ?? 0),
        precipitation: Number((hourly.precipitation?.[index] ?? 0).toFixed(1)),
        humidity: Math.round(hourly.relative_humidity_2m?.[index] ?? 68),
        weatherCode: hourly.weather_code?.[index] ?? 0,
      })),
      daily: daily.time.slice(0, 7).map((date, index) => ({
        date,
        tempMax: Math.round(daily.temperature_2m_max?.[index] ?? 29),
        tempMin: Math.round(daily.temperature_2m_min?.[index] ?? 19),
        rainMm: Number((daily.precipitation_sum?.[index] ?? 0).toFixed(1)),
        rainProbabilityMax: Math.round(daily.precipitation_probability_max?.[index] ?? 20),
        et0Mm: Number((daily.et0_fao_evapotranspiration?.[index] ?? 4.3).toFixed(2)),
      })),
      source: "live",
      fetchedAt: now.toISOString(),
    };
  } catch (error) {
    console.warn("[Weather] Open-Meteo fetch failed, using cached fallback:", error);
    return fallback;
  }
}

import { ENV } from "../_core/env";
import { invokeLLM } from "../_core/llm";
import { KARNATAKA_MANDI_BENCHMARKS, resolveCropProfile } from "./agronomyData";

export type AssistantContext = {
  question: string;
  language: "English" | "Kannada" | "Hindi" | "Telugu" | "Tamil";
  crop: string;
  stage: string;
  soilMoisture: number;
  threshold: number;
  recommendation: string;
  temperature: number;
  rainProbability: number;
  farmLocation?: string;
};

export function hasConfiguredLLM(): boolean {
  return Boolean(ENV.forgeApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

async function callDirectGemini(messages: Array<{ role: string; text: string; imageDataUrl?: string }>, jsonSchema?: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => {
      const parts: Array<Record<string, unknown>> = [{ text: m.text }];
      if (m.imageDataUrl) {
        const match = m.imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });

  const systemMsg = messages.find((m) => m.role === "system")?.text;

  const body: Record<string, unknown> = {
    contents,
    ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg }] } } : {}),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 900,
      ...(jsonSchema ? { responseMimeType: "application/json", responseSchema: jsonSchema } : {}),
    },
  };

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) throw new Error(`Gemini error ${resp.status}`);
  const data = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function callDirectOpenAI(messages: Array<{ role: string; text: string; imageDataUrl?: string }>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const formatted = messages.map((m) => {
    if (m.imageDataUrl) {
      return {
        role: m.role,
        content: [
          { type: "text", text: m.text },
          { type: "image_url", image_url: { url: m.imageDataUrl } },
        ],
      };
    }
    return { role: m.role, content: m.text };
  });

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: formatted, max_tokens: 700, temperature: 0.3 }),
  });
  if (!resp.ok) throw new Error(`OpenAI error ${resp.status}`);
  const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? null;
}

function generateAgronomicAssistantFallback(ctx: AssistantContext): string {
  const q = ctx.question.toLowerCase();
  const profile = resolveCropProfile(ctx.crop);
  const mandi = KARNATAKA_MANDI_BENCHMARKS[0]!.pricesByCrop[profile.crop];

  const isKannada = ctx.language === "Kannada";
  const isHindi = ctx.language === "Hindi";

  // Intent 1: Which crop is suitable for my land?
  if (q.includes("suitable") || q.includes("which crop") || q.includes("ಯಾವ ಬೆಳೆ") || q.includes("ಸೂಕ್ತ") || q.includes("कौन सी फसल")) {
    if (isKannada) {
      return `ನಿಮ್ಮ ${ctx.farmLocation || "ಕೋಲಾರ ಪ್ರದೇಶದ"} ಭೂಮಿಗೆ ಮತ್ತು ${ctx.rainProbability}% ಮಳೆ ಸಾಧ್ಯತೆಗೆ, ಕಡಿಮೆ ನೀರಿನಲ್ಲಿ ಬೆಳೆಯುವ ರಾಗಿ (${profile.crop === "Ragi" ? "ಪ್ರಸ್ತುತ ಬೆಳೆ" : "ಉತ್ತಮ ಪರ್ಯಾಯ"}) ಮತ್ತು ಹನಿ ನೀರಾವರಿ ಇದ್ದರೆ ಟೊಮೆಟೊ ಅಥವಾ ಮೆಣಸಿನಕಾಯಿ ಉತ್ತಮವಾಗಿದೆ. ನೀರಾವರಿ ಲಭ್ಯತೆಯ ಪ್ರಕಾರ 'Profit Planner' ನಲ್ಲಿ ಬೆಳೆ ಹೋಲಿಕೆ ಮಾಡಿ.`;
    }
    if (isHindi) {
      return `आपकी भूमि और ${ctx.rainProbability}% बारिश के पूर्वानुमान को देखते हुए, कम पानी में रागी या मूंगफली सुरक्षित विकल्प हैं, और ड्रिप सिंचाई होने पर टमाटर या मिर्च अच्छा मुनाफा दे सकते हैं।`;
    }
    return `For ${ctx.farmLocation || "Karnataka"} soils (${ctx.temperature}°C, ${ctx.rainProbability}% rain), Ragi and Groundnut perform well if irrigation is limited. With reliable drip water, ${profile.crop} and Chilli deliver higher returns. Compare exact ROI in Profit Planner.`;
  }

  // Intent 2: Why are leaves turning yellow?
  if (q.includes("yellow") || q.includes("leaf") || q.includes("leaves") || q.includes("ಹಳದಿ") || q.includes("ಎಲೆ") || q.includes("पील")) {
    if (isKannada) {
      return `${profile.kannadaName} ಬೆಳೆಯ ಎಲೆಗಳು ಹಳದಿಯಾಗಲು 3 ಮುಖ್ಯ ಕಾರಣಗಳಿವೆ: 1) ಸಾರಜನಕ (Nitrogen) ಕೊರತೆ (ಕೆಳಗಿನ ಹಳೆಯ ಎಲೆಗಳು ಮೊದಲು ಹಳದಿಯಾಗುತ್ತವೆ), 2) ಹೆಚ್ಚು ನೀರು ನಿಂತು ಬೇರು ಕೊಳೆಯುವುದು (ಪ್ರಸ್ತುತ ತೇವಾಂಶ ${ctx.soilMoisture}%), ಅಥವಾ 3) ಆರಂಭಿಕ ಬ್ಲೈಟ್ ರೋಗ. ದಯವಿಟ್ಟು 'Diagnose Crop' ನಲ್ಲಿ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.`;
    }
    if (isHindi) {
      return `${ctx.crop} की पत्तियां पीली पड़ने के 3 मुख्य कारण हो सकते हैं: 1) नाइट्रोजन की कमी (निचली पत्तियां पीली), 2) अधिक पानी से जड़ में नमी तनाव (वर्तमान नमी ${ctx.soilMoisture}%), या 3) शुरुआती झुलसा रोग। सटीक जांच के लिए फोटो अपलोड करें।`;
    }
    return `Yellowing leaves in ${ctx.crop} commonly indicate: (1) Nitrogen deficiency if older lower leaves turn pale uniformly, (2) Root oxygen stress from overwatering (soil moisture is ${ctx.soilMoisture}%), or (3) early fungal blight or mosaic virus. Upload a clear leaf photo in Diagnose Crop for a closer check.`;
  }

  // Intent 3: When should I irrigate?
  if (q.includes("irrigat") || q.includes("water") || q.includes("ನೀರು") || q.includes("ನೀರಾವರಿ") || q.includes("सिंचाई") || q.includes("पानी") || q.includes("నీరు") || q.includes("నీటిపారుదల") || q.includes("நீர்") || q.includes("தண்ணீர்")) {
    if (isKannada) {
      return `ಪ್ರಸ್ತುತ ಮಣ್ಣಿನ ತೇವಾಂಶ ${ctx.soilMoisture}% ಇದೆ (ನಿಗದಿತ ಮಿತಿ ${ctx.threshold}%). ಮಳೆ ಸಾಧ್ಯತೆ ${ctx.rainProbability}% ಇರುವುದರಿಂದ ಸಲಹೆ: ${ctx.soilMoisture < ctx.threshold && ctx.rainProbability < 50 ? "4 ಗಂಟೆಗಳ ಒಳಗೆ ಹಗುರವಾಗಿ ನೀರು ಕೊಡಿ." : ctx.rainProbability >= 50 ? "ಮಳೆ ಬರುವ ಸಾಧ್ಯತೆ ಇರುವುದರಿಂದ ಸದ್ಯಕ್ಕೆ ನೀರಾವರಿ ಮುಂದೂಡಿ." : "ತೇವಾಂಶ ಉತ್ತಮವಾಗಿದೆ, ಇಂದು ನೀರು ಬೇಡ."}`;
    }
    if (isHindi) {
      return `वर्तमान मिट्टी की नमी ${ctx.soilMoisture}% है (लक्ष्य ${ctx.threshold}%) और बारिश की संभावना ${ctx.rainProbability}% है। सलाह: ${ctx.recommendation}`;
    }
    if (ctx.language === "Telugu") {
      return `ప్రస్తుత నేల తేమ ${ctx.soilMoisture}% (పరిమితి ${ctx.threshold}%), వర్షం అవకాశం ${ctx.rainProbability}%. సలహా: ${ctx.soilMoisture < ctx.threshold && ctx.rainProbability < 50 ? "4 గంటల్లో తేలికపాటి నీటిపారుదల చేయండి." : ctx.rainProbability >= 50 ? "వర్షం అవకాశం ఉన్నందున ప్రస్తుతానికి నీరు పెట్టడం వాయిదా వేయండి." : "తేమ సరిగ్గా ఉంది, ఈరోజు నీరు అవసరం లేదు."}`;
    }
    if (ctx.language === "Tamil") {
      return `தற்போதைய மண் ஈரப்பதம் ${ctx.soilMoisture}% (வரம்பு ${ctx.threshold}%), மழை வாய்ப்பு ${ctx.rainProbability}%. ஆலோசனை: ${ctx.soilMoisture < ctx.threshold && ctx.rainProbability < 50 ? "4 மணி நேரத்திற்குள் லேசான நீர்ப்பாசனம் செய்யவும்." : ctx.rainProbability >= 50 ? "மழை வாய்ப்பு உள்ளதால் தற்போது நீர்ப்பாசனத்தை ஒத்திவைக்கவும்." : "ஈரப்பதம் நன்றாக உள்ளது, இன்று நீர் தேவையில்லை."}`;
    }
    return `Your ${ctx.crop} soil moisture is ${ctx.soilMoisture}% (threshold ${ctx.threshold}%), with ${ctx.rainProbability}% rain forecast. Advisory: ${ctx.recommendation}`;
  }

  // Intent 4: Current market price?
  if (q.includes("price") || q.includes("market") || q.includes("mandi") || q.includes("ದರ") || q.includes("ಮಾರುಕಟ್ಟೆ") || q.includes("भाव") || q.includes("मंडी")) {
    if (isKannada) {
      return `ಪ್ರಸ್ತುತ ಮಾದರಿ ಮಾರುಕಟ್ಟೆ ಮಾಹಿತಿ (Demo Snapshot): ಕೋಲಾರ APMC ನಲ್ಲಿ ${profile.kannadaName} ದರ ಕ್ವಿಂಟಲ್‌ಗೆ ಸುಮಾರು ₹${mandi.modal.toLocaleString("en-IN")} (ಕನಿಷ್ಠ ₹${mandi.min.toLocaleString("en-IN")} - ಗರಿಷ್ಠ ₹${mandi.max.toLocaleString("en-IN")}) ಇದೆ. ಸಾಗಾಣಿಕೆ ವೆಚ್ಚ ಕಳೆದು ನಿಮ್ಮ ಲಾಭವನ್ನು 'Market Rates' ನಲ್ಲಿ ಲೆಕ್ಕ ಹಾಕಿ.`;
    }
    if (isHindi) {
      return `वर्तमान मंडी संदर्भ भाव (डेमो डेटा): कोलार मंडी में ${ctx.crop} का मॉडल भाव ₹${mandi.modal.toLocaleString("en-IN")}/क्विंटल (₹${mandi.min.toLocaleString("en-IN")}–₹${mandi.max.toLocaleString("en-IN")}) है। परिवहन खर्च के साथ तुलना 'Market Rates' में देखें।`;
    }
    return `Reference mandi snapshot: ${profile.crop} modal price at Kolar APMC is ₹${mandi.modal.toLocaleString("en-IN")}/quintal (range ₹${mandi.min.toLocaleString("en-IN")}–₹${mandi.max.toLocaleString("en-IN")}). Use the Mandi Negotiation Assistant in Market Rates to compare transport costs and buyer offers.`;
  }

  // Intent 5: How to reduce cultivation expenses?
  if (q.includes("expense") || q.includes("cost") || q.includes("reduce") || q.includes("save") || q.includes("ಖರ್ಚು") || q.includes("ವೆಚ್ಚ") || q.includes("खर्च")) {
    if (isKannada) {
      return `ಬೇಸಾಯದ ಖರ್ಚು ಕಡಿಮೆ ಮಾಡಲು 4 ಉಪಾಯಗಳು: 1) ಮಣ್ಣು ಪರೀಕ್ಷೆ ಮಾಡಿಸಿ ಅಗತ್ಯವಿರುವಷ್ಟು ಮಾತ್ರ ರಸಗೊಬ್ಬರ ಬಳಸಿ, 2) ಸಾವಯವ ಗೊಬ್ಬರ/ಕಾಂಪೋಸ್ಟ್‌ಗಾಗಿ 'Waste Exchange' ಬಳಸಿ, 3) ಮಳೆ ಮುನ್ಸೂಚನೆ ನೋಡಿ ನೀರಾವರಿ ಮಾಡಿ ಪಂಪ್ ವಿದ್ಯುತ್ ಉಳಿಸಿ, 4) ನೇರ ಖರೀದಿದಾರರ ಜೊತೆ 'Mandi Negotiation' ಬಳಸಿ.`;
    }
    return `4 practical ways to reduce ${profile.crop} cultivation expenses: (1) Test soil NPK before applying extra Urea/DAP, (2) Source low-cost compost or crop mulch via Namma Rytha Waste Exchange, (3) Follow weather-aware irrigation schedules to cut pump hours by ~18%, and (4) Compare net mandi offers before paying transport.`;
  }

  if (isKannada) {
    return `${profile.kannadaName} (${ctx.stage} ಹಂತ): ತೇವಾಂಶ ${ctx.soilMoisture}%, ತಾಪಮಾನ ${ctx.temperature}°C, ಮಳೆ ಸಾಧ್ಯತೆ ${ctx.rainProbability}%. ಪ್ರಸ್ತುತ ಸಲಹೆ: ${ctx.recommendation} ಹೆಚ್ಚಿನ ತಪಾಸಣೆಗಾಗಿ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ (Ask an agronomist).`;
  }
  if (isHindi) {
    return `${ctx.crop} (${ctx.stage}): मिट्टी की नमी ${ctx.soilMoisture}% (लक्ष्य ${ctx.threshold}%), तापमान ${ctx.temperature}°C, बारिश की संभावना ${ctx.rainProbability}%। सलाह: ${ctx.recommendation}`;
  }
  if (ctx.language === "Telugu") {
    if (q.includes("irrigat") || q.includes("water") || q.includes("నీరు") || q.includes("నీటిపారుదల")) {
      return `ప్రస్తుత నేల తేమ ${ctx.soilMoisture}% (పరిమితి ${ctx.threshold}%), వర్షం అవకాశం ${ctx.rainProbability}%. సలహా: ${ctx.soilMoisture < ctx.threshold && ctx.rainProbability < 50 ? "4 గంటల్లో తేలికపాటి నీటిపారుదల చేయండి." : ctx.rainProbability >= 50 ? "వర్షం అవకాశం ఉన్నందున ప్రస్తుతానికి నీరు పెట్టడం వాయిదా వేయండి." : "తేమ సరిగ్గా ఉంది, ఈరోజు నీరు అవసరం లేదు."}`;
    }
    if (q.includes("yellow") || q.includes("పసుపు") || q.includes("ఆకులు")) {
      return `${ctx.crop} ఆకులు పసుపు రంగులోకి మారడానికి 3 ప్రధాన కారణాలు: 1) నత్రజని లోపం, 2) అధిక నీటి వల్ల వేరు ఒత్తిడి (తేమ ${ctx.soilMoisture}%), లేదా 3) ఆకు మచ్చ తెగులు. దయచేసి పంట ఫోటో అప్‌లోడ్ చేసి తనిఖీ చేయండి.`;
    }
    if (q.includes("price") || q.includes("market") || q.includes("ధర") || q.includes("మార్కెట్")) {
      return `ప్రస్తుత మండీ సూచన ధర: కోలార్ APMC లో ${profile.crop} సగటు ధర క్వింటాల్‌కు ₹${mandi.modal.toLocaleString("en-IN")} (₹${mandi.min.toLocaleString("en-IN")}–₹${mandi.max.toLocaleString("en-IN")}). రవాణా ఖర్చులతో పోల్చడానికి 'Market Rates' చూడండి.`;
    }
    return `${ctx.crop} (${ctx.stage}): నేల తేమ ${ctx.soilMoisture}% (లక్ష్యం ${ctx.threshold}%), ఉష్ణోగ్రత ${ctx.temperature}°C, వర్షం ${ctx.rainProbability}%. సలహా: ${ctx.recommendation}`;
  }
  if (ctx.language === "Tamil") {
    if (q.includes("irrigat") || q.includes("water") || q.includes("நீர்") || q.includes("தண்ணீர்")) {
      return `தற்போதைய மண் ஈரப்பதம் ${ctx.soilMoisture}% (வரம்பு ${ctx.threshold}%), மழை வாய்ப்பு ${ctx.rainProbability}%. ஆலோசனை: ${ctx.soilMoisture < ctx.threshold && ctx.rainProbability < 50 ? "4 மணி நேரத்திற்குள் லேசான நீர்ப்பாசனம் செய்யவும்." : ctx.rainProbability >= 50 ? "மழை வாய்ப்பு உள்ளதால் தற்போது நீர்ப்பாசனத்தை ஒத்திவைக்கவும்." : "ஈரப்பதம் நன்றாக உள்ளது, இன்று நீர் தேவையில்லை."}`;
    }
    if (q.includes("yellow") || q.includes("மஞ்சள்") || q.includes("இலை")) {
      return `${ctx.crop} இலைகள் மஞ்சளாக மாற 3 முக்கிய காரணங்கள்: 1) நைட்ரஜன் குறைபாடு, 2) அதிக நீரால் வேர் அழுத்தம் (ஈரப்பதம் ${ctx.soilMoisture}%), அல்லது 3) இலைப் புள்ளி நோய். தெளிவான புகைப்படத்தை பதிவேற்றி சரிபார்க்கவும்.`;
    }
    if (q.includes("price") || q.includes("market") || q.includes("விலை") || q.includes("சந்தை")) {
      return `தற்போதைய மண்டி குறிப்பு விலை: கோலார் APMC-யில் ${profile.crop} விலை குவிண்டாலுக்கு ₹${mandi.modal.toLocaleString("en-IN")} (₹${mandi.min.toLocaleString("en-IN")}–₹${mandi.max.toLocaleString("en-IN")}). போக்குவரத்து செலவுடன் ஒப்பிட 'Market Rates' பார்க்கவும்.`;
    }
    return `${ctx.crop} (${ctx.stage}): மண் ஈரப்பதம் ${ctx.soilMoisture}% (இலக்கு ${ctx.threshold}%), வெப்பநிலை ${ctx.temperature}°C, மழை ${ctx.rainProbability}%. ஆலோசனை: ${ctx.recommendation}`;
  }
  return `Context for ${ctx.crop} (${ctx.stage}): Moisture is ${ctx.soilMoisture}% (target ${ctx.threshold}%), temperature ${ctx.temperature}°C, ${ctx.rainProbability}% rain chance. ${ctx.recommendation} Feel free to ask about irrigation, leaf yellowing, mandi prices, or crop selection.`;
}

export async function generateAssistantReply(ctx: AssistantContext): Promise<{ answer: string; providerMode: "live-llm" | "agronomic-fallback" }> {
  const systemPrompt = `You are Namma Rytha, an experienced Indian agricultural scientist and friendly farm advisor. Reply strictly in ${ctx.language} using clear, short, practical sentences suitable for spoken audio (under 110 words). Use the farmer's real context without inventing readings. Context: Crop ${ctx.crop} (${ctx.stage}), Soil Moisture ${ctx.soilMoisture}%, Threshold ${ctx.threshold}%, Temp ${ctx.temperature}°C, Rain Chance ${ctx.rainProbability}%, Current Recommendation: ${ctx.recommendation}.`;

  try {
    if (ENV.forgeApiKey) {
      const response = await invokeLLM({
        model: "claude-haiku-4-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: ctx.question },
        ],
        max_tokens: 450,
      });
      const raw = response.choices[0]?.message?.content;
      if (typeof raw === "string" && raw.trim()) {
        return { answer: raw.trim(), providerMode: "live-llm" };
      }
    }
    if (process.env.GEMINI_API_KEY) {
      const answer = await callDirectGemini([
        { role: "system", text: systemPrompt },
        { role: "user", text: ctx.question },
      ]);
      if (answer?.trim()) return { answer: answer.trim(), providerMode: "live-llm" };
    }
    if (process.env.OPENAI_API_KEY) {
      const answer = await callDirectOpenAI([
        { role: "system", text: systemPrompt },
        { role: "user", text: ctx.question },
      ]);
      if (answer?.trim()) return { answer: answer.trim(), providerMode: "live-llm" };
    }
  } catch (error) {
    console.warn("[AI Assistant] Remote LLM failed, using deterministic bilingual engine:", error);
  }

  return {
    answer: generateAgronomicAssistantFallback(ctx),
    providerMode: "agronomic-fallback",
  };
}

export type DiagnosisOutput = {
  likelyCondition: string;
  category: "disease" | "pest" | "nutrient_deficiency" | "healthy" | "unknown";
  confidence: number;
  severity: "low" | "moderate" | "high" | "unknown";
  explanation: string;
  immediateActions: string[];
  preventionSteps: string[];
  needsAgronomist: boolean;
  safetyNote: string;
  providerMode: "live-llm" | "agronomic-fallback";
};

const diagnosisSchemaObj = {
  name: "crop_diagnosis",
  strict: true,
  schema: {
    type: "object",
    properties: {
      likelyCondition: { type: "string" },
      category: { type: "string", enum: ["disease", "pest", "nutrient_deficiency", "healthy", "unknown"] },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      severity: { type: "string", enum: ["low", "moderate", "high", "unknown"] },
      explanation: { type: "string" },
      immediateActions: { type: "array", items: { type: "string" } },
      preventionSteps: { type: "array", items: { type: "string" } },
      needsAgronomist: { type: "boolean" },
      safetyNote: { type: "string" },
    },
    required: ["likelyCondition", "category", "confidence", "severity", "explanation", "immediateActions", "preventionSteps", "needsAgronomist", "safetyNote"],
    additionalProperties: false,
  },
} as const;

export async function runCropDiagnosisAI(input: {
  imageDataUrl: string;
  crop: string;
  symptoms?: string;
  language: "English" | "Kannada" | "Hindi" | "Telugu" | "Tamil";
  visualHints?: { greenPct: number; yellowPct: number; brownSpotPct: number };
}): Promise<DiagnosisOutput> {
  const sys = `You are an agricultural crop-health assistant for smallholder farmers in India. Analyze the crop photo conservatively. Do not claim certainty from one image. Never prescribe banned/exact chemical dosages. Prefer sanitation, cultural practices, IPM, and agronomist review. Return all explanation and actions in ${input.language}.`;

  try {
    if (ENV.forgeApiKey) {
      const response = await invokeLLM({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content: [
              { type: "text", text: `Crop: ${input.crop}. Farmer-reported symptoms: ${input.symptoms || "none provided"}.` },
              { type: "image_url", image_url: { url: input.imageDataUrl, detail: "auto" } },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: diagnosisSchemaObj },
        max_tokens: 1100,
      });
      const raw = response.choices[0]?.message?.content;
      const parsed = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw)) as Omit<DiagnosisOutput, "providerMode">;
      return { ...parsed, providerMode: "live-llm" };
    }
    if (process.env.GEMINI_API_KEY) {
      const raw = await callDirectGemini(
        [
          { role: "system", text: sys },
          { role: "user", text: `Crop: ${input.crop}. Farmer-reported symptoms: ${input.symptoms || "none provided"}. Return JSON matching schema.`, imageDataUrl: input.imageDataUrl },
        ],
        diagnosisSchemaObj.schema as unknown as Record<string, unknown>
      );
      if (raw) {
        const parsed = JSON.parse(raw) as Omit<DiagnosisOutput, "providerMode">;
        return { ...parsed, providerMode: "live-llm" };
      }
    }
  } catch (error) {
    console.warn("[CropDiagnosis] Vision LLM unavailable, using visual/symptom fallback:", error);
  }

  // Transparent rule + visual histogram analysis fallback when external Vision API key isn't configured
  const profile = resolveCropProfile(input.crop);
  const sym = (input.symptoms || "").toLowerCase();
  const hints = input.visualHints;
  const highYellow = (hints && hints.yellowPct > 18) || sym.includes("yellow") || sym.includes("pale") || sym.includes("ಹಳದಿ");
  const highBrown = (hints && hints.brownSpotPct > 10) || sym.includes("spot") || sym.includes("blight") || sym.includes("brown") || sym.includes("rot");
  const isPest = sym.includes("curl") || sym.includes("insect") || sym.includes("hole") || sym.includes("miner") || sym.includes("mite");

  if (isPest) {
    return {
      likelyCondition: `${profile.crop} Sap-Sucking Pest / Leaf Curl Suspected`,
      category: "pest",
      confidence: 0.66,
      severity: "moderate",
      explanation: `Reported symptoms match common vector/pest stress on ${profile.crop}. Notice: External Vision API key is not configured, so this check relies on symptom keywords & visual color profile.`,
      immediateActions: ["Inspect undersides of tender upper leaves with a hand lens.", "Install yellow/blue sticky traps at canopy height."],
      preventionSteps: ["Remove severely curled weed hosts on plot borders.", "Avoid broad-spectrum chemical sprays that kill beneficial ladybugs."],
      needsAgronomist: true,
      safetyNote: "This is a local visual/symptom screening check. Escalate to an agronomist before spraying.",
      providerMode: "agronomic-fallback",
    };
  }

  if (highBrown) {
    const d = profile.commonDiseases[0];
    return {
      likelyCondition: d?.name ?? `${profile.crop} Fungal Leaf Spot Suspected`,
      category: "disease",
      confidence: 0.64,
      severity: "moderate",
      explanation: `${hints ? `Leaf scan detected ~${hints.brownSpotPct}% dark/necrotic spot tones` : "Reported spots/blight symptoms"} consistent with ${d?.name ?? "early foliar blight"} on ${profile.crop}. (Running in local visual check mode without external Vision LLM key.)`,
      immediateActions: [
        "Prune and bag heavily spotted lower leaves away from the plot.",
        "Avoid overhead irrigation late in the afternoon so leaves stay dry overnight.",
      ],
      preventionSteps: [d?.prevention ?? "Increase plant spacing for airflow and mulch soil.", "Monitor adjacent rows after rainfall."],
      needsAgronomist: true,
      safetyNote: "Conservative rule-based assessment. Confirm with an agronomist via the Inbox button before applying fungicides.",
      providerMode: "agronomic-fallback",
    };
  }

  if (highYellow) {
    return {
      likelyCondition: `${profile.crop} Nitrogen / Chlorosis Stress Suspected`,
      category: "nutrient_deficiency",
      confidence: 0.62,
      severity: "low",
      explanation: `${hints ? `Image color check found ~${hints.yellowPct}% yellow-chlorotic leaf pixels` : "Reported yellowing"} often tied to nitrogen deficiency or temporary root saturation in ${profile.crop}. (Local check mode.)`,
      immediateActions: ["Check root-zone drainage to rule out waterlogging.", "Apply compost/vermicompost side-dressing if older leaves yellow first."],
      preventionSteps: ["Schedule balanced NPK split feeding matched to growth stage.", "Run a soil test before heavy urea top-dressing."],
      needsAgronomist: false,
      safetyNote: "Verify soil moisture before adding fertilizer to wet beds.",
      providerMode: "agronomic-fallback",
    };
  }

  return {
    likelyCondition: `${profile.crop} Foliage Appears Stable (First Check)`,
    category: "healthy",
    confidence: 0.72,
    severity: "low",
    explanation: `${hints ? `Leaf greenery index (${hints.greenPct}% healthy green foliage)` : "No strong blight or curl symptoms noted"} indicates generally healthy canopy vigor. (Local visual check mode.)`,
    immediateActions: ["Continue scouting lower leaves twice a week.", "Maintain scheduled irrigation thresholds."],
    preventionSteps: ["Keep crop beds weed-free and mulched.", "Re-scan if weather turns humid (>75%) for 48+ hours."],
    needsAgronomist: false,
    safetyNote: "AI/visual screening does not replace field inspection when conditions change rapidly.",
    providerMode: "agronomic-fallback",
  };
}

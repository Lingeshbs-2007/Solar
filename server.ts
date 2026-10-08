import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Google GenAI client server-side
// Supports GEMINI_API_KEY, gemini_api_key, and strips accidental quotes/spaces
const rawApiKey = (process.env.GEMINI_API_KEY || process.env.gemini_api_key || '').trim().replace(/^['"]|['"]$/g, '');
const apiKey = rawApiKey && rawApiKey !== 'MY_GEMINI_API_KEY' && rawApiKey !== 'my_gemini_api_key' ? rawApiKey : '';

let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
  console.log('✅ Google Gemini API client initialized successfully');
} else {
  console.warn('⚠️ No valid GEMINI_API_KEY provided in .env (or placeholder value detected). Solar assistant will use high-accuracy deterministic solar domain responses until an API key is set.');
}

const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

async function generateWithFallback(options: {
  contents: any;
  config?: any;
}) {
  if (!aiClient) throw new Error('Gemini API client not configured with GEMINI_API_KEY');
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} unavailable: ${err.message}. Trying next candidate model...`);
      lastError = err;
    }
  }
  throw lastError || new Error('All Gemini candidate models failed');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!aiClient,
    timestamp: new Date().toISOString(),
  });
});

// AI Recommendation Explanation endpoint
app.post('/api/recommendation', async (req, res) => {
  try {
    const { forecast, metrics, decisions } = req.body;

    if (!forecast || !metrics || !decisions) {
      return res.status(400).json({ error: 'Missing optimization payload' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini API client not configured with GEMINI_API_KEY',
      });
    }

    const promptText = `
You are an expert renewable energy system analyst reviewing the output of a deterministic constraint-aware appliance optimizer for a rooftop-solar household.

CRITICAL RULES:
1. You must strictly ground all statements in the supplied numbers.
2. DO NOT recalculate or modify energy values, schedules, percentages, or cost figures.
3. DO NOT invent new appliances or override any decision.
4. If no appliances were shifted, clearly explain why maintaining the normal schedule is the optimal decision.
5. Clearly articulate:
   - What changed vs what stayed fixed
   - How solar peak hours and available surplus drove each shifting decision
   - The reduction in grid import and improvement in solar self-consumption
   - The forecast confidence assessment and cloud condition context
   - Practical guidance for the homeowner (e.g., using appliance delay timers)

OPTIMIZER OUTPUT DATA:
Location: ${forecast.location}
Date: ${forecast.date}
Forecasted Solar Total: ${forecast.totalSolarGenerationKWh} kWh (Confidence interval: ${forecast.confidenceLowerTotal} - ${forecast.confidenceUpperTotal} kWh)
Forecast Confidence: ${forecast.forecastConfidence}
Midday Solar Window: ${forecast.usefulWindow.startHour}:00 - ${forecast.usefulWindow.endHour}:00 (Peak ${forecast.usefulWindow.peakKW} kW)
Weather context: ${forecast.weatherSummary}

SIMULATION IMPACT:
- Solar self-consumption: ${metrics.normalSelfConsumptionPct}% -> ${metrics.optimizedSelfConsumptionPct}% (+${metrics.selfConsumptionGainPctPoints}% points)
- Grid import: ${metrics.normalGridImportKWh} kWh -> ${metrics.optimizedGridImportKWh} kWh (${metrics.gridReductionKWh} kWh avoided)
- Potential cost impact: ₹${metrics.potentialCostImpactINR}
- CO2 emissions avoided: ${metrics.co2AvoidedKg} kg
- Shifted appliances: ${metrics.shiftedCount} of ${metrics.totalCount}

APPLIANCE DECISIONS:
${JSON.stringify(decisions, null, 2)}
`;

    const response = await generateWithFallback({
      contents: promptText,
      config: {
        systemInstruction:
          'You are a clear, objective solar optimization advisor for households. Never compute or fabricate energy or monetary numbers. Always explain the decisions made by the optimizer faithfully.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: {
              type: Type.STRING,
              description: 'Short headline summarizing the optimization outcome (e.g., "Shifted 3 appliances to 11am-2pm solar peak")',
            },
            summaryParagraph: {
              type: Type.STRING,
              description: 'A 2-3 sentence overview explaining how solar self-consumption improved and grid import was reduced.',
            },
            keyInsights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3-4 concise bullet points explaining specific appliance movements or reasons for keeping fixed.',
            },
            actionableGuidance: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 practical steps for the household (e.g., programming delay timer on washing machine, running during recommended solar window).',
            },
            confidenceAssessment: {
              type: Type.STRING,
              description: 'Assessment of forecast reliability based on forecasted weather and confidence bounds.',
            },
          },
          required: ['headline', 'summaryParagraph', 'keyInsights', 'actionableGuidance', 'confidenceAssessment'],
        },
      },
    });

    const jsonText = response.text?.trim() || '{}';
    const parsed = JSON.parse(jsonText);

    return res.json({ explanation: parsed });
  } catch (error: any) {
    console.error('Gemini recommendation error:', error);
    return res.status(500).json({ error: error.message || 'Error generating explanation' });
  }
});

// Dedicated Solar AI Assistant endpoint
app.post('/api/assistant', async (req, res) => {
  try {
    const { question, context, history } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing question' });
    }

    if (!aiClient) {
      return res.status(503).json({
        error: 'Gemini API client not configured with GEMINI_API_KEY',
      });
    }

    const systemPrompt = `You are a concise, knowledgeable Solar Energy & Photovoltaics AI Consultant.
Your mission is to answer ANY question related to solar panels, rooftop solar PV, equipment, maintenance, inverters, batteries, grid connection, efficiency, and green energy.

STRICT GUIDELINES:
1. DIRECT & ACCURATE: Answer the specific question directly without unnecessary filler, repetitive preambles, or conversational fluff.
2. NO REPETITION: Do NOT repeat previously stated points or regurgitate the same answers. Give fresh, specific details tailored to what was asked.
3. CONCISE LENGTH: Keep responses to 2–4 informative sentences or 3–4 punchy bullet points. Avoid walls of text.
4. GENERAL SOLAR FOCUS: Cover general solar industry knowledge (photovoltaic physics, monocrystalline vs polycrystalline vs TOPCon, bifacial panels, string inverters vs microinverters, battery storage, cleaning techniques, temperature degradation, tilt angles, net metering, ROI).
5. HOUSEHOLD CONTEXT: Do NOT mention specific household demand numbers or scheduled appliances UNLESS the user explicitly asks about their personal schedule or their home.
`;

    // Construct prompt with optional recent conversation turns
    let contents = '';
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-4).map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');
      contents = `Recent conversation:\n${recentHistory}\n\nUser: ${question}\nAssistant:`;
    } else {
      contents = question;
    }

    const response = await generateWithFallback({
      contents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const reply = response.text?.trim() || 'I could not generate an answer right now.';
    return res.json({ answer: reply });
  } catch (error: any) {
    console.error('Assistant API error:', error);
    return res.status(500).json({ error: error.message || 'Error generating assistant answer' });
  }
});

// Setup Vite dev server or static serve
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Solar Optimizer Server listening on http://0.0.0.0:${port} (production: ${isProduction})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

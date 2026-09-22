import type { VercelRequest, VercelResponse } from '@vercel/node';

let genAiClient: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const feeling = req.body?.feeling || 'contemplative';
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      return res.status(200).json({
        success: true,
        prescription: 'We prescribe three moments of stillness under the open sky, and warm botanical tea to anchor the spirit.'
      });
    }

    if (!genAiClient) {
      const { GoogleGenAI } = await import('@google/genai');
      genAiClient = new GoogleGenAI({ apiKey });
    }

    const response = await genAiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are the curator of "Haus of Zen", a modern apothecary that believes health is a narrative. 
The user is feeling: "${feeling}".

Generate a short, poetic, and abstract "prescription" (max 2 sentences). 
Focus on metaphors of nature, tea, herbs, silence, or light. 
Do not give medical advice. 
The tone should be ethereal, grounded, and healing.

Example format: "We prescribe three moments of silence at dawn and a cup of warm ginger to ignite the inner hearth."`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const prescription = response.text?.trim() || 'The silence speaks when words fail. Breathe deeply.';
    return res.status(200).json({ success: true, prescription });
  } catch (err: any) {
    console.error('Prescription generation error:', err);
    return res.status(200).json({
      success: true,
      prescription: 'We prescribe slow diaphragmatic breaths and a quiet space to let stillness restore clarity.'
    });
  }
}

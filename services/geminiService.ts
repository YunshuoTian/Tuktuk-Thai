import { GoogleGenAI, Type } from "@google/genai";

// Step 1: FAST Translation using Google Translate API (Direct)
export const quickTranslate = async (text: string): Promise<{ translatedText: string; transliteration: string }> => {
  try {
    const isThaiInput = /[\u0E00-\u0E7F]/.test(text);
    const sourceLang = 'auto';
    const targetLang = isThaiInput ? 'en' : 'th';
    
    // Direct URL for client-side usage. 
    // Note: This may be subject to CORS restrictions on some hosting platforms.
    // The fallback to Gemini ensures the app remains functional if this fails.
    const baseUrl = 'https://translate.googleapis.com/translate_a/single'; 
    
    const params = new URLSearchParams();
    params.append('client', 'gtx');
    params.append('sl', sourceLang);
    params.append('tl', targetLang);
    params.append('dt', 't');  // Translation
    params.append('dt', 'rm'); // Romanization/Transliteration
    params.append('q', text);

    const response = await fetch(`${baseUrl}?${params.toString()}`);
    
    if (!response.ok) throw new Error(`Translation API failed with status ${response.status}`);
    
    const data = await response.json();
    
    // Data structure from Google API is a nested array:
    const translationParts = data[0];
    let translatedText = "";
    let transliteration = "";

    // 1. Construct full translation
    if (translationParts && translationParts.length > 0) {
        translatedText = translationParts
            .map((part: any) => part[0])
            .filter((t: any) => t)
            .join("");
    }

    // 2. Extract Transliteration
    const lastPart = translationParts[translationParts.length - 1];
    
    if (isThaiInput) {
        // If input is Thai, we want Romanization of the INPUT (usually index 3)
        if (lastPart && lastPart.length >= 3 && lastPart[3]) {
            transliteration = lastPart[3]; 
        } 
    } else {
        // If input is English, target is Thai. We want Romanization of the OUTPUT (usually index 2)
        if (lastPart && lastPart.length >= 3 && lastPart[2]) {
             transliteration = lastPart[2];
        }
    }

    return {
      translatedText: translatedText || "Translation failed",
      transliteration: transliteration || "", 
    };

  } catch (error) {
    console.warn("Google Translate API blocked (likely CORS). Falling back to Gemini...", error);
    // Fallback to Gemini if Google API fails (common on GitHub Pages due to CORS)
    return quickTranslateGeminiFallback(text);
  }
};

// Fallback function if Google Translate API fails
const quickTranslateGeminiFallback = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Translate to ${/[\u0E00-\u0E7F]/.test(text) ? 'English' : 'Thai'}. Return JSON: { "translatedText": "...", "transliteration": "..." }`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  
  const parsed = JSON.parse(response.text || "{}");
  return {
    translatedText: parsed.translatedText || "Translation Error",
    transliteration: parsed.transliteration || ""
  };
};

// Step 2: Deeper analysis for segments and examples
export const analyzeText = async (original: string, translated: string): Promise<{ segments: any[]; exampleSentenceThai: string; exampleSentenceEnglish: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prompt optimized to prioritize literal dictionary meaning
  const prompt = `
    Context: Input "${original}", Translation "${translated}".
    1. Segment the Thai text (source or translation) into individual words.
    2. For each segment provide:
       - Thai word
       - Transliteration
       - English meaning: MUST provide the primary literal dictionary definition FIRST. If the word has a different meaning in this specific context, include it after in parentheses. Example: for 'ตรง' (in 'straight on time'), return 'straight (context: on time)'.
       - Part of Speech.
    3. Generate ONE simple example sentence using the main keyword.
    4. IMPORTANT: If the original transliteration was missing, ensure segments have accurate transliteration.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          segments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                thai: { type: Type.STRING },
                transliteration: { type: Type.STRING },
                english: { type: Type.STRING },
                partOfSpeech: { type: Type.STRING },
              },
              required: ["thai", "transliteration", "english", "partOfSpeech"],
            },
          },
          exampleSentenceThai: { type: Type.STRING },
          exampleSentenceEnglish: { type: Type.STRING },
        },
        required: ["segments", "exampleSentenceThai", "exampleSentenceEnglish"],
      },
    },
  });

  const text = response.text;
  if (!text) {
      return { segments: [], exampleSentenceThai: "", exampleSentenceEnglish: "" };
  }
  return JSON.parse(text);
};

// Step 3: Enrich with Synonyms (Separate call)
export const getSynonymsForSegments = async (segments: any[]) => {
    if (!segments || segments.length === 0) return segments;

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We only process the first 8 segments to save tokens/time if there are many
    const targets = segments.slice(0, 8);
    const words = targets.map(s => s.thai).join(", ");

    const prompt = `
      For the following Thai words: ${words}
      Provide 2-3 synonyms for each.
      Return a JSON array of objects with 'word' and 'synonyms'.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            synonyms: { 
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ["word", "synonyms"]
                    }
                }
            }
        });

        const synonymData = JSON.parse(response.text || "[]");

        // Merge synonyms back into segments
        return segments.map(segment => {
            const match = synonymData.find((d: any) => d.word === segment.thai);
            return {
                ...segment,
                synonyms: match ? match.synonyms : []
            };
        });

    } catch (error) {
        console.error("Failed to fetch synonyms", error);
        // Return original segments if this enhancement fails
        return segments;
    }
};
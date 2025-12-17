import { GoogleGenAI } from "@google/genai";
import { blobToBase64, base64ToUint8Array } from "../utils/fileUtils";
import { Language } from "../types";

// Initialize Gemini
// NOTE: API Key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getSystemInstruction = (language: Language): string => {
  const baseInstruction = `
    You are a professional transcriber. 
    Task:
    1. Transcribe the audio exactly as spoken.
    2. Format the output as a clean, readable script.
    3. If there are multiple speakers, try to distinguish them as 'Speaker 1', 'Speaker 2', etc.
    4. Do not add any introductory or concluding remarks. Just provide the transcript text.
  `;

  switch (language) {
    case 'Urdu':
      return `${baseInstruction}
      5. The audio is in Urdu. Transcribe primarily in Urdu script (Nastaliq style unicode).
      6. If English words are used, you may keep them in English script if it represents clear code-switching, otherwise transliterate standard terms.`;
    case 'English':
      return `${baseInstruction}
      5. The audio is in English. Transcribe in standard English.`;
    case 'Mixed':
    default:
      return `${baseInstruction}
      5. The audio contains mixed speech in Urdu and English.
      6. Use proper Urdu script (Nastaliq style unicode) for Urdu parts and English script for English parts.`;
  }
};

export const transcribeAudio = async (audioBlob: Blob, mimeType: string, language: Language): Promise<string> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);
    
    // We use gemini-2.5-flash as it is efficient and has great multimodal capabilities
    const modelId = "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: getSystemInstruction(language)
          }
        ]
      }
    });

    return response.text || "No transcription generated.";
  } catch (error) {
    console.error("Gemini Transcription Error:", error);
    throw new Error("Failed to transcribe audio. Please try again.");
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<Uint8Array> => {
  try {
    // Using flash-preview-tts for text-to-speech
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: {
        parts: [{ text: text }]
      },
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio content generated");
    }
    
    return base64ToUint8Array(base64Audio);
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw new Error("Failed to generate speech audio.");
  }
};
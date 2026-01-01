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
    case 'Siraiki':
      return `${baseInstruction}
      5. The audio is in Siraiki. Transcribe using the Siraiki/Urdu script (Arabic-based Shahmukhi script).
      6. Ensure specific Siraiki characters (like heavy consonants unique to the language) are represented correctly if using standard Unicode blocks.`;
    case 'English':
      return `${baseInstruction}
      5. The audio is in English. Transcribe in standard English.`;
    case 'Mixed':
    default:
      return `${baseInstruction}
      5. The audio contains mixed speech in Urdu, Siraiki, and English.
      6. Use proper scripts for each: Nastaliq style for Urdu/Siraiki and English script for English parts.
      7. Detect the language shifts naturally.`;
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

// Helper to chunk text to avoid hitting the 8192 token limit of the TTS model
const MAX_CHAR_LIMIT = 3000; // Conservative limit (~750 tokens) to be safe

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  // Split by generic sentence delimiters including newlines to keep flow natural
  const rawSentences = text.match(/[^.!?\n]+[.!?\n]+(\s+|$)|[^.!?\n]+$/g) || [text];
  
  let currentChunk = '';
  
  for (const sentence of rawSentences) {
    // If a single sentence is larger than limit (unlikely but possible), we split it hard
    if (sentence.length > MAX_CHAR_LIMIT) {
       if (currentChunk) {
           chunks.push(currentChunk.trim());
           currentChunk = '';
       }
       
       let remaining = sentence;
       while (remaining.length > 0) {
           if (remaining.length <= MAX_CHAR_LIMIT) {
               currentChunk = remaining;
               break;
           }
           // Try to break at a space
           let breakIndex = remaining.lastIndexOf(' ', MAX_CHAR_LIMIT);
           if (breakIndex === -1) breakIndex = MAX_CHAR_LIMIT;
           
           chunks.push(remaining.substring(0, breakIndex).trim());
           remaining = remaining.substring(breakIndex);
       }
    } else if ((currentChunk + sentence).length <= MAX_CHAR_LIMIT) {
      currentChunk += sentence;
    } else {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export const generateSpeech = async (text: string, voiceName: string = 'Puck'): Promise<Uint8Array> => {
  try {
    const textChunks = chunkText(text);
    const audioChunks: Uint8Array[] = [];
    let totalLength = 0;

    // Process chunks sequentially
    for (const chunk of textChunks) {
       if (!chunk.trim()) continue;

       const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: {
          parts: [{ text: chunk }]
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
      if (base64Audio) {
        const audioData = base64ToUint8Array(base64Audio);
        audioChunks.push(audioData);
        totalLength += audioData.length;
      }
    }
    
    if (totalLength === 0) {
      throw new Error("No audio content generated from Gemini.");
    }

    // Concatenate chunks
    const combinedAudio = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      combinedAudio.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combinedAudio;

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    // Return a more user-friendly error if possible, or rethrow
    throw new Error("Failed to generate speech audio. The text might be too complex or the service is temporarily unavailable.");
  }
};
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

const API_KEY = process.env.API_KEY || '';

export const generateSpeech = async (
  text: string, 
  voice: VoiceName,
  audioContext: AudioContext
): Promise<AudioBuffer> => {
  if (!API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }

    const rawBytes = decodeBase64(base64Audio);
    // 24000Hz is standard for the flash-preview-tts model
    const audioBuffer = await decodeAudioData(rawBytes, audioContext, 24000, 1);
    
    return audioBuffer;
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
};

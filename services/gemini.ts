import { GoogleGenAI } from "@google/genai";
import { ChatMode, GeminiResponse, MapMarker, Location } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_MAPS = `
You are a helpful location assistant. You have access to real-time Google Maps data. 
When the user asks about places, locations, or geography, use the 'googleMaps' tool to find accurate information.
Crucially, after your natural language answer, if you have identified specific physical locations that can be plotted on a map, you MUST provide a JSON block at the very end of your response.
The JSON block should strictly follow this schema:
\`\`\`json
[
  {
    "name": "Name of the place",
    "lat": 12.3456,
    "lng": -98.7654,
    "description": "Short snippet about this place"
  }
]
\`\`\`
If you cannot find specific coordinates, do not invent them. Only output the JSON if you have high confidence in the location data or can infer it reliably from the tool output.
`;

const SYSTEM_INSTRUCTION_SEARCH = `
You are a knowledgeable research assistant. You have access to Google Search.
Use the 'googleSearch' tool to find the most up-to-date information, news, and facts.
Always cite your sources implicitly by using the tool, and the system will handle displaying the links.
`;

const SYSTEM_INSTRUCTION_CHAT = `
You are a highly intelligent and capable AI assistant. 
You can help with complex reasoning, coding, creative writing, and general questions.
`;

export const sendMessageToGemini = async (
  prompt: string,
  mode: ChatMode,
  userLocation?: Location
): Promise<GeminiResponse> => {
  try {
    let modelName = 'gemini-3-pro-preview';
    let tools: any[] = [];
    let systemInstruction = SYSTEM_INSTRUCTION_CHAT;
    let toolConfig: any = undefined;

    // Configure based on mode
    if (mode === ChatMode.MAPS) {
      modelName = 'gemini-2.5-flash';
      systemInstruction = SYSTEM_INSTRUCTION_MAPS;
      tools = [{ googleMaps: {} }];
      
      // Add user location context if available
      if (userLocation) {
        toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: userLocation.lat,
              longitude: userLocation.lng
            }
          }
        };
      }
    } else if (mode === ChatMode.SEARCH) {
      modelName = 'gemini-2.5-flash';
      systemInstruction = SYSTEM_INSTRUCTION_SEARCH;
      tools = [{ googleSearch: {} }];
    } else {
      // General Chat Mode
      modelName = 'gemini-3-pro-preview';
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        toolConfig: toolConfig,
      },
    });

    const text = response.text || "I couldn't generate a text response.";
    let markers: MapMarker[] = [];
    let sources: Array<{ title: string; uri: string }> = [];

    // Parse Grounding Metadata for Sources (Search & Maps)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title || 'Web Source', uri: chunk.web.uri });
        } else if (chunk.maps) {
          sources.push({ title: chunk.maps.title || 'Map Location', uri: chunk.maps.uri });
        }
      });
    }

    // Parse JSON for Map Markers (Only in MAPS mode or if model voluntarily provides it)
    if (mode === ChatMode.MAPS) {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (Array.isArray(parsed)) {
            markers = parsed.map((m: any, idx: number) => ({
              id: `marker-${Date.now()}-${idx}`,
              name: m.name,
              lat: m.lat,
              lng: m.lng,
              description: m.description
            }));
          }
        } catch (e) {
          console.warn("Failed to parse map markers JSON:", e);
        }
      }
    }

    // Clean text by removing the JSON block if present
    const cleanText = text.replace(/```json\n[\s\S]*?\n```/, '').trim();

    return {
      text: cleanText,
      markers,
      sources,
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "I encountered an error connecting to the service. Please check your connection and try again.",
    };
  }
};
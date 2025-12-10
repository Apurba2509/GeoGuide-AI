import { GoogleGenAI } from "@google/genai";
import { ChatMode, GeminiResponse, MapMarker, Location } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_MAPS = `
You are a helpful location assistant. You have access to real-time Google Maps data via the 'googleMaps' tool.

**Your Goals:**
1. **Answer Questions**: Provide natural, helpful answers about places, geography, and navigation.
2. **Places of Interest (POI)**: When a user asks about a specific location, primarily answer their question. THEN, proactively list 2-3 notable nearby points of interest (e.g., famous landmarks, parks, highly-rated restaurants) to enrich the context. Provide a brief description and estimated distance/direction for each if possible.
3. **Route Planning**: If the user asks for directions between two points (e.g., "Route from A to B"), use the map tool to identify both locations. Provide a summary of the route including estimated travel time and distance in your text response.

**CRITICAL: JSON Output**
After your text response, if you have identified physical locations (the queried place, POIs, or route origin/destination), you MUST output a JSON block.
The JSON block must strictly follow this schema:
\`\`\`json
[
  {
    "name": "Place Name",
    "lat": 12.3456,
    "lng": -98.7654,
    "description": "Short snippet",
    "type": "default" | "poi" | "origin" | "destination",
    "distance": "e.g. 0.5 miles, 10 min walk" (optional)
  }
]
\`\`\`
- Use "origin" and "destination" types ONLY for route planning requests.
- Use "poi" for the nearby suggestions.
- Use "default" for the main subject of the query.
- Do not invent coordinates. Use the tool data or high-confidence inference.
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
              description: m.description,
              type: m.type || 'default',
              distance: m.distance
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
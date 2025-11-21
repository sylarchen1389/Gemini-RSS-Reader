import { GoogleGenAI } from "@google/genai";

// Initialize the client with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSummary = async (content: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please configure process.env.API_KEY.");
  }

  // Truncate content to avoid huge token usage if content is extremely long, 
  // keeping enough context for a summary.
  const cleanContent = content.replace(/<[^>]*>?/gm, ' ').substring(0, 15000);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful assistant that summarizes articles. 
      Please provide a concise summary of the following text. 
      The summary should be 3-5 bullet points. 
      Format the output as Markdown.
      
      Text:
      ${cleanContent}`,
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
};
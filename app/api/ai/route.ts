import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server misconfiguration: API_KEY missing" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Truncate content to stay within token limits while keeping context
    const cleanContent = content.replace(/<[^>]*>?/gm, ' ').substring(0, 15000);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful assistant that summarizes articles. 
      Please provide a concise summary of the following text. 
      The summary should be 3-5 bullet points. 
      Format the output as Markdown.
      
      Text:
      ${cleanContent}`,
    });

    return NextResponse.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate summary" }, { status: 500 });
  }
}
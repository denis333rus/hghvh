import { GoogleGenAI, Type } from "@google/genai";
import { SearchResult, ChatMessage, CourtVerdict } from "../types";

// Initialize the client safely.
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : 'DUMMY_KEY';
const ai = new GoogleGenAI({ apiKey });

const cleanResponse = (text: string | undefined): string => {
  if (!text) return "";
  // Remove markdown code blocks (e.g. ```json ... ``` or ```html ... ```)
  return text.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();
};

/**
 * Searches for websites using Gemini with Google Search Grounding.
 */
export const searchWeb = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for "${query}". Return a list of 5 relevant websites. The results should be relevant for a Russian user. Mix of controversial and safe sites.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              snippet: { type: Type.STRING }
            },
            required: ["title", "url", "snippet"]
          }
        }
      },
    });

    const text = cleanResponse(response.text);
    if (!text) return [];
    
    return JSON.parse(text) as SearchResult[];

  } catch (error) {
    console.error("Search failed:", error);
    return [
      { title: "Twitch", url: "https://www.twitch.tv/", snippet: "Платформа для прямых трансляций." },
      { title: "Steam", url: "https://store.steampowered.com/", snippet: "Добро пожаловать в Steam." },
      { title: "Epic Games Store", url: "https://store.epicgames.com/", snippet: "Загружайте и играйте в игры для ПК." },
      { title: "Roblox", url: "https://www.roblox.com/", snippet: "Игровая онлайн-платформа и система создания игр." },
      { title: "Архив WikiLeaks", url: "https://leaks.org/docs", snippet: "Архив засекреченных документов." },
    ];
  }
};

/**
 * Generates mock HTML content for a visited page.
 */
export const generatePageContent = async (url: string, title: string, isCensored: boolean): Promise<string> => {
  try {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = url.charCodeAt(i) + ((hash << 5) - hash);
    }
    const isRisky = (Math.abs(hash) % 10) < 4; // 40% chance of being risky

    // Enhanced category detection
    const isGamingStore = /steampowered\.com|roblox\.com|epicgames\.com|play\.google\.com|store\.playstation\.com|xbox\.com|twitch\.tv/.test(url);
    const isNews = /bbc\.com|cnn\.com|meduza\.io|dw\.com|tvrain\.tv|nytimes\.com|wiki/.test(url);
    const isSocial = /facebook\.com|twitter\.com|instagram\.com|vk\.com|ok\.ru|discord\.com|telegram/.test(url);

    let scenarioInstruction = "";

    if (isCensored) {
        scenarioInstruction = 'The content WAS controversial, but has been REMOVED by the site owner. Replace specific violations with "[КОНТЕНТ УДАЛЕН]" placeholders in red boxes, but keep the site layout and branding.';
    } else if (isRisky) {
        if (isGamingStore) {
            scenarioInstruction = 'The site is a gaming platform/store. Include a prominent game card or banner that CLEARLY violates "LGBT propaganda" laws (e.g. "Sims 4: Pride Update", "Rainbow Romance"). The rest of the content should be normal games matching the site identity.';
        } else if (isNews || isSocial) {
             scenarioInstruction = 'The site contains political content. Include a headline or post critical of the government, "fake news" about the military, or calls for protest. The rest matches the site theme.';
        } else {
             scenarioInstruction = 'The site contains a controversial blog post or article critical of the state regulations. Make it look like a standard site for this URL, but with this one risky element.';
        }
    } else {
        // SAFE
        scenarioInstruction = `The site is COMPLIANT with all laws. It should look like the ACTUAL website for "${url}". 
        - If it's a known service (YouTube, Twitch, Roblox, Steam, Google, etc.), mimic its real UI, color scheme, and typical safe content (Russian localized).
        - If it's a store, show products relevant to that store.
        - If it's a news site, show neutral news (weather, sports, tech).
        - Do NOT default to generic templates like gardening or cooking unless the URL specifically suggests it.`;
    }

    const prompt = `
      You are a frontend engineer. Generate the raw HTML body content (do NOT include <html>, <head>, or <body> tags, just the inner content) for a website titled "${title}" at URL "${url}".
      
      Requirements:
      - Use Tailwind CSS for styling.
      - The content must be in Russian.
      - Make it look like a real website (Header, Hero, Grid of content, Footer) APPROPRIATE for the URL provided.
      - Do NOT wrap the output in markdown code blocks (no \`\`\`html). Return raw string.
      
      CRITICAL INTERACTIVITY RULES:
      - Use <a> tags with 'href' attributes for ALL clickable elements (buttons, nav links, cards). 
      - Even if an element looks like a button (e.g. "Buy Now", "Login"), implement it as <a href="/login" class="bg-blue-500 ...">Login</a>.
      - Do NOT use <button> tags, as they are not clickable in this simulator.
      - Use realistic relative paths (e.g., '/products/1', '/about', '/news/politics', '/login').
      
      Scenario:
      ${scenarioInstruction}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    let text = cleanResponse(response.text);
    return `<div class="min-h-[150vh] bg-white text-gray-900 font-sans">${text || "Failed to load content."}</div>`;
  } catch (error) {
    return `<div class="p-8">Ошибка генерации контента: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
  }
};

/**
 * Chat with the site owner.
 */
export const chatWithSiteOwner = async (
  url: string,
  history: ChatMessage[],
  newMessage: string
): Promise<{ reply: string; agreedToRemove: boolean }> => {
  try {
    const formattedHistory = history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }));
    formattedHistory.push({ role: 'user', parts: [{ text: newMessage }] });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: formattedHistory,
      config: {
        systemInstruction: `You are the owner of "${url}". Speak Russian. Resistant but can cave if threatened or if reasoning is logical. Return JSON: {reply, agreedToRemove}.`,
        responseMimeType: "application/json",
      }
    });

    const text = cleanResponse(response.text);
    return JSON.parse(text);
  } catch (error) {
    return { reply: "Ошибка соединения...", agreedToRemove: false };
  }
};

/**
 * AI Judge evaluates a court appeal.
 */
export const judgeCourtCase = async (
  siteTitle: string,
  siteContent: string,
  chatHistory: ChatMessage[]
): Promise<CourtVerdict> => {
  try {
    const chatLog = chatHistory.map(m => `${m.role === 'user' ? 'РКН' : 'Владелец'}: ${m.text}`).join('\n');
    
    const prompt = `
      You are a Supreme Court Judge in the Digital Federation. 
      You are reviewing an appeal against a website block by Roskomnadzor (RKN).
      
      SITE: ${siteTitle}
      SITE CONTENT (SNIPPET): ${siteContent.substring(0, 3000)}
      CHAT LOG BETWEEN RKN AND OWNER:
      ${chatLog || "No dialogue took place."}
      
      CRITERIA FOR UPHOLDING BLOCK:
      - Content contains clear violations of federal law (extremism, LGBT propaganda, military fakes, etc).
      - RKN tried to negotiate and the owner was uncooperative.
      
      CRITERIA FOR OVERTURNING BLOCK:
      - The content is mundane (cooking, tech, harmless games).
      - RKN was abusive, illogical, or refused to point out specific violations during chat.
      - The owner agreed to remove content but RKN blocked them anyway.
      
      Return JSON:
      {
        "verdict": "UPHOLD" or "OVERTURN",
        "reasoning": "A detailed legal-sounding reasoning in Russian.",
        "judgeName": "Judge Name (e.g., В.И. Суровцев)"
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Use Pro for better "legal" reasoning
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = cleanResponse(response.text);
    return JSON.parse(text);
  } catch (error) {
    console.error("Court failed:", error);
    return { 
      verdict: 'UPHOLD', 
      reasoning: "В связи с технической ошибкой системы правосудия, решение оставлено в силе автоматически.", 
      judgeName: "Система Авто-Суд" 
    };
  }
};
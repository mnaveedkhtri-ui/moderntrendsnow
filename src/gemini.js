const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

/**
 * Generate SEO-rich content using Google Gemini REST endpoint
 */
async function generateArticle({ category, topic, existingPosts = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  let internalLinkPrompt = '';
  if (existingPosts && existingPosts.length > 0) {
    const list = existingPosts.slice(0, 8).map(p => `- Title: "${p.title}" | URL: "${p.link}"`).join('\n');
    internalLinkPrompt = `\nINTERNAL LINKING REQUIREMENT:
Here are some existing published articles on our site:
${list}
You MUST naturally and seamlessly link to 2 or 3 of these articles within the body text using descriptive anchor text (e.g. <a href="URL">descriptive anchor text</a>).\n`;
  }

  const prompt = `You are a world-class SEO content strategist and authoritative copywriter.
Write an exceptionally comprehensive, 100% human-sounding, deep-dive article on the topic: "${topic}" in the category: "${category}".

Follow these critical requirements:
1. Tone & Quality (PASS AI DETECTORS):
   - Use a natural, conversational, highly expert human tone.
   - DO NOT use robotic AI transition words (e.g., "Moreover", "In conclusion", "Dive in", "Delve", "Tapestry", "Crucial", "Vital").
   - DO NOT use em-dashes (—). Use parentheses or standard commas instead.
   - Keep sentences punchy, engaging, and readable.
2. Search Intent & E-E-A-T:
   - Provide direct first-hand actionable insights.
   - Target Length: 1000 to 1500 words (Be concise but highly valuable).
   - Include 2-3 natural citations / external links to authoritative sources (e.g. Wikipedia, Statista, Harvard, NIH, Forbes) for Google trust signals.
${internalLinkPrompt}
3. Structure & Dark Mode Compatibility:
   - Compelling, high-CTR H1 Title (include numbers, actionable hook, or year).
   - Hook introduction: Explain the problem, why it matters today, and what the reader will gain.
   - Key Takeaways Box (HTML styled callout box).
   - 5 to 7 logical main sections with H2 tags. Bulleted lists and data breakdown tables.
   - DARK MODE: Do NOT use hardcoded inline colors (e.g., style="color: #000" or style="background: white") in tables, divs, or any HTML. Ensure all elements are transparent/inherit by default to support website dark mode.
   - 3 COMPLETELY DISTINCT In-Article Image Placeholders under different H2 headings, formatted exactly as:
     <!-- IN_ARTICLE_IMAGE: {"keyword": "Highly detailed midjourney style prompt for a beautiful, bright, well-lit, photorealistic 8k cinematic shot of...", "alt": "Descriptive keyword-rich alt text", "caption": "Engaging descriptive caption"} -->
     (CRITICAL: The 'keyword' must describe a visually stunning, bright, and professional scene. Do NOT generate dark or empty rooms).
   - FAQ Section: 4-5 high-intent questions answered concisely with FAQ Schema (JSON-LD).
4. Yoast SEO Metadata (STRICT LIMITS):
   - slug: The primary focus keyword formatted as a URL slug (e.g., "primary-keyword-here").
   - focus_keyword: 2-4 words high search volume target keyword.
   - meta_title: STRICTLY UNDER 60 CHARACTERS, click-worthy, includes focus keyword.
   - meta_description: STRICTLY UNDER 150 CHARACTERS, includes focus keyword and emotional hook.
   - tags: Array of 5-8 relevant tags.
   - featured_image_search: A detailed Midjourney-style prompt for a beautiful, bright, professional cover photo. Do NOT generate dark or empty rooms.
   - featured_image_alt: Keyword alt text for cover.

Respond ONLY with a valid, clean JSON object.
JSON format schema:
{
  "title": "Article Title",
  "slug": "focus-keyword-slug",
  "focus_keyword": "primary focus keyword",
  "meta_title": "SEO Meta Title (Under 60 chars)",
  "meta_description": "SEO Meta Description (Under 150 chars)",
  "tags": ["tag1", "tag2", "tag3"],
  "featured_image_search": "detailed midjourney prompt for cover",
  "featured_image_alt": "alt text for featured image",
  "content_html": "<p>Article HTML content including h2, h3, tables, key takeaways, in-article image markers, FAQs, and FAQ schema</p>"
}`;

  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest'];
  let response = null;
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      console.log(`[GEMINI] Attempting generation with ${modelName}...`);
      response = await axios.post(
        url,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 150000 }
      );
      if (response?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`[GEMINI] Successfully generated content using ${modelName}`);
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[GEMINI] Model ${modelName} failed, trying next...:`, err.response?.data?.error?.message || err.message);
    }
  }

  const rawText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error(`All Gemini models failed: ${lastError?.message}`);
  }

  // Robust JSON parsing: clean markdown and handle escaped quotes in HTML content
  let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[GEMINI] Direct JSON parse failed, attempting regex field extraction...');
    // Fallback regex extractor for structured fields
    const titleMatch = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
    const slugMatch = cleaned.match(/"slug"\s*:\s*"([^"]+)"/);
    const focusMatch = cleaned.match(/"focus_keyword"\s*:\s*"([^"]+)"/);
    const metaTitleMatch = cleaned.match(/"meta_title"\s*:\s*"([^"]+)"/);
    const metaDescMatch = cleaned.match(/"meta_description"\s*:\s*"([^"]+)"/);
    const featSearchMatch = cleaned.match(/"featured_image_search"\s*:\s*"([^"]+)"/);
    const featAltMatch = cleaned.match(/"featured_image_alt"\s*:\s*"([^"]+)"/);
    
    // Extract content_html
    let contentHtml = '';
    const contentStart = cleaned.indexOf('"content_html"');
    if (contentStart !== -1) {
      const colonIndex = cleaned.indexOf(':', contentStart);
      const firstQuote = cleaned.indexOf('"', colonIndex + 1);
      const lastQuote = cleaned.lastIndexOf('"');
      if (firstQuote !== -1 && lastQuote > firstQuote) {
        contentHtml = cleaned.substring(firstQuote + 1, lastQuote)
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, ' ');
      }
    }

    if (!titleMatch || !contentHtml) {
      throw new Error(`Failed to parse AI JSON response: ${err.message}`);
    }

    return {
      title: titleMatch[1],
      slug: slugMatch ? slugMatch[1] : topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      focus_keyword: focusMatch ? focusMatch[1] : topic,
      meta_title: metaTitleMatch ? metaTitleMatch[1] : titleMatch[1],
      meta_description: metaDescMatch ? metaDescMatch[1] : titleMatch[1],
      tags: [category, topic],
      featured_image_search: featSearchMatch ? featSearchMatch[1] : topic,
      featured_image_alt: featAltMatch ? featAltMatch[1] : topic,
      content_html: contentHtml
    };
  }
}

module.exports = { generateArticle };

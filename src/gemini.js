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
    const list = existingPosts.slice(0, 10).map(p => `- Title: "${p.title}" | URL: "${p.link}"`).join('\n   ');
    internalLinkPrompt = `
3. INTERNAL LINKING (STRICT):
   - You MUST naturally weave EXACTLY ${Math.min(4, existingPosts.length)} internal links into the content using exact URLs from this list:
   ${list}
   - Use descriptive anchor text (e.g. <a href="URL">descriptive anchor text</a>).`;
  } else {
    internalLinkPrompt = `\n3. INTERNAL LINKING (STRICT):\n   - No internal links available yet.`;
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
   - Target Length: Strictly 1000 to 1300 words. You MUST finish the article with a Conclusion and FAQs. Do NOT cut off early.
   - EXTERNAL LINKING: You MUST include EXACTLY 2 highly relevant external links to high-authority domains (e.g. Wikipedia, Statista, Harvard, Forbes, NIH) for SEO trust signals.
${internalLinkPrompt}

4. Structure & Dark Mode Compatibility:
   - Compelling, high-CTR H1 Title (include numbers, actionable hook, or year).
   - Hook introduction: Explain the problem, why it matters today, and what the reader will gain.
   - Key Takeaways Box (HTML styled callout box).
   - 5 to 7 logical main sections with H2 tags. Bulleted lists and data breakdown tables.
   - DARK MODE: Do NOT use hardcoded inline colors (e.g., style="color: #000" or style="background: white") in tables, divs, or any HTML. Ensure all elements are transparent/inherit by default to support website dark mode.
   - EXACTLY 2 COMPLETELY DISTINCT In-Article Image Placeholders under different H2 headings, formatted exactly as:
     <!-- IN_ARTICLE_IMAGE: {"keyword": "keyword1,keyword2", "alt": "Descriptive keyword-rich alt text", "caption": "Engaging descriptive caption"} -->
     (CRITICAL: The 'keyword' MUST BE 1 to 3 simple comma-separated words for a stock photo search, e.g. "beach,florida" or "office,laptop" or "students,class". Do NOT write a long prompt).
   - FAQ Section: 4-5 high-intent questions answered concisely. (Do NOT generate JSON-LD schema, it consumes too many tokens).
4. Yoast SEO Metadata (STRICT LIMITS):
   - slug: The primary focus keyword formatted as a URL slug (e.g., "primary-keyword-here").
   - focus_keyword: 2-4 words high search volume target keyword.
   - meta_title: STRICTLY UNDER 60 CHARACTERS.
   - meta_description: STRICTLY UNDER 150 CHARACTERS.
   - tags: Array of 5-8 relevant tags (comma separated).
   - featured_image_prompt: A detailed Midjourney-style prompt for a beautiful, bright, professional cover photo. Do NOT generate dark rooms, boardrooms, or empty meeting tables. Focus on action, technology, people, or modern abstract representations.
   - featured_image_alt: Keyword alt text for cover.

Respond ONLY with the following XML structure. Do NOT output markdown formatting like \`\`\`xml.
<article>
  <title>Article Title</title>
  <slug>focus-keyword-slug</slug>
  <focus_keyword>primary focus keyword</focus_keyword>
  <meta_title>SEO Meta Title (Under 60 chars)</meta_title>
  <meta_description>SEO Meta Description (Under 150 chars)</meta_description>
  <tags>tag1, tag2, tag3</tags>
  <featured_image_prompt>2 or 3 comma-separated keywords for stock photo</featured_image_prompt>
  <featured_image_alt>alt text for featured image</featured_image_alt>
  <content>
    [Insert full HTML content here, including h2, h3, tables, key takeaways, in-article image markers, and FAQs]
  </content>
</article>`;

  const modelsToTry = ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-pro-latest', 'gemini-3.5-flash'];
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
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 300000 }
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

  // XML Parser
  const extractTag = (xml, tag) => {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  };

  const title = extractTag(rawText, 'title');
  const slug = extractTag(rawText, 'slug');
  const focus_keyword = extractTag(rawText, 'focus_keyword');
  const meta_title = extractTag(rawText, 'meta_title');
  const meta_description = extractTag(rawText, 'meta_description');
  const tagsStr = extractTag(rawText, 'tags');
  const featured_image_prompt = extractTag(rawText, 'featured_image_prompt');
  const featured_image_alt = extractTag(rawText, 'featured_image_alt');
  let contentHtml = extractTag(rawText, 'content');

  // Fallback if truncation happens inside <content>
  if (!contentHtml) {
    const contentStart = rawText.indexOf('<content>');
    if (contentStart !== -1) {
      contentHtml = rawText.substring(contentStart + 9).replace(/<\/article>$/, '').trim();
    }
  }

  if (!title || !contentHtml) {
    throw new Error(`Failed to parse AI XML response.`);
  }

  return {
    title,
    slug: slug || topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    focus_keyword: focus_keyword || topic,
    meta_title: meta_title || title,
    meta_description: meta_description || title,
    tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
    featured_image_search: featured_image_prompt || `Cinematic bright photo of professionals working on ${topic}`,
    featured_image_alt: featured_image_alt || topic,
    content_html: contentHtml
  };
}

module.exports = { generateArticle };

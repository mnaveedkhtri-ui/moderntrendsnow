const axios = require('axios');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const STATE_FILE = path.join(__dirname, '..', 'config', 'state.json');

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {}
  }
  return { lastCategoryIndex: -1, postedTopics: [] };
}

/**
 * Fetch keyword queue from published Google Sheet CSV
 */
async function getNextTopicFromSheet() {
  const sheetCsvUrl = process.env.GOOGLE_SHEET_CSV_URL;
  if (!sheetCsvUrl) {
    console.log('[SHEETS] No GOOGLE_SHEET_CSV_URL provided. Falling back to local topics.json');
    return null;
  }

  try {
    console.log('[SHEETS] Fetching keywords from Google Sheet CSV...');
    const response = await axios.get(sheetCsvUrl, { timeout: 15000 });
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const state = loadState();
    const posted = state.postedTopics || [];

    // Look for pending rows or keywords that have not been posted
    for (const row of records) {
      const keyword = (row.Keyword || row.keyword || row.Keywords || row.keywords || row.Topic || row.topic || '').trim();
      const category = (row.Category || row.category || 'General').trim();
      const status = (row.Status || row.status || '').toLowerCase().trim();

      if (keyword && status !== 'published' && status !== 'done') {
        const isPosted = posted.some(p => p.toLowerCase().trim() === keyword.toLowerCase());
        if (!isPosted) {
          console.log(`[SHEETS] Selected target keyword from Google Sheet: "${keyword}" (Category: ${category})`);
        return {
          keyword,
          category,
          fromSheet: true
        };
        }
      }
    }

    console.log('[SHEETS] All keywords in Google Sheet are already published or marked done.');
    return null;
  } catch (err) {
    console.warn('[SHEETS] Failed to fetch from Google Sheet CSV:', err.message);
    return null;
  }
}

module.exports = { getNextTopicFromSheet };
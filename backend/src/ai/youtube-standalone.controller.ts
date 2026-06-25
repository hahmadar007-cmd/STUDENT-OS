import { Controller, Get, Query, Headers, UnauthorizedException } from '@nestjs/common';
import * as https from 'https';

/**
 * Lightweight HTTPS GET helper that returns a parsed JSON body.
 * Follows up to 5 redirects and validates HTTP status codes.
 */
function fetchJson(url: string, maxRedirects = 5): Promise<any> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects'));
    }

    const req = https.get(
      url,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StudentOS/1.0)',
          Accept: 'application/json',
        },
      },
      (res) => {
        // Follow redirects (3xx)
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchJson(res.headers.location, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            return reject(
              new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`),
            );
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`JSON parse error: ${data.slice(0, 200)}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

/**
 * Fetch raw HTML from a URL (for YouTube page scraping fallback).
 */
function fetchHtml(url: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    const req = https.get(
      url,
      {
        timeout: 12000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          Accept: 'text/html,application/xhtml+xml',
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          fetchHtml(res.headers.location, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          resolve(data);
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

/**
 * Convert ISO 8601 duration (PT1H2M30S) to a human-readable string (1:02:30).
 */
function isoDurationToHuman(iso: string): string {
  if (!iso) return '--:--';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '--:--';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

@Controller('youtube')
export class YoutubeStandaloneController {
  /**
   * GET /videos/standalone-search?q=<query>
   *
   * Strategy:
   *   1. If YOUTUBE_API_KEY is set → use official YouTube Data API v3
   *   2. Fallback → scrape YouTube search page with multiple regex patterns
   */
  @Get('standalone-search')
  async searchVideos(
    @Query('q') q: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) throw new UnauthorizedException('Missing token');
    if (!q || !q.trim()) return [];

    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    // ── Strategy 1: Official YouTube Data API v3 ──────────────────────────
    if (youtubeApiKey) {
      try {
        const results = await this.searchWithYouTubeApi(q.trim(), youtubeApiKey);
        if (results.length > 0) return results;
      } catch (err: any) {
        console.error('YouTube Data API error:', err.message);
      }
    }

    // ── Strategy 2: Scrape YouTube search page directly ───────────────────
    try {
      const results = await this.searchByScraping(q.trim());
      if (results.length > 0) return results;
    } catch (err: any) {
      console.error('YouTube scraping error:', err.message);
    }

    console.error('All YouTube search strategies failed for query:', q);
    return [];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Strategy 1 – YouTube Data API v3
  // ─────────────────────────────────────────────────────────────────────────
  private async searchWithYouTubeApi(
    query: string,
    apiKey: string,
  ): Promise<any[]> {
    const encoded = encodeURIComponent(query);
    const searchUrl =
      `https://www.googleapis.com/youtube/v3/search` +
      `?part=snippet&type=video&maxResults=6&q=${encoded}&key=${apiKey}`;
    const searchData = await fetchJson(searchUrl);

    if (searchData.error) {
      throw new Error(searchData.error.message || 'YouTube API error');
    }

    const items: any[] = searchData.items || [];
    if (items.length === 0) return [];

    // Batch-fetch durations via videos endpoint
    const videoIds = items.map((i: any) => i.id?.videoId).filter(Boolean);
    let durationsMap: Record<string, string> = {};
    if (videoIds.length > 0) {
      try {
        const detailsUrl =
          `https://www.googleapis.com/youtube/v3/videos` +
          `?part=contentDetails&id=${videoIds.join(',')}&key=${apiKey}`;
        const detailsData = await fetchJson(detailsUrl);
        for (const v of detailsData.items || []) {
          durationsMap[v.id] = isoDurationToHuman(
            v.contentDetails?.duration || '',
          );
        }
      } catch {
        // Duration fetch failed – not critical
      }
    }

    return items.map((item: any) => {
      const videoId = item.id?.videoId || '';
      return {
        videoId,
        title: item.snippet?.title || 'Untitled',
        author: item.snippet?.channelTitle || 'Unknown',
        duration: durationsMap[videoId] || '--:--',
        thumbnail:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Strategy 2 – Scrape YouTube search page (no API key needed)
  // Uses multiple regex patterns to handle YouTube's evolving HTML structure
  // ─────────────────────────────────────────────────────────────────────────
  private async searchByScraping(query: string): Promise<any[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${encoded}&sp=EgIQAQ%3D%3D`;
    const html = await fetchHtml(url);

    // Try multiple patterns to find ytInitialData — YouTube changes these
    const patterns = [
      /var\s+ytInitialData\s*=\s*({.+?});\s*<\/script>/s,
      /ytInitialData\s*=\s*({.+?});\s*<\/script>/s,
      /window\["ytInitialData"\]\s*=\s*({.+?});\s*<\/script>/s,
      /ytInitialData\s*=\s*'({.+?})';\s*<\/script>/s,
    ];

    let data: any = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          data = JSON.parse(match[1]);
          break;
        } catch {
          continue;
        }
      }
    }

    if (!data) {
      throw new Error('Could not extract ytInitialData from YouTube page');
    }

    // Navigate the nested JSON structure to find video results
    const contents = this.extractVideoContents(data);
    if (!contents || contents.length === 0) {
      throw new Error('No video contents found in ytInitialData');
    }

    const results: any[] = [];
    for (const item of contents) {
      const vr = item?.videoRenderer;
      if (!vr || !vr.videoId) continue;

      const videoId: string = vr.videoId;
      const title: string =
        vr.title?.runs?.[0]?.text ||
        vr.title?.simpleText ||
        'Untitled';
      const author: string =
        vr.ownerText?.runs?.[0]?.text ||
        vr.shortBylineText?.runs?.[0]?.text ||
        'Unknown';
      const duration: string =
        vr.lengthText?.simpleText ||
        vr.lengthText?.accessibility?.accessibilityData?.label ||
        '--:--';
      const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      results.push({ videoId, title, author, duration, thumbnail });
      if (results.length >= 6) break;
    }

    return results;
  }

  /**
   * Recursively search through ytInitialData JSON to find the video list.
   * YouTube nests this differently depending on the page version.
   */
  private extractVideoContents(data: any): any[] | null {
    // Standard path
    const standard =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents;

    if (standard) {
      for (const section of standard) {
        const items =
          section?.itemSectionRenderer?.contents;
        if (items && Array.isArray(items)) return items;
      }
    }

    // Alternative path (some YouTube versions)
    const alt =
      data?.contents?.sectionListRenderer?.contents;
    if (alt) {
      for (const section of alt) {
        const items = section?.itemSectionRenderer?.contents;
        if (items && Array.isArray(items)) return items;
      }
    }

    // Deep search fallback — find any array containing videoRenderer objects
    return this.deepFindVideoRenderers(data);
  }

  /**
   * Deep recursive search for arrays containing videoRenderer objects.
   */
  private deepFindVideoRenderers(obj: any, depth = 0): any[] | null {
    if (depth > 8 || !obj) return null;

    if (Array.isArray(obj)) {
      const hasVideos = obj.some((item) => item?.videoRenderer?.videoId);
      if (hasVideos) return obj;
      for (const item of obj) {
        const found = this.deepFindVideoRenderers(item, depth + 1);
        if (found) return found;
      }
    } else if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        const found = this.deepFindVideoRenderers(obj[key], depth + 1);
        if (found) return found;
      }
    }

    return null;
  }
}

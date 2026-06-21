import { Controller, Get, Query, Headers, UnauthorizedException } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';

function fetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudentOS/1.0)' } }, (res) => {
      // Follow redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetch(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

@Controller('videos')
export class YoutubeStandaloneController {
  @Get('standalone-search')
  async searchVideos(@Query('q') q: string, @Headers('authorization') authHeader: string) {
    if (!authHeader) throw new UnauthorizedException('Missing token');
    if (!q) return [];

    try {
      // Use YouTube's internal search suggestions API (no key needed, never blocked)
      const encoded = encodeURIComponent(q);
      
      // Scrape YouTube search page for video IDs
      const html = await fetch(`https://www.youtube.com/results?search_query=${encoded}&sp=EgIQAQ%253D%253D`);
      
      // Extract video data from YouTube's initial data JSON embedded in the page
      const match = html.match(/var ytInitialData = ({.+?});<\/script>/s) ||
                    html.match(/ytInitialData\s*=\s*({.+?});\s*<\/script>/s);

      if (!match) throw new Error('Could not parse YouTube page');

      const data = JSON.parse(match[1]);
      const contents =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

      const results: any[] = [];
      for (const item of contents) {
        const vr = item?.videoRenderer;
        if (!vr || !vr.videoId) continue;

        const videoId: string = vr.videoId;
        const title: string = vr.title?.runs?.[0]?.text || 'Untitled';
        const author: string = vr.ownerText?.runs?.[0]?.text || 'Unknown';
        const duration: string = vr.lengthText?.simpleText || '--:--';
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        results.push({ videoId, title, author, duration, thumbnail });
        if (results.length >= 6) break;
      }

      if (results.length > 0) return results;
      throw new Error('No results found in page');
    } catch (err: any) {
      console.error('YouTube search error:', err.message);
      return [];
    }
  }
}


import { Injectable } from '@nestjs/common';
import { YoutubeTranscript, TranscriptResponse } from 'youtube-transcript';

@Injectable()
export class YoutubeService {
  private cache = new Map<string, TranscriptResponse[]>();

  private extractVideoId(urlOrId: string): string {
    if (!urlOrId) return '';
    // If it's a 11-char ID already
    if (urlOrId.length === 11 && !urlOrId.includes('/') && !urlOrId.includes('?')) {
      return urlOrId;
    }
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.match(regExp);
    return match && match[2].length === 11 ? match[2] : urlOrId;
  }

  async getTranscript(videoUrl: string): Promise<TranscriptResponse[]> {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) return [];

    if (this.cache.has(videoId)) {
      return this.cache.get(videoId)!;
    }

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      this.cache.set(videoId, transcript);
      return transcript;
    } catch (err) {
      console.error(`Failed to fetch YouTube transcript for video ${videoId}:`, err);
      return [];
    }
  }

  async getTranscriptSnippet(videoUrl: string, timestampSeconds: number): Promise<string> {
    const transcript = await this.getTranscript(videoUrl);
    if (!transcript || transcript.length === 0) {
      return '';
    }

    // Determine if offsets in transcript are in milliseconds or seconds.
    // Standard youtube-transcript usually returns milliseconds (e.g. 1000 for 1s).
    // Let's check if there are offsets greater than 1000.
    const hasLargeOffset = transcript.some(item => item.offset > 1000);
    const multiplier = hasLargeOffset ? 1000 : 1;

    const currentOffsetMs = timestampSeconds * multiplier;
    // Window: 30 seconds before to 30 seconds after
    const startWindow = currentOffsetMs - (30 * multiplier);
    const endWindow = currentOffsetMs + (30 * multiplier);

    const relevant = transcript.filter(item => {
      return item.offset >= startWindow && item.offset <= endWindow;
    });

    if (relevant.length === 0) {
      // Fallback: find the closest one
      const closest = transcript.reduce((prev, curr) => {
        return Math.abs(curr.offset - currentOffsetMs) < Math.abs(prev.offset - currentOffsetMs) ? curr : prev;
      });
      return closest ? `[Around ${Math.round(closest.offset / multiplier)}s]: ${closest.text}` : '';
    }

    return relevant
      .map(item => `[${Math.round(item.offset / multiplier)}s]: ${item.text}`)
      .join(' ');
  }
}

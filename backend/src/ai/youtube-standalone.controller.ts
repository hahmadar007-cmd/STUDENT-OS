import { Controller, Get, Query, Headers, UnauthorizedException, HttpException } from '@nestjs/common';
const ytSearch = require('yt-search');

@Controller('videos')
export class YoutubeStandaloneController {
  @Get('standalone-search')
  async searchVideos(@Query('q') q: string, @Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('Missing token');
    }

    if (!q) {
      return [];
    }

    try {
      const r = await ytSearch(q);
      const videos = r.videos.slice(0, 6);
      
      return videos.map((v: any) => ({
        videoId: v.videoId,
        title: v.title,
        thumbnail: v.thumbnail,
        author: v.author.name,
        duration: v.timestamp
      }));
    } catch (e: any) {
      console.error('ytSearch error:', e.message);
      // Return a 503 instead of 500 so frontend knows it's an upstream issue
      throw new HttpException({ message: 'YouTube blocked the request', error: e.message }, 503);
    }
  }
}


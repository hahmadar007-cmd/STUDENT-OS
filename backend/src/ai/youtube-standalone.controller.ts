import { Controller, Get, Query, Headers, UnauthorizedException } from '@nestjs/common';
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
    const r = await ytSearch(q);
    const videos = r.videos.slice(0, 6);
    
    return videos.map((v: any) => ({
      videoId: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail,
      author: v.author.name,
      duration: v.timestamp
    }));
  }
}


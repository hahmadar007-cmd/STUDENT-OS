import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  
  // Track active bypass expiration times (userId -> expiration timestamp)
  private bypassUsers = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Student OS API is running!';
  }

  onModuleInit() {
    this.startProcessMonitoring();
  }

  onModuleDestroy() {
    this.stopProcessMonitoring();
  }

  // Set emergency bypass for a user
  setBypass(userId: string, isBypassed: boolean, durationMinutes: number = 5) {
    if (isBypassed) {
      const expiration = Date.now() + durationMinutes * 60 * 1000;
      this.bypassUsers.set(userId, expiration);
      console.log(`Bypass enabled for user ${userId} until ${new Date(expiration).toLocaleTimeString()}`);
    } else {
      this.bypassUsers.delete(userId);
      console.log(`Bypass disabled for user ${userId}`);
    }
  }

  isUserBypassed(userId: string): boolean {
    const expiration = this.bypassUsers.get(userId);
    if (!expiration) return false;
    
    if (Date.now() > expiration) {
      this.bypassUsers.delete(userId); // expired
      return false;
    }
    return true;
  }

  startProcessMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.monitorInterval = setInterval(async () => {
      try {
        // Find users who are focusing
        const focusingUsers = await this.prisma.user.findMany({
          where: { isFocusing: true },
        });

        // Filter users who are NOT currently bypassed
        const activeBlockUsers = focusingUsers.filter(user => !this.isUserBypassed(user.id));

        if (activeBlockUsers.length > 0) {
          await this.enforceProcessBlocking();
        }
      } catch (err) {
        console.error('Process blocker monitor error:', err);
      }
    }, 4000); // Check every 4 seconds
  }

  stopProcessMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }

  async enforceProcessBlocking() {
    // List of common distracting apps (executables)
    const appsToBlock = [
      'Discord.exe',
      'Steam.exe',
      'Spotify.exe',
      'League of Legends.exe',
      'EpicGamesLauncher.exe',
      'Battle.net.exe',
      'RiotClientServices.exe',
      'LeagueClient.exe'
    ];

    for (const app of appsToBlock) {
      try {
        // On Windows, taskkill kills the process. It will error out if not running, which is caught in catch
        await execAsync(`taskkill /F /IM "${app}"`);
        console.log(`[OS App Locker] Blocked running distraction app: ${app}`);
      } catch (e) {
        // Suppress errors for processes that are not currently running
      }
    }
  }
}
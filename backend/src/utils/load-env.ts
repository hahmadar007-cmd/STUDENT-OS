import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

const envCandidates = [
  join(process.cwd(), '.env'),
  join(process.cwd(), 'backend', '.env'),
  join(__dirname, '..', '.env'),
  join(__dirname, '..', '..', '.env'),
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    break;
  }
}

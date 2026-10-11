import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

const healthData = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: packageJson.version,
  environment: process.env.NODE_ENV || 'development',
  services: {
    firebase: 'configured',
    supabase: 'configured'
  }
};

const outputPath = path.resolve(__dirname, '../public/health.json');
fs.writeFileSync(outputPath, JSON.stringify(healthData, null, 2));

console.log('Generated health.json at', outputPath);
console.log('Version:', packageJson.version);
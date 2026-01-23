
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Helper to parse .env.local manually
function getEnvVars() {
  try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const vars = {};
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        vars[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1');
      }
    });
    return vars;
  } catch (e) {
    console.error("Could not read .env.local", e);
    return {};
  }
}

const env = getEnvVars();
const SUPABASE_URL = env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = env['VITE_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AUDIO_DIR = path.resolve(__dirname, '../public/audio');
const BUCKET_NAME = 'word-audios';

async function uploadFiles() {
  if (!fs.existsSync(AUDIO_DIR)) {
    console.error(`Audio directory not found at ${AUDIO_DIR}`);
    return;
  }

  const files = fs.readdirSync(AUDIO_DIR).filter(file => /\.(mp3|wav|ogg)$/i.test(file));
  console.log(`Found ${files.length} audio files. Starting upload...`);

  let successCount = 0;
  let errorCount = 0;

  // Process in chunks to avoid overwhelming partial connections if any
  // But purely sequential is safest for this script
  for (const [index, file] of files.entries()) {
    const filePath = path.join(AUDIO_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);

    // Check if file exists? Nah, just upsert.
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(file, fileBuffer, {
        contentType: 'audio/mpeg', // Assuming mostly mp3, change if needed or detect
        upsert: true
      });

    if (error) {
      console.error(`[${index + 1}/${files.length}] Failed to upload ${file}:`, error.message);
      errorCount++;
    } else {
      console.log(`[${index + 1}/${files.length}] Uploaded ${file}`);
      successCount++;
    }
  }

  console.log(`\nUpload complete! Success: ${successCount}, Failed: ${errorCount}`);
}

uploadFiles();

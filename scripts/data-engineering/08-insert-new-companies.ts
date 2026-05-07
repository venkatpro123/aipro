import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);;
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

const dataDir = path.resolve(process.cwd(), 'scripts', 'data-engineering', 'data');
const CONCURRENCY = 10;

async function insertBatch(batchFile: string): Promise<{ inserted: number; skipped: number; failed: number }> {
  const batchPath = path.join(dataDir, batchFile);
  const records = JSON.parse(fs.readFileSync(batchPath, 'utf8'));

  let inserted = 0, skipped = 0, failed = 0;

  for (const record of records) {
    // Deduplicate: check if company already exists
    const { data: existing, error: fetchErr } = await supabase
      .from('company_intelligence')
      .select('id')
      .eq('company_name', record.company_name)
      .maybeSingle();

    if (fetchErr) {
      console.error(`  ❌ Fetch error for ${record.company_name}:`, fetchErr.message);
      failed++;
      continue;
    }

    if (existing) {
      console.log(`  ⏭  Skipped (exists): ${record.company_name}`);
      skipped++;
      continue;
    }

    const { error: insertErr } = await supabase
      .from('company_intelligence')
      .insert([{ ...record, updated_at: new Date().toISOString() }]);

    if (insertErr) {
      console.error(`  ❌ Insert failed for ${record.company_name}:`, insertErr.message);
      failed++;
    } else {
      console.log(`  ✅ Inserted: ${record.company_name}`);
      inserted++;
    }
  }

  return { inserted, skipped, failed };
}

async function runAll() {
  console.log('🚀 Starting 3,000 Net-New Company Insert Pipeline...\n');

  if (!fs.existsSync(dataDir)) {
    console.error('Data directory not found:', dataDir);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('new_companies_batch_') && f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error('No new_companies_batch_*.json files found. Run 07-generate-new-companies.ts first.');
    process.exit(1);
  }

  console.log(`Found ${files.length} batch files → processing ${CONCURRENCY} at a time.\n`);

  let totalInserted = 0, totalSkipped = 0, totalFailed = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const chunk = files.slice(i, i + CONCURRENCY);
    const chunkNum = Math.floor(i / CONCURRENCY) + 1;
    const totalChunks = Math.ceil(files.length / CONCURRENCY);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`⏳ Chunk ${chunkNum}/${totalChunks}: ${chunk.join(', ')}`);
    console.log('='.repeat(60));

    const results = await Promise.all(chunk.map(f => insertBatch(f)));

    for (const r of results) {
      totalInserted += r.inserted;
      totalSkipped  += r.skipped;
      totalFailed   += r.failed;
    }

    console.log(`\n  Chunk ${chunkNum} done → +${results.reduce((s,r)=>s+r.inserted,0)} inserted`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎉 Pipeline Complete!`);
  console.log(`  ✅ Inserted : ${totalInserted}`);
  console.log(`  ⏭  Skipped  : ${totalSkipped}`);
  console.log(`  ❌ Failed   : ${totalFailed}`);
  console.log('='.repeat(60));
}

runAll().catch(console.error);

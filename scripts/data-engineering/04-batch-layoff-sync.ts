import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
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

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchFileName = args.find(a => !a.startsWith('--')) || 'layoffs_batch_1.json';

async function runBatchSync() {
  console.log(`🚀 Starting Incremental Layoff Batch Sync (${batchFileName}) ${isDryRun ? '[DRY RUN MODE]' : ''}`);

  const batchPath = path.resolve(process.cwd(), 'scripts', 'data-engineering', 'data', batchFileName);
  if (!fs.existsSync(batchPath)) {
    console.error('Batch dataset not found at:', batchPath);
    process.exit(1);
  }

  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  console.log(`Found ${batch.length} company records for validation and sync...`);

  let successCount = 0;
  let failCount = 0;

  for (const record of batch) {
    console.log(`\nEvaluating: ${record.company_name}...`);

    // 1. Validation Phase
    if (!record.layoff_history || typeof record.layoff_history.total_layoffs !== 'number') {
       console.error(`❌ Validation Failed: Missing or invalid total_layoffs for ${record.company_name}`);
       failCount++;
       continue;
    }

    if (record.layoff_history.total_layoffs <= 0) {
       console.error(`❌ Validation Failed: Layoffs cannot be 0 in a targeted sync batch for ${record.company_name}`);
       failCount++;
       continue;
    }

    // 2. Fetch Existing DB Record
    const { data: existing, error: fetchError } = await supabase
      .from('company_intelligence')
      .select('id, layoff_history')
      .eq('company_name', record.company_name)
      .maybeSingle();

    if (fetchError) {
      console.error(`❌ DB Fetch Error for ${record.company_name}:`, fetchError);
      failCount++;
      continue;
    }

    if (!existing) {
       console.warn(`⚠️ Warning: ${record.company_name} not found in database. Skipping update.`);
       failCount++;
       continue;
    }

    // Merge existing JSONB with new accurate data to ensure we don't drop keys accidentally
    const newLayoffHistory = {
        ...(existing.layoff_history || {}),
        ...record.layoff_history
    };

    if (isDryRun) {
       console.log(`🔍 [DRY RUN] Would update ${record.company_name} with:`, newLayoffHistory);
       successCount++;
       continue;
    }

    // 3. Execution Phase
    const updatePayload: any = {
         layoff_history: newLayoffHistory,
         updated_at: new Date().toISOString()
    };
    if (record.workforce_count !== undefined) updatePayload.workforce_count = record.workforce_count;
    if (record.open_jobs_count !== undefined) updatePayload.open_jobs_count = record.open_jobs_count;

    const { error: updateError } = await supabase
      .from('company_intelligence')
      .update(updatePayload)
      .eq('id', existing.id);
    
    if (updateError) {
      console.error(`❌ Failed to update ${record.company_name}:`, updateError);
      failCount++;
    } else {
      console.log(`✅ Successfully updated ${record.company_name}.`);
      successCount++;
    }
  }

  console.log(`\n================================`);
  console.log(`✅ Batch Sync Complete!`);
  console.log(`- Mode: ${isDryRun ? 'DRY RUN' : 'LIVE COMMIT'}`);
  console.log(`- Successfully Processed: ${successCount}`);
  console.log(`- Failed / Skipped: ${failCount}`);
}

runBatchSync().catch(console.error);

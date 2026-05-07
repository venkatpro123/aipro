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

async function bulkExpand() {
  console.log('🚀 Starting Bulk Expansion Process...');

  const dataPath = path.resolve(process.cwd(), 'scripts', 'data-engineering', 'data', 'expansion_dataset.json');
  if (!fs.existsSync(dataPath)) {
    console.error('Expansion dataset not found at:', dataPath);
    process.exit(1);
  }

  const dataset = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`Found ${dataset.length} companies to evaluate for expansion...`);

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const company of dataset) {
    console.log(`Processing: ${company.company_name}...`);

    // Check if company already exists to avoid blind upserts triggering unwanted diffs
    const { data: existing, error: fetchError } = await supabase
      .from('company_intelligence')
      .select('id, company_name')
      .eq('company_name', company.company_name)
      .maybeSingle();

    if (fetchError) {
      console.error(`Error checking ${company.company_name}:`, fetchError);
      continue;
    }

    if (existing) {
       // Perform an update
       const { error: updateError } = await supabase
         .from('company_intelligence')
         .update(company)
         .eq('id', existing.id);
       
       if (updateError) {
         console.error(`Failed to update ${company.company_name}:`, updateError);
       } else {
         updatedCount++;
       }
    } else {
       // Perform an insert
       const { error: insertError } = await supabase
         .from('company_intelligence')
         .insert([company]);
       
       if (insertError) {
         console.error(`Failed to insert ${company.company_name}:`, insertError);
       } else {
         insertedCount++;
       }
    }
  }

  console.log(`✅ Bulk Expansion Complete!`);
  console.log(`- New Records Inserted: ${insertedCount}`);
  console.log(`- Existing Records Updated: ${updatedCount}`);
  console.log(`- Skipped/Failed: ${dataset.length - insertedCount - updatedCount}`);
}

bulkExpand().catch(console.error);

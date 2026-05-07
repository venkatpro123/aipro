import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// 1. Setup Supabase
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  });
}
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const dataDir = path.resolve(process.cwd(), 'scripts', 'data-engineering', 'data');

async function run() {
  console.log('🔍 Scanning local JSON files for known layoff data...');
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('layoffs_'));
  
  const layoffMap = new Map<string, any>();
  let totalFoundInFiles = 0;

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.company_name && item.layoff_history && item.layoff_history.total_layoffs > 0) {
            layoffMap.set(item.company_name.toLowerCase(), item.layoff_history);
            totalFoundInFiles++;
          }
        }
      }
    } catch (e) {}
  }

  console.log(`Found ${totalFoundInFiles} valid layoff events across local files.`);
  console.log(`Checking Supabase to update records that currently have 0...`);

  // We will pull the recent 3000 companies and do a fuzzy update
  const { data: dbCompanies, error } = await supabase
    .from('company_intelligence')
    .select('id, company_name, layoff_history')
    .eq('data_source', 'expansion_batch_2026_real');
    
  if (error || !dbCompanies) {
    console.error('Error fetching from DB:', error);
    return;
  }

  let updatedCount = 0;

  for (const dbComp of dbCompanies) {
    // Check if dbComp has 0 layoffs
    const currentLayoffs = dbComp.layoff_history?.total_layoffs || 0;
    if (currentLayoffs > 0) continue; // Already has data

    const dbName = dbComp.company_name.toLowerCase();
    
    // Find best match in layoffMap
    let matchedData = null;
    for (const [key, value] of layoffMap.entries()) {
      // Fuzzy matching: e.g. "Expedia" matches "Expedia Group, Inc."
      if (dbName.includes(key) || key.includes(dbName) || dbName.startsWith(key)) {
        matchedData = value;
        break;
      }
    }

    if (matchedData) {
      console.log(`✅ Updating ${dbComp.company_name} with real layoffs: ${matchedData.total_layoffs}`);
      const { error: updateError } = await supabase
        .from('company_intelligence')
        .update({
          layoff_history: matchedData,
          hiring_signals: {
            hiring_velocity: "low",
            hiring_freeze_score: 0.8
          },
          role_risk_map: {
            sales: 0.3,
            designer: 0.1,
            hr_recruiter: 0.4,
            data_scientist: 0.1,
            product_manager: 0.1,
            software_engineer: 0.1
          },
          market_risk_score: 0.4,
          company_risk_score: 0.5,
          archetype: "restructuring"
        })
        .eq('id', dbComp.id);

      if (!updateError) {
        updatedCount++;
      } else {
        console.error(`Failed to update ${dbComp.company_name}:`, updateError);
      }
    }
  }

  console.log(`\n🎉 Successfully enriched ${updatedCount} companies in Supabase using local files!`);
}

run().catch(console.error);

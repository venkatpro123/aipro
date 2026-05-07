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

async function cleanseRecords() {
  console.log('🚀 Starting Data Cleansing Process...');

  let hasMore = true;
  let offset = 0;
  const limit = 500;
  let processedCount = 0;
  let updatedCount = 0;

  while (hasMore) {
    console.log(`Fetching records ${offset} to ${offset + limit}...`);
    const { data: companies, error } = await supabase
      .from('company_intelligence')
      .select('*')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching records:', error);
      break;
    }

    if (!companies || companies.length === 0) {
      hasMore = false;
      break;
    }

    processedCount += companies.length;

    // Process batch
    const updates = [];

    for (const company of companies) {
      let needsUpdate = false;
      const updatePayload: any = { id: company.id };

      // 1. Clean up Industry string
      if (company.industry && company.industry !== company.industry.trim()) {
        updatePayload.industry = company.industry.trim();
        needsUpdate = true;
      }

      // 2. Normalize Risk Scores if they are 0.0 but have a confidence score > 0.5 (indicating real data)
      if (company.company_risk_score === 0.0 && company.confidence_score > 0.5) {
        updatePayload.company_risk_score = 0.15; // Baseline default
        needsUpdate = true;
      }

      if (company.ai_exposure_index === 0.0 && company.confidence_score > 0.5) {
        updatePayload.ai_exposure_index = 0.40; // Baseline default
        needsUpdate = true;
      }

      if (company.market_risk_score === 0.0 && company.company_risk_score > 0) {
        updatePayload.market_risk_score = Math.min(company.company_risk_score * 0.75, 0.9).toFixed(3);
        needsUpdate = true;
      }

      if (company.confidence_score === 0.0) {
        updatePayload.confidence_score = 0.70;
        needsUpdate = true;
      }

      // 3. Fix JSONB arrays/objects (Layoff History)
      if (!company.layoff_history || Object.keys(company.layoff_history).length === 0) {
        updatePayload.layoff_history = {
          total_layoffs: 0,
          last_layoff_date: "No History",
          layoff_frequency: "none",
          affected_departments: []
        };
        needsUpdate = true;
      } else {
        const lh = { ...company.layoff_history };
        let lhModified = false;

        if (lh.total_layoffs === 0 && !lh.last_layoff_date) {
          lh.last_layoff_date = "No History";
          lhModified = true;
        }
        if (!lh.affected_departments) {
          lh.affected_departments = [];
          lhModified = true;
        }
        
        if (lhModified) {
          updatePayload.layoff_history = lh;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        updates.push(updatePayload);
      }
    }

    // Apply bulk updates
    if (updates.length > 0) {
      console.log(`Pushing updates for ${updates.length} records in this batch...`);
      for (const update of updates) {
        const { id, ...rest } = update;
        const { error: updateError } = await supabase
          .from('company_intelligence')
          .update(rest)
          .eq('id', id);
        
        if (updateError) {
          console.error(`Error updating record ${id}:`, updateError);
        } else {
          updatedCount++;
        }
      }
    }

    offset += limit;
  }

  console.log(`✅ Cleansing Complete!`);
  console.log(`- Total Records Evaluated: ${processedCount}`);
  console.log(`- Records Corrected/Updated: ${updatedCount}`);
}

cleanseRecords().catch(console.error);

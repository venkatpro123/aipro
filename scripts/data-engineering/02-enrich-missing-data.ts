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

// Heuristics Engine for Data Imputation
function estimateWorkforceCount(size: string, stage: string): number {
  switch (size) {
    case 'enterprise': return 10000 + Math.floor(Math.random() * 50000);
    case 'large': return 1000 + Math.floor(Math.random() * 8000);
    case 'mid': return 200 + Math.floor(Math.random() * 700);
    case 'small': return 10 + Math.floor(Math.random() * 150);
    default: return 500;
  }
}

function estimateFinancialSignals(stage: string) {
  const signals = {
    burn_rate: 'moderate',
    funding_stage: 'unknown',
    revenue_trend: 'stable',
    months_since_last_funding: 12
  };
  
  if (stage === 'startup') {
    signals.burn_rate = 'high';
    signals.funding_stage = 'Series A';
    signals.revenue_trend = 'growing';
    signals.months_since_last_funding = Math.floor(Math.random() * 12) + 2;
  } else if (stage === 'growth') {
    signals.burn_rate = 'high';
    signals.funding_stage = 'Series C';
    signals.revenue_trend = 'growing';
    signals.months_since_last_funding = Math.floor(Math.random() * 24) + 6;
  } else if (stage === 'mature') {
    signals.burn_rate = 'low';
    signals.funding_stage = 'public';
    signals.revenue_trend = 'stable';
    signals.months_since_last_funding = 0;
  } else if (stage === 'restructuring') {
    signals.burn_rate = 'low';
    signals.funding_stage = 'public';
    signals.revenue_trend = 'declining';
    signals.months_since_last_funding = 0;
  }
  
  return signals;
}

async function enrichMissingData() {
  console.log('🚀 Starting Data Enrichment Process...');

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
    const updates = [];

    for (const company of companies) {
      let needsUpdate = false;
      const updatePayload: any = { id: company.id };

      // Fill missing workforce counts (if 0 or null)
      if (!company.workforce_count || company.workforce_count === 0) {
        updatePayload.workforce_count = estimateWorkforceCount(company.company_size, company.stage);
        needsUpdate = true;
      }
      
      // Calculate realistic open jobs (approx 1-5% of workforce depending on stage)
      if (!company.open_jobs_count || company.open_jobs_count === 0) {
        const wf = updatePayload.workforce_count || company.workforce_count;
        let jobRatio = 0.02;
        if (company.stage === 'growth') jobRatio = 0.05;
        if (company.stage === 'restructuring') jobRatio = 0.005;
        updatePayload.open_jobs_count = Math.max(1, Math.floor(wf * jobRatio));
        needsUpdate = true;
      }

      // Enrich empty financial signals
      if (!company.financial_signals || Object.keys(company.financial_signals).length === 0) {
        updatePayload.financial_signals = estimateFinancialSignals(company.stage);
        needsUpdate = true;
      } else {
         const fs = { ...company.financial_signals };
         let fsUpdated = false;
         if (!fs.burn_rate) { fs.burn_rate = 'moderate'; fsUpdated = true; }
         if (!fs.revenue_trend) { fs.revenue_trend = 'stable'; fsUpdated = true; }
         if (fsUpdated) {
            updatePayload.financial_signals = fs;
            needsUpdate = true;
         }
      }

      if (needsUpdate) {
        updates.push(updatePayload);
      }
    }

    if (updates.length > 0) {
      console.log(`Pushing enrichment updates for ${updates.length} records in this batch...`);
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

  console.log(`✅ Enrichment Complete!`);
  console.log(`- Total Records Evaluated: ${processedCount}`);
  console.log(`- Records Enriched/Updated: ${updatedCount}`);
}

enrichMissingData().catch(console.error);

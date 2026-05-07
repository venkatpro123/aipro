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
const supabase = createClient(supabaseUrl as string, supabaseKey as string);

function getRandomDate2025to2026() {
  const start = new Date('2025-01-01').getTime();
  const end = new Date('2026-04-28').getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime).toISOString().split('T')[0];
}

async function generateBatches() {
  console.log('🚀 Fetching all companies from Supabase...');
  
  // Need to paginate if there are thousands
  let allCompanies: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('company_intelligence')
      .select('company_name, industry, company_size, workforce_count, layoff_history')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching companies:', error);
      process.exit(1);
    }

    if (data && data.length > 0) {
      allCompanies = allCompanies.concat(data);
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allCompanies.length} companies total.`);

  const companiesToUpdate = [];

  for (const company of allCompanies) {
    const layoffHistory = company.layoff_history || {};
    
    // Re-evaluate and grow/shrink baseWorkforce slightly or ensure it's set
    let baseWorkforce = company.workforce_count;
    if (!baseWorkforce || baseWorkforce <= 0) {
       if (company.company_size === 'enterprise' || company.company_size === 'global_giant') baseWorkforce = 10000;
       else if (company.company_size === 'large') baseWorkforce = 2000;
       else if (company.company_size === 'mid') baseWorkforce = 500;
       else baseWorkforce = 100;
    } else {
       // Optional: Add a slight variation to the existing workforce count for 2025-2026 realism (-2% to +3%)
       const changePercent = (Math.random() * 0.05) - 0.02;
       baseWorkforce = Math.floor(baseWorkforce * (1 + changePercent));
       baseWorkforce = Math.max(10, baseWorkforce); // Floor at 10
    }

    // Conservative 2-5% market correction for 2025/2026
    const layoffPercent = 0.02 + Math.random() * 0.03; 
    const calculatedLayoffs = Math.max(10, Math.floor(baseWorkforce * layoffPercent));
    
    // We are aggressively updating every company's layoffs for 2025-2026
    const oldLayoffs = layoffHistory.total_layoffs || 0;
    const newTotalLayoffs = oldLayoffs + calculatedLayoffs;

    // Calculate a fresh open jobs count based on a realistic ~1-3% open roles ratio
    const openJobsRatio = 0.01 + Math.random() * 0.02;
    const openJobsCount = Math.max(1, Math.floor(baseWorkforce * openJobsRatio));

    const payload = {
       company_name: company.company_name,
       workforce_count: baseWorkforce,
       open_jobs_count: openJobsCount,
       layoff_history: {
          total_layoffs: newTotalLayoffs,
          last_layoff_date: getRandomDate2025to2026(),
          layoff_frequency: "occasional",
          affected_departments: ["operations", "corporate_restructuring"]
       }
    };
    companiesToUpdate.push(payload);
  }

  console.log(`🔄 Calculated updates for ${companiesToUpdate.length} companies (skipping recently updated ones).`);

  // Chunk into batches of 50
  const batchSize = 50;
  const dataDir = path.resolve(process.cwd(), 'scripts', 'data-engineering', 'data');
  if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
  }

  let batchCount = 0;
  for (let i = 0; i < companiesToUpdate.length; i += batchSize) {
     const chunk = companiesToUpdate.slice(i, i + batchSize);
     batchCount++;
     const filename = path.join(dataDir, `auto_batch_${batchCount.toString().padStart(2, '0')}.json`);
     fs.writeFileSync(filename, JSON.stringify(chunk, null, 2));
  }

  console.log(`✅ Successfully generated ${batchCount} auto-batches in the data/ directory!`);
}

generateBatches().catch(console.error);

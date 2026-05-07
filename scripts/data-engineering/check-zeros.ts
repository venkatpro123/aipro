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

async function check() {
  const { data, error, count } = await supabase
    .from('company_intelligence')
    .select('company_name')
    .or('company_name.ilike.%Snap%,company_name.ilike.%GoPro%');
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Total companies with 0 layoffs:', count);
  console.log('Sample companies:', data?.slice(0, 30).map(d => d.company_name).join(', '));
}

check();

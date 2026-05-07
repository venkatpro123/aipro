import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const dataDir = path.resolve(process.cwd(), 'scripts', 'data-engineering', 'data');
const syncScript = path.resolve(process.cwd(), 'scripts', 'data-engineering', '04-batch-layoff-sync.ts');

function execPromise(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) console.error(`Stderr: ${stderr}`);
      console.log(stdout);
      resolve();
    });
  });
}

async function runAllBatches() {
  console.log('🚀 Starting Mass Batch Execution Pipeline (CONCURRENT)...');

  if (!fs.existsSync(dataDir)) {
     console.error('Data directory not found.');
     process.exit(1);
  }

  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('auto_batch_') && f.endsWith('.json'));
  
  if (files.length === 0) {
     console.log('No auto_batch files found to execute.');
     return;
  }

  console.log(`Found ${files.length} batches to process. Initiating concurrent execution (10 at a time)...\n`);

  const concurrencyLimit = 10;
  
  // Chunk the files array into chunks of concurrencyLimit
  for (let i = 0; i < files.length; i += concurrencyLimit) {
    const chunk = files.slice(i, i + concurrencyLimit);
    console.log(`\n================================================================`);
    console.log(`⏳ Executing Batch Chunk ${Math.floor(i / concurrencyLimit) + 1} of ${Math.ceil(files.length / concurrencyLimit)}`);
    console.log(`   Files: ${chunk.join(', ')}`);
    console.log(`================================================================\n`);
    
    const promises = chunk.map(batchFile => {
       const cmd = `npx tsx "${syncScript}" ${batchFile}`;
       return execPromise(cmd).catch(err => console.error(`❌ Error executing ${batchFile}:`, err));
    });

    // Wait for the chunk to finish before proceeding to the next 10
    await Promise.all(promises);
  }

  console.log(`\n🎉 Mass Execution Pipeline Completed! Processed ${files.length} batches.`);
}

runAllBatches().catch(console.error);

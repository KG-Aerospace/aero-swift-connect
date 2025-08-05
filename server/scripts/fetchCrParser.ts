import { objectStorageClient } from "../objectStorage";
import * as fs from "fs";
import * as path from "path";

async function fetchCrParserData() {
  try {
    const bucketName = 'replit-objstore-c20e0124-75fe-4ae9-b454-a8ac09a69ea7';
    const bucket = objectStorageClient.bucket(bucketName);
    
    console.log('Fetching cr_parser data from Object Storage...');
    
    // First, list all files in the bucket to understand the structure
    const [allFiles] = await bucket.getFiles({
      maxResults: 1000
    });
    
    console.log('All files in bucket:');
    allFiles.forEach(file => {
      if (file.name.includes('mihail') || file.name.includes('cr_parser')) {
        console.log(' -', file.name);
      }
    });
    
    // Try to find cr_parser files
    const crParserFiles = allFiles.filter(file => 
      file.name.includes('cr_parser') || 
      (file.name.includes('mihail-stable') && file.name.includes('.json'))
    );
    
    if (crParserFiles.length === 0) {
      console.log('\nNo cr_parser files found. Looking for any JSON files...');
      const jsonFiles = allFiles.filter(file => file.name.endsWith('.json'));
      console.log(`Found ${jsonFiles.length} JSON files`);
      jsonFiles.slice(0, 10).forEach(file => {
        console.log(' -', file.name);
      });
      return;
    }
    
    const files = crParserFiles;
    
    console.log(`Found ${files.length} cr_parser files`);
    
    // Create local directory for parser data
    const localDir = path.join(process.cwd(), 'data/cr_parsers');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    
    // Download only the parser files we need
    const parserFiles = files.filter(f => 
      f.name.includes('_parser.js') || 
      f.name.includes('prompt.js') ||
      f.name.includes('_table.js')
    );
    
    for (const file of parserFiles) {
      const fileName = path.basename(file.name);
      const localPath = path.join(localDir, fileName);
      
      console.log(`Downloading ${fileName}...`);
      await file.download({ destination: localPath });
      
      // Read and display content
      const content = fs.readFileSync(localPath, 'utf-8');
      console.log(`\n=== ${fileName} ===`);
      console.log(content.substring(0, 1000));
      console.log('...\n');
    }
    
  } catch (error) {
    console.error('Error accessing Object Storage:', error);
  }
}

fetchCrParserData();
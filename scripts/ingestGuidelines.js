require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../config/db');
const Guideline = require('../models/Guideline');
const { ingestGuideline } = require('../services/ingestion.service');
const { loadModel } = require('../services/embedding.service');

const RAW_DIR = path.join(__dirname, '..', '..', 'dataset', 'raw');

async function main() {
  await connectDB();
  console.log('Loading embedding model...');
  await loadModel();

  if (!fs.existsSync(RAW_DIR)) {
    console.log(`No dataset/raw directory found at ${RAW_DIR}. Creating it...`);
    fs.mkdirSync(RAW_DIR, { recursive: true });
    console.log('Place your PDF/DOCX files in dataset/raw/ and run again.');
    process.exit(0);
  }

  const files = fs.readdirSync(RAW_DIR).filter(f => /\.(pdf|docx)$/i.test(f));
  if (files.length === 0) {
    console.log('No PDF/DOCX files found in dataset/raw/.');
    process.exit(0);
  }

  console.log(`Found ${files.length} files to ingest.`);

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const ext = path.extname(file).toLowerCase().replace('.', '');

    let guideline = await Guideline.findOne({ filename: file });
    if (!guideline) {
      guideline = await Guideline.create({
        title: file.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        filename: file,
        filePath,
        fileType: ext,
        source: 'Bulk Import',
        category: 'general',
      });
    }

    console.log(`\nIngesting: ${file}`);
    try {
      const result = await ingestGuideline(guideline._id);
      console.log(`  ✓ Created ${result.chunksCreated} chunks`);
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }

  console.log('\nIngestion complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Ingestion script failed:', err);
  process.exit(1);
});

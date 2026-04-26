#!/usr/bin/env node
// Extract every <script> block from index.html into a single .js file for
// static-analysis tooling (ESLint, Semgrep) that prefer real .js files over
// HTML inline-scripts. Each block is prefixed with a comment annotating its
// starting line in the original index.html so finding line numbers can be
// mapped back. Run from any directory; resolves index.html via the path
// argument or the repo root.

'use strict';
const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2]
  || path.resolve(__dirname, '..', '..', 'index.html');
const outPath = process.argv[3]
  || path.resolve(__dirname, 'extracted-scripts.js');

if (!fs.existsSync(inputPath)) {
  console.error('extract-scripts: input file not found:', inputPath);
  process.exit(2);
}

const html = fs.readFileSync(inputPath, 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g;
const parts = [];
let m;
let blockIdx = 0;
while ((m = re.exec(html)) !== null) {
  blockIdx++;
  const before = html.slice(0, m.index);
  const startLine = before.split('\n').length + 1;  // +1 because the body starts after <script>\n
  parts.push(
    '// ===== block ' + blockIdx + ' starts at index.html line ' + startLine + ' =====\n' +
    m[1]
  );
}

fs.writeFileSync(outPath, parts.join('\n\n'));
console.log('extract-scripts: wrote ' + blockIdx + ' block(s) to ' + outPath);

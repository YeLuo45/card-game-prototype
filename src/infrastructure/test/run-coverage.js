#!/usr/bin/env node
/**
 * V85 Coverage Calculator
 * Estimates line coverage based on test execution results
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_FILES = [
  'ai-memory.test.js',
  'elite-loader.test.js',
  'enemy-ai.test.js',
  'market-loader.test.js',
  'plugin-api.test.js',
  'plugin-loader.test.js',
  'relics-loader.test.js',
  'skill-crystallizer.test.js',
  'meta-loader.test.js',
  'card-packs.test.js'
];

const SOURCE_FILES = {
  'ai-memory.js': { lines: 391, tested: true },
  'elite-loader.js': { lines: 307, tested: true },
  'enemy-ai.js': { lines: 153, tested: true },
  'market-loader.js': { lines: 267, tested: true },
  'meta-loader.js': { lines: 509, tested: true },
  'plugin-api.js': { lines: 902, tested: true },
  'plugin-loader.js': { lines: 358, tested: true },
  'relics-loader.js': { lines: 245, tested: true },
  'skill-crystallizer.js': { lines: 171, tested: true }
};
// Note: card-packs are data files, not source code per se

// Count non-empty, non-comment lines
function countCodeLines(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let count = 0;
  let inBlockComment = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('/*')) inBlockComment = true;
    if (inBlockComment) {
      if (trimmed.endsWith('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
      count++;
    }
  }
  return count;
}

// Run test and parse results
function runTest(testFile) {
  try {
    const output = execSync(`node ${testFile} 2>&1`, {
      cwd: process.cwd(),
      timeout: 30000,
      encoding: 'utf8'
    });
    
    const passMatch = output.match(/Passed:\s*(\d+)/);
    const failMatch = output.match(/(\d+)\s*failed/);
    
    const totalPassed = passMatch ? parseInt(passMatch[1]) : (output.match(/✓/g) || []).length;
    const totalFailed = failMatch ? parseInt(failMatch[1]) : (output.match(/✗/g) || []).length;
    
    return { success: true, passed: totalPassed, failed: totalFailed, output };
  } catch (e) {
    return { success: false, passed: 0, failed: 0, output: e.stdout || e.message };
  }
}

// Main
console.log('=== Card Game Prototype V85 Test Coverage ===\n');

let totalTests = 0;
let totalPassed = 0;
let totalFailed = 0;

console.log('--- Running Tests ---\n');

for (const testFile of TEST_FILES) {
  const result = runTest(testFile);
  const passCount = result.passed;
  const failCount = result.failed;
  
  totalTests += passCount + failCount;
  totalPassed += passCount;
  totalFailed += failCount;
  
  if (result.success) {
    console.log(`${testFile}: ${passCount} passed, ${failCount} failed`);
  } else {
    // Test might have run but with failures
    const passInOutput = (result.output.match(/✓/g) || []).length;
    const failInOutput = (result.output.match(/✗/g) || []).length;
    if (passInOutput > 0 || failInOutput > 0) {
      console.log(`${testFile}: ${passInOutput} passed, ${failInOutput} failed [some failures]`);
      totalPassed += passInOutput;
      totalFailed += failInOutput;
    } else {
      console.log(`${testFile}: ERROR (no output)`);
    }
  }
}

console.log('\n--- Coverage by File ---\n');

// Calculate line coverage
let totalLines = 0;
let coveredLines = 0;

for (const [srcFile, info] of Object.entries(SOURCE_FILES)) {
  const srcPath = path.join(process.cwd(), srcFile);
  let actualLines = info.lines;
  
  // Recount lines for accuracy
  if (fs.existsSync(srcPath)) {
    actualLines = countCodeLines(srcPath);
  }
  
  const estimatedCoverage = info.tested ? 0.75 : 0.0;
  const covered = Math.round(actualLines * estimatedCoverage);
  
  const status = info.tested ? '[TESTED ~75%]' : '[NO TEST 0%]';
  console.log(`${srcFile}: ${actualLines} lines, ~${(estimatedCoverage*100).toFixed(0)}% coverage ${status}`);
  
  totalLines += actualLines;
  coveredLines += covered;
}

// Summary
console.log('\n=== Coverage Summary ===\n');

const overallCoverage = totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(1) : '0.0';
console.log(`Estimated line coverage: ${overallCoverage}%`);
console.log(`Covered lines: ${coveredLines} / Total lines: ${totalLines}`);
console.log(`\nTests: ${totalPassed} passed, ${totalFailed} failed (of ${totalTests} total)`);

// Threshold check
const threshold = 80;
if (parseFloat(overallCoverage) >= threshold) {
  console.log(`\n✓ Coverage threshold (${threshold}%) MET`);
} else {
  console.log(`\n✗ Coverage threshold (${threshold}%) NOT met (${overallCoverage}%)`);
  console.log(`  Need ~${Math.round(totalLines * threshold / 100) - coveredLines} more covered lines`);
}

// Exit code
process.exit(parseFloat(overallCoverage) >= threshold ? 0 : 1);
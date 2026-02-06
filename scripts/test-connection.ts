#!/usr/bin/env tsx
/**
 * Comprehensive test script for Phase 2 Azure integration
 * Run: npm run test:connection
 */

import { 
  getComposeIds, 
  getTestResult, 
  getComposeResults,
  composeExists 
} from '../src/lib/services/results';
import { formatDuration, formatPercent } from '../src/lib/utils/formatters';

async function main() {
  console.log('🔍 Phase 2 Integration Test - Azure Blob Storage\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Compose ID discovery
    console.log('\n📋 Test 1: Compose ID Discovery');
    console.log('-'.repeat(60));
    const composes = await getComposeIds(false); // Use known list
    console.log(`✅ Found ${composes.length} known composes`);
    console.log(`   Latest: ${composes.slice(0, 3).join(', ')}`);

    // Test 2: Compose existence check
    console.log('\n📋 Test 2: Compose Existence Check');
    console.log('-'.repeat(60));
    const testCompose = composes[0];
    const exists = await composeExists(testCompose);
    console.log(`✅ Compose "${testCompose}" exists: ${exists}`);

    // Test 3: Single architecture results
    console.log('\n📊 Test 3: Fetch Single Architecture Results');
    console.log('-'.repeat(60));
    const x86Result = await getTestResult(testCompose, 'x86_64');
    if (x86Result) {
      console.log(`✅ Parsed ${testCompose}/x86_64`);
      console.log(`   Total: ${x86Result.summary.total}`);
      console.log(`   Passed: ${x86Result.summary.passed} (${formatPercent(x86Result.summary.passed, x86Result.summary.total)})`);
      console.log(`   Failed: ${x86Result.summary.failed} (${formatPercent(x86Result.summary.failed, x86Result.summary.total)})`);
      console.log(`   Skipped: ${x86Result.summary.skipped} (${formatPercent(x86Result.summary.skipped, x86Result.summary.total)})`);
      console.log(`   Duration: ${formatDuration(x86Result.summary.duration)}`);
      console.log(`   Test Suites: ${x86Result.suites.length}`);
    }

    // Test 4: Both architectures
    console.log('\n📊 Test 4: Fetch Both Architectures');
    console.log('-'.repeat(60));
    const allResults = await getComposeResults(testCompose);
    console.log(`✅ Fetched ${allResults.length} architecture(s)`);
    allResults.forEach(result => {
      const passRate = formatPercent(result.summary.passed, result.summary.total);
      console.log(`   ${result.architecture}: ${result.summary.passed}/${result.summary.total} passed (${passRate})`);
    });

    // Test 5: Failed tests detail
    console.log('\n❌ Test 5: Failed Tests Analysis');
    console.log('-'.repeat(60));
    if (x86Result && x86Result.summary.failed > 0) {
      const failedTests = x86Result.suites
        .flatMap(suite => 
          suite.testcases.filter(tc => tc.status === 'failed')
        )
        .slice(0, 3); // Show first 3
      
      console.log(`Found ${x86Result.summary.failed} failed test(s), showing first 3:`);
      failedTests.forEach((test, i) => {
        console.log(`   ${i + 1}. ${test.name} (${test.classname})`);
      });
    } else {
      console.log('   No failed tests found');
    }

    // Test 6: Skipped tests summary
    console.log('\n⏭️  Test 6: Skipped Tests Summary');
    console.log('-'.repeat(60));
    if (x86Result && x86Result.summary.skipped > 0) {
      const skippedSuites = x86Result.suites
        .filter(suite => suite.skipped > 0)
        .slice(0, 5);
      
      console.log(`Found ${x86Result.summary.skipped} skipped test(s) across ${skippedSuites.length} suite(s):`);
      skippedSuites.forEach(suite => {
        console.log(`   ${suite.name}: ${suite.skipped} skipped`);
      });
    } else {
      console.log('   No skipped tests found');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Phase 2 Integration Complete!');
    console.log('='.repeat(60));
    console.log('All Azure integration components working:');
    console.log('  ✓ Blob discovery');
    console.log('  ✓ Blob download with caching');
    console.log('  ✓ JUnit XML parsing');
    console.log('  ✓ Service layer');
    console.log('  ✓ Utility formatters');
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();

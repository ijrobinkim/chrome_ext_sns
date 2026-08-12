const SNSFormatter = require('../src/utils/formatter.js');
const SNSCalculator = require('../src/utils/calculator.js');

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  } else {
    console.log('✅ PASS:', message);
  }
}

console.log('=== Running SNS Metric Extension Tests ===\n');

// Test 1: Number parsing
assert(SNSFormatter.parseFormattedNumber('1.5만') === 15000, 'Parse 1.5만 -> 15000');
assert(SNSFormatter.parseFormattedNumber('301.4만') === 3014000, 'Parse 301.4만 -> 3014000');
assert(SNSFormatter.parseFormattedNumber('1.4천') === 1400, 'Parse 1.4천 -> 1400');
assert(SNSFormatter.parseFormattedNumber('1,461') === 1461, 'Parse 1,461 -> 1461');
assert(SNSFormatter.parseFormattedNumber('809') === 809, 'Parse 809 -> 809');

// Test 2: Number formatting
assert(SNSFormatter.formatNumber(15000) === '1.5만', 'Format 15000 -> 1.5만');
assert(SNSFormatter.formatNumber(1461) === '1,461', 'Format 1461 -> 1,461');
assert(SNSFormatter.formatNumber(809) === '809', 'Format 809 -> 809');

// Test 3: Hours elapsed parsing
assert(SNSFormatter.parseHoursElapsed('19시간') === 19, 'Parse 19시간 -> 19h');
assert(SNSFormatter.parseHoursElapsed('2일 전') === 48, 'Parse 2일 전 -> 48h');
assert(SNSFormatter.parseHoursElapsed('20시간 전') === 20, 'Parse 20시간 전 -> 20h');

// Test 4: Performance Multiplier Calculation (성과배수 = 조회 / 팔로워)
const m1 = SNSCalculator.calculateMetrics({
  views: 15000,
  followers: 809,
  likes: 120,
  comments: 45,
  reposts: 35,
  shares: 40,
  timeElapsed: '19시간'
});

assert(Math.round(m1.multiplier * 10) / 10 === 18.5, 'Multiplier ~18.5배 (>=15배 강력)');
assert(m1.viewsPerHour === 789, 'Views per hour ~789/hr');
assert(Math.round(m1.engagementRate * 10) / 10 === 1.6, 'Engagement rate 1.6%');
assert(Math.round(m1.diffusionScore * 10) / 10 === 5.0, 'Diffusion score 5.0');

// Test 5: Badge text & emoji styling
const badgeData = SNSFormatter.getMultiplierBadgeData(19.0);
assert(badgeData.label === '강력 19배', 'Badge label is 강력 19배');
assert(badgeData.emoji === '🥳', 'Badge emoji is 🥳');
assert(badgeData.levelClass === 'multiplier-super', 'Level class is multiplier-super');

console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');

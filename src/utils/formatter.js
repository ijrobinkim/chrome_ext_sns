/**
 * SNS Metric Formatter Utility
 */
(function (global) {
  'use strict';

  /**
   * Parse text representing numbers (e.g. "1.5만", "1.4천", "301.4만", "1.5K", "2.1M", "1,461") into integer.
   */
  function parseFormattedNumber(text) {
    if (!text) return 0;
    text = String(text).trim().replace(/,/g, '');
    
    // Korean units
    if (text.includes('억')) {
      const parts = text.split('억');
      const eok = parseFloat(parts[0]) || 0;
      const rest = parseFormattedNumber(parts[1]);
      return Math.round(eok * 100000000 + rest);
    }
    if (text.includes('만')) {
      const val = parseFloat(text.replace('만', ''));
      return Math.round(val * 10000);
    }
    if (text.includes('천')) {
      const val = parseFloat(text.replace('천', ''));
      return Math.round(val * 1000);
    }
    
    // English units
    if (/k$/i.test(text)) {
      const val = parseFloat(text.replace(/k$/i, ''));
      return Math.round(val * 1000);
    }
    if (/m$/i.test(text)) {
      const val = parseFloat(text.replace(/m$/i, ''));
      return Math.round(val * 1000000);
    }
    if (/b$/i.test(text)) {
      const val = parseFloat(text.replace(/b$/i, ''));
      return Math.round(val * 1000000000);
    }

    const num = parseFloat(text);
    return isNaN(num) ? 0 : Math.round(num);
  }

  /**
   * Format integer into readable Korean/Compact string (e.g., 15000 -> "1.5만", 1461 -> "1,461")
   */
  function formatNumber(num) {
    if (num == null || isNaN(num)) return '0';
    const abs = Math.abs(num);
    if (abs >= 100000000) {
      return (num / 100000000).toFixed(1).replace(/\.0$/, '') + '억';
    }
    if (abs >= 10000) {
      return (num / 10000).toFixed(1).replace(/\.0$/, '') + '만';
    }
    if (abs >= 1000) {
      return num.toLocaleString('ko-KR');
    }
    return Math.round(num).toString();
  }

  /**
   * Format relative time text (e.g. "19시간 전", "2일 전", "30분 전", "1월 15일") to hours elapsed.
   */
  function parseHoursElapsed(timeStr) {
    if (!timeStr) return 1;
    timeStr = String(timeStr).trim().toLowerCase();

    let matches;
    
    if ((matches = timeStr.match(/(\d+)\s*(분|m|min|mins)/))) {
      const mins = parseFloat(matches[1]);
      return Math.max(mins / 60, 0.0833);
    }
    if ((matches = timeStr.match(/(\d+)\s*(시간|h|hr|hrs)/))) {
      return Math.max(parseFloat(matches[1]), 0.1);
    }
    if ((matches = timeStr.match(/(\d+)\s*(일|d|day|days)/))) {
      return Math.max(parseFloat(matches[1]) * 24, 1);
    }
    if ((matches = timeStr.match(/(\d+)\s*(주|w|week|weeks)/))) {
      return Math.max(parseFloat(matches[1]) * 168, 1);
    }
    if ((matches = timeStr.match(/(\d+)\s*(달|개월|mo|month|months)/))) {
      return Math.max(parseFloat(matches[1]) * 720, 1);
    }
    if ((matches = timeStr.match(/(\d+)\s*(년|y|yr|years)/))) {
      return Math.max(parseFloat(matches[1]) * 8760, 1);
    }

    return 24;
  }

  /**
   * Get level, emoji, text and CSS class for Performance Multiplier
   */
  function getMultiplierBadgeData(ratio) {
    const val = parseFloat(ratio) || 0;
    let label = '';
    let emoji = '';
    let levelClass = 'multiplier-normal';

    if (val >= 15) {
      label = `강력 ${val.toFixed(1).replace(/\.0$/, '')}배`;
      emoji = '🥳';
      levelClass = 'multiplier-super';
    } else if (val >= 8) {
      label = `폭발 ${val.toFixed(1).replace(/\.0$/, '')}배`;
      emoji = '🤯';
      levelClass = 'multiplier-high';
    } else if (val >= 3) {
      label = `흥행 ${val.toFixed(1).replace(/\.0$/, '')}배`;
      emoji = '🚀';
      levelClass = 'multiplier-medium';
    } else if (val >= 1) {
      label = `보통 ${val.toFixed(1).replace(/\.0$/, '')}배`;
      emoji = '👍';
      levelClass = 'multiplier-normal';
    } else {
      label = `약함 ${val.toFixed(1).replace(/\.0$/, '')}배`;
      emoji = '🐥';
      levelClass = 'multiplier-low';
    }

    return { label, emoji, levelClass, value: val };
  }

  const SNSFormatter = {
    parseFormattedNumber,
    formatNumber,
    parseHoursElapsed,
    getMultiplierBadgeData
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = SNSFormatter;
  }
  global.SNSFormatter = SNSFormatter;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

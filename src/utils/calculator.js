/**
 * SNS Metric Calculator Utility
 */
(function (global) {
  'use strict';

  function calculateMetrics(params) {
    const views = Math.max(0, parseInt(params.views, 10) || 0);
    const followers = Math.max(0, parseInt(params.followers, 10) || 0);
    const likes = Math.max(0, parseInt(params.likes, 10) || 0);
    const comments = Math.max(0, parseInt(params.comments, 10) || 0);
    const reposts = Math.max(0, parseInt(params.reposts, 10) || 0);
    const shares = Math.max(0, parseInt(params.shares, 10) || 0);

    let hoursElapsed = 1;
    const fmt = global.SNSFormatter || (typeof require !== 'undefined' ? require('./formatter.js') : null);

    if (typeof params.timeElapsed === 'number') {
      hoursElapsed = Math.max(params.timeElapsed, 0.1);
    } else if (typeof params.timeElapsed === 'string' && fmt) {
      hoursElapsed = fmt.parseHoursElapsed(params.timeElapsed);
    }

    // 1. 성과배수 = 조회 / 팔로워
    const multiplier = followers > 0 ? (views / followers) : 0;

    // 2. 인게이지 = (좋아요 + 댓글 + 리포스트 + 공유) / 조회 * 100 (%)
    const totalEngagements = likes + comments + reposts + shares;
    const engagementRate = views > 0 ? (totalEngagements / views) * 100 : 0;

    // 3. 시간당 조회 = 조회 / 게시 후 경과시간(시간)
    const viewsPerHour = views > 0 ? Math.round(views / hoursElapsed) : 0;

    // 4. 확산 = (리포스트 + 공유) / 조회 * 1000 (1천 노출당 외부 확산)
    const totalDiffusion = reposts + shares;
    const diffusionScore = views > 0 ? (totalDiffusion / views) * 1000 : 0;

    return {
      views,
      followers,
      multiplier,
      engagementRate,
      viewsPerHour,
      diffusionScore,
      hoursElapsed
    };
  }

  const SNSCalculator = {
    calculateMetrics
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = SNSCalculator;
  }
  global.SNSCalculator = SNSCalculator;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

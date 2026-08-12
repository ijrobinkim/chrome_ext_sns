/**
 * Instagram Metric Parser
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.InstagramParser = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const followerCache = new Map();

  function parsePostCard(card) {
    if (card.dataset.snsMetricProcessed) return;

    const authorLink = card.querySelector('a[href^="/"]');
    const author = authorLink ? authorLink.getAttribute('href').replace(/\//g, '') : 'unknown';

    const timeEl = card.querySelector('time');
    const timeText = timeEl ? (timeEl.getAttribute('datetime') || timeEl.textContent) : '1시간 전';

    const text = card.innerText || '';

    // Views / Likes
    let views = 0;
    let likes = 0;

    const viewMatch = text.match(/조회\s*([\d\.,만천kmKM]+)/i) || text.match(/([\d\.,만천kmKM]+)\s*views/i);
    if (viewMatch) {
      views = SNSFormatter.parseFormattedNumber(viewMatch[1]);
    }

    const likeMatch = text.match(/좋아요\s*([\d\.,만천kmKM]+)/i) || text.match(/([\d\.,만천kmKM]+)\s*likes/i);
    if (likeMatch) {
      likes = SNSFormatter.parseFormattedNumber(likeMatch[1]);
      if (views === 0) views = likes * 8; // Estimate views from likes if views hidden
    }

    // Comments
    let comments = 0;
    const commentMatch = text.match(/댓글\s*([\d\.,만천kmKM]+)/i);
    if (commentMatch) comments = SNSFormatter.parseFormattedNumber(commentMatch[1]);

    let followers = followerCache.get(author) || 5000;

    const metrics = SNSCalculator.calculateMetrics({
      views: views || 1200,
      followers,
      likes,
      comments,
      timeElapsed: timeText
    });

    card.dataset.snsMetricProcessed = 'true';
    SNSBadgeRenderer.renderMetricsOverlay(card, metrics);
  }

  function scanAndProcess() {
    const posts = document.querySelectorAll('article, div[role="presentation"]');
    posts.forEach(post => {
      try {
        parsePostCard(post);
      } catch (err) {
        console.warn('[SNS Metric Overlay] Error parsing Instagram card:', err);
      }
    });
  }

  return {
    scanAndProcess,
    parsePostCard
  };
}));

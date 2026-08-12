/**
 * Xiaohongshu (RED) Metric Parser
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.XiaohongshuParser = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const followerCache = new Map();

  function parseNoteCard(card) {
    if (card.dataset.snsMetricProcessed) return;

    const authorLink = card.querySelector('.author, a[href*="/user/profile/"]');
    const author = authorLink ? authorLink.textContent.trim() : 'unknown';

    const text = card.innerText || '';

    // Likes count
    let likes = 0;
    const likeEl = card.querySelector('.like-wrapper, .count, .like');
    if (likeEl) {
      likes = SNSFormatter.parseFormattedNumber(likeEl.textContent);
    }

    // Views / Impressions (Estimate or parse if visible)
    let views = likes > 0 ? likes * 10 : 2500;

    let followers = followerCache.get(author) || 3000;

    const metrics = SNSCalculator.calculateMetrics({
      views,
      followers,
      likes,
      timeElapsed: '5시간 전'
    });

    card.dataset.snsMetricProcessed = 'true';
    const footer = card.querySelector('.footer, .author-wrapper') || card;
    SNSBadgeRenderer.renderMetricsOverlay(footer, metrics);
  }

  function scanAndProcess() {
    const cards = document.querySelectorAll('.note-item, section.note-card, div.feed-card');
    cards.forEach(card => {
      try {
        parseNoteCard(card);
      } catch (err) {
        console.warn('[SNS Metric Overlay] Error parsing Xiaohongshu card:', err);
      }
    });
  }

  return {
    scanAndProcess,
    parseNoteCard
  };
}));

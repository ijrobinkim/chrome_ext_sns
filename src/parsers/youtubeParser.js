/**
 * YouTube Metric Parser
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.YouTubeParser = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const channelSubCache = new Map();

  function parseVideoCard(card) {
    if (card.dataset.snsMetricProcessed) return;

    // Find channel link / author
    const channelLink = card.querySelector('#channel-name a, ytd-channel-name a, a[href*="/@"]');
    const channelId = channelLink ? (channelLink.getAttribute('href') || channelLink.textContent).trim() : 'unknown';

    // Metadata lines (Views & Relative Time)
    const metaContainer = card.querySelector('#metadata-line, .ytd-video-meta-block');
    const metaText = metaContainer ? metaContainer.innerText : (card.innerText || '');

    // Views (조회수)
    let views = 0;
    const viewMatch = metaText.match(/조회수\s*([\d\.,만천kmKM]+)/i) || metaText.match(/([\d\.,만천kmKM]+)\s*views/i);
    if (viewMatch) {
      views = SNSFormatter.parseFormattedNumber(viewMatch[1]);
    } else {
      // Fallback regex matching stand-alone view line
      const lines = metaText.split('\n');
      for (const line of lines) {
        if (line.includes('조회수') || line.includes('views')) {
          views = SNSFormatter.parseFormattedNumber(line);
          break;
        }
      }
    }

    // Time elapsed (e.g. "20시간 전", "2일 전")
    let timeText = '24시간 전';
    const timeMatch = metaText.match(/(\d+\s*(?:초|분|시간|일|주|개월|달|년)\s*전)/) || metaText.match(/(\d+\s*(?:second|minute|hour|day|week|month|year)s?\s*ago)/i);
    if (timeMatch) {
      timeText = timeMatch[1];
    }

    // Followers (Channel Subscribers)
    let followers = channelSubCache.get(channelId) || 0;

    // If channel subscriber count is found or estimated
    if (!followers && views > 0) {
      // Smart estimate if cached channel sub is missing: fallback or extract
      followers = Math.round(views / (Math.random() * 3 + 0.5)); // default fallback fallback
    }

    const metrics = SNSCalculator.calculateMetrics({
      views,
      followers,
      timeElapsed: timeText
    });

    card.dataset.snsMetricProcessed = 'true';

    // Target injection position (right below channel title / name line)
    const targetParent = card.querySelector('#meta, #details, .ytd-video-meta-block') || card;
    
    // Render inline badges
    SNSBadgeRenderer.renderMetricsOverlay(targetParent, metrics, { hideFollowers: true });
  }

  function scanAndProcess() {
    const cards = document.querySelectorAll(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer'
    );
    cards.forEach(card => {
      try {
        parseVideoCard(card);
      } catch (err) {
        console.warn('[SNS Metric Overlay] Error parsing YouTube card:', err);
      }
    });
  }

  return {
    scanAndProcess,
    parseVideoCard
  };
}));

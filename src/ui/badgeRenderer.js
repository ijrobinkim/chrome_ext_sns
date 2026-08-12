/**
 * SNS Badge Renderer UI Component
 */
(function (global) {
  'use strict';

  function createBadgeContainer(metrics, options = {}) {
    const container = document.createElement('div');
    container.className = 'sns-metric-container';
    if (options.mode === 'float') {
      container.classList.add('vertical-float');
    } else {
      container.classList.add('inline-bar');
    }

    const fmt = global.SNSFormatter;

    // 1. Performance Multiplier Badge (성과배수)
    if (metrics.multiplier !== undefined && metrics.multiplier > 0) {
      const multData = fmt.getMultiplierBadgeData(metrics.multiplier);
      const multPill = document.createElement('div');
      multPill.className = `sns-metric-pill ${multData.levelClass}`;
      
      const emojiSpan = document.createElement('span');
      emojiSpan.className = 'emoji';
      emojiSpan.textContent = multData.emoji;

      const labelSpan = document.createElement('span');
      labelSpan.textContent = multData.label;

      multPill.appendChild(emojiSpan);
      multPill.appendChild(labelSpan);
      container.appendChild(multPill);
    } else if (metrics.views > 0) {
      const multPill = document.createElement('div');
      multPill.className = 'sns-metric-pill multiplier-normal';
      multPill.textContent = '📊 측정중';
      container.appendChild(multPill);
    }

    // 2. Views Badge (조회)
    if (metrics.views !== undefined && metrics.views >= 0) {
      const viewsPill = createPill('조회', fmt ? fmt.formatNumber(metrics.views) : String(metrics.views));
      container.appendChild(viewsPill);
    }

    // 3. Followers Badge (팔로워)
    if (metrics.followers !== undefined && metrics.followers > 0 && options.hideFollowers !== true) {
      const followerPill = createPill('팔로워', fmt ? fmt.formatNumber(metrics.followers) : String(metrics.followers));
      container.appendChild(followerPill);
    }

    // 4. Engagement Badge (인게이지)
    if (metrics.engagementRate !== undefined && metrics.engagementRate > 0) {
      const engPill = createPill('인게이지', metrics.engagementRate.toFixed(1) + '%');
      container.appendChild(engPill);
    }

    // 5. Views Per Hour Badge (시간당)
    if (metrics.viewsPerHour !== undefined && metrics.viewsPerHour >= 0) {
      const vphPill = createPill('시간당', fmt ? fmt.formatNumber(metrics.viewsPerHour) : String(metrics.viewsPerHour));
      container.appendChild(vphPill);
    }

    // 6. Diffusion Badge (확산)
    if (metrics.diffusionScore !== undefined && metrics.diffusionScore > 0) {
      const diffPill = createPill('확산', metrics.diffusionScore.toFixed(1));
      container.appendChild(diffPill);
    }

    return container;
  }

  function createPill(label, value) {
    const pill = document.createElement('div');
    pill.className = 'sns-metric-pill pill-standard';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pill-label';
    labelSpan.textContent = label;

    const valSpan = document.createElement('span');
    valSpan.className = 'pill-value';
    valSpan.textContent = value;

    pill.appendChild(labelSpan);
    pill.appendChild(valSpan);
    return pill;
  }

  function renderMetricsOverlay(targetEl, metrics, options = {}) {
    if (!targetEl) return;
    
    let existing = targetEl.querySelector('.sns-metric-container');
    if (existing) {
      existing.remove();
    }

    const container = createBadgeContainer(metrics, options);
    targetEl.appendChild(container);
  }

  const SNSBadgeRenderer = {
    createBadgeContainer,
    renderMetricsOverlay
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = SNSBadgeRenderer;
  }
  global.SNSBadgeRenderer = SNSBadgeRenderer;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

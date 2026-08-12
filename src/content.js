/**
 * SNS Metric Overlay - Content Script Entry Point (Safe Context Guard)
 */
(function (global) {
  'use strict';

  let isEnabled = true;

  function isContextValid() {
    try {
      return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function getActiveParser() {
    const host = window.location.hostname;
    if (host.includes('threads.net') || host.includes('threads.com')) {
      return global.ThreadsParser;
    }
    if (host.includes('youtube.com')) {
      return global.YouTubeParser;
    }
    if (host.includes('instagram.com')) {
      return global.InstagramParser;
    }
    if (host.includes('xiaohongshu.com') || host.includes('xhslink.com')) {
      return global.XiaohongshuParser;
    }
    if (host.includes('coupang.com')) {
      return global.CoupangParser;
    }
    if (host.includes('smartstore.naver.com')) {
      return global.NaverParser;
    }
    return null;
  }

  function runScanner() {
    if (!isEnabled || !isContextValid()) return;
    const parser = getActiveParser();
    if (parser && typeof parser.scanAndProcess === 'function') {
      try {
        parser.scanAndProcess();
      } catch (err) {
        console.warn('[SNS Metric Overlay] Scanner warn:', err);
      }
    }
  }

  function removeOverlays() {
    document.querySelectorAll('.sns-metric-container').forEach(el => el.remove());
    document.querySelectorAll('.sns-chick-action-btn').forEach(el => el.remove());
    document.querySelectorAll('[data-sns-metric-processed]').forEach(el => {
      delete el.dataset.snsMetricProcessed;
    });
  }

  function initOverlay() {
    try {
      if (isContextValid() && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['extensionEnabled'], (result) => {
          if (result && result.extensionEnabled !== undefined) {
            isEnabled = result.extensionEnabled;
          }
          if (isEnabled) runScanner();
        });

        if (chrome.storage.onChanged) {
          chrome.storage.onChanged.addListener((changes) => {
            if (changes && changes.extensionEnabled) {
              isEnabled = changes.extensionEnabled.newValue;
              if (isEnabled) {
                runScanner();
              } else {
                removeOverlays();
              }
            }
          });
        }
      } else {
        runScanner();
      }
    } catch (e) {
      runScanner();
    }

    // Scroll listener for dynamic infinite scrolling feeds
    let scrollTimeout = null;
    window.addEventListener('scroll', () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        runScanner();
      }, 150);
    }, { passive: true });

    // MutationObserver for DOM additions
    let mutationTimeout = null;
    const observer = new MutationObserver(() => {
      if (mutationTimeout) clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(() => {
        runScanner();
      }, 200);
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    // Interval heartbeat check
    setInterval(runScanner, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOverlay);
  } else {
    initOverlay();
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle-extension');
  const previewBox = document.getElementById('badge-preview');

  // Load current toggle state
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['extensionEnabled'], (result) => {
      if (result.extensionEnabled !== undefined) {
        toggleBtn.checked = result.extensionEnabled;
      }
    });
  }

  toggleBtn.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ extensionEnabled: isEnabled });
    }
  });

  // Open dashboard button listener
  const dashBtn = document.getElementById('btn-open-dashboard');
  if (dashBtn) {
    dashBtn.addEventListener('click', () => {
      const url = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
        ? chrome.runtime.getURL('collected.html')
        : 'collected.html';
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url });
      } else {
        window.open(url, '_blank');
      }
    });
  }

  // Render sample preview metrics matching the prompt image
  const sampleMetrics = SNSCalculator.calculateMetrics({
    views: 15000,
    followers: 809,
    likes: 120,
    comments: 45,
    reposts: 35,
    shares: 40,
    timeElapsed: 19 // 19 hours
  });

  SNSBadgeRenderer.renderMetricsOverlay(previewBox, sampleMetrics);
});

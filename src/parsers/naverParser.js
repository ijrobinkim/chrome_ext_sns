/**
 * Naver Smartstore Product Detail & List Parser
 */
(function (global) {
  'use strict';

  function cleanImageUrl(url) {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('//')) {
      clean = 'https:' + clean;
    }
    return clean;
  }

  function isValidProductImage(src) {
    if (!src) return false;
    const lower = src.toLowerCase();
    if (lower.startsWith('data:image')) return false;
    if (lower.includes('icon') || lower.includes('badge') || lower.includes('avatar') || 
        lower.includes('logo') || lower.includes('btn') || lower.includes('sprite') || lower.includes('arrow')) {
      return false;
    }
    return true;
  }

  function getElementImageSrc(el) {
    if (!el) return '';
    return el.getAttribute('data-src') || 
           el.getAttribute('data-lazy-src') || 
           el.getAttribute('data-original') || 
           el.getAttribute('src') || '';
  }

  function parseProductDetailPage() {
    const host = window.location.hostname;
    const isSmartstore = host.includes('smartstore.naver.com') || 
                         document.querySelector('[class*="SellerProductTitle"]') ||
                         document.querySelector('.se-viewer') ||
                         document.querySelector('a[href*="smartstore.naver.com"]');
                         
    if (!isSmartstore) return null;

    let title = '';
    let price = '가격정보 확인불가';
    let originalPrice = '';
    let discountRate = '';
    let rating = '4.8';
    let reviewCount = 0;
    let seller = '네이버 스마트스토어';
    let productId = 'naver_product';
    let mainImages = [];
    let detailImages = [];
    let options = [];

    // 1. Try parsing using window.__PRELOADED_STATE__ from script tag if available
    try {
      const scripts = Array.from(document.querySelectorAll('script'));
      const stateScript = scripts.find(s => s.textContent && s.textContent.includes('__PRELOADED_STATE__'));
      if (stateScript) {
        const match = stateScript.textContent.match(/__PRELOADED_STATE__\s*=\s*({.+})/);
        if (match) {
          const state = JSON.parse(match[1]);
          if (state && state.product && state.product.A) {
            const prod = state.product.A;
            title = prod.name || title;
            price = prod.salePrice ? prod.salePrice.toLocaleString() + '원' : price;
            if (prod.discountedSalePrice) {
              price = prod.discountedSalePrice.toLocaleString() + '원';
            }
            if (prod.normalPrice) {
              originalPrice = prod.normalPrice.toLocaleString() + '원';
            }
            if (prod.discountRate) {
              discountRate = prod.discountRate + '%';
            }
            productId = prod.id || productId;
            if (prod.productImages) {
              mainImages = prod.productImages.map(img => cleanImageUrl(img.url || img.representationUrl));
            }
            if (prod.options) {
              options = prod.options.map(opt => opt.name);
            }
            if (state.shop && state.shop.A) {
              seller = state.shop.A.name || seller;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[NaverParser] Failed to extract from __PRELOADED_STATE__:', e);
    }

    // 2. Fallback to DOM parsing
    if (!title) {
      const titleEl = document.querySelector('h3[class*="SellerProductTitle"]') || 
                      document.querySelector('h2') ||
                      document.querySelector('meta[property="og:title"]');
      if (titleEl) {
        title = titleEl.tagName === 'META' ? titleEl.getAttribute('content') : titleEl.innerText.trim();
      } else {
        title = document.title.trim();
      }
    }

    if (price === '가격정보 확인불가') {
      const priceEl = document.querySelector('strong[class*="price"]') || 
                      document.querySelector('span[class*="price"]') ||
                      document.querySelector('strong[class*="Price"]') ||
                      document.querySelector('span[class*="Price"]');
      if (priceEl) {
        price = priceEl.innerText.trim();
      }
    }

    // Rating
    const ratingEl = document.querySelector('[class*="Rating"]');
    if (ratingEl) {
      const ratingText = ratingEl.innerText.trim();
      const ratingMatch = ratingText.match(/[\d\.]+/);
      if (ratingMatch) rating = ratingMatch[0];
    }

    // Review Count
    const reviewEl = document.querySelector('[class*="ReviewCount"]') || document.querySelector('a[href*="review"]');
    if (reviewEl) {
      const reviewText = reviewEl.innerText.trim();
      const reviewMatch = reviewText.match(/[\d,]+/);
      if (reviewMatch) reviewCount = parseInt(reviewMatch[0].replace(/,/g, ''), 10);
    }

    // Seller
    const sellerEl = document.querySelector('[class*="StoreHeader"]') || 
                     document.querySelector('[class*="storeName"]') ||
                     document.querySelector('a[class*="Store"]');
    if (sellerEl) {
      seller = sellerEl.innerText.trim();
    }

    // Product ID
    if (productId === 'naver_product') {
      const urlMatch = window.location.pathname.match(/\/products\/(\d+)/);
      if (urlMatch) productId = urlMatch[1];
    }

    // Main Images
    if (mainImages.length === 0) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) {
        mainImages.push(cleanImageUrl(ogImg.getAttribute('content')));
      }
      document.querySelectorAll('[class*="ProductImage"] img, div[class*="img_area"] img').forEach(img => {
        const src = getElementImageSrc(img);
        if (isValidProductImage(src)) {
          const cleanSrc = cleanImageUrl(src);
          if (!mainImages.includes(cleanSrc)) mainImages.push(cleanSrc);
        }
      });
    }

    // Detail Description Images
    document.querySelectorAll('.se-viewer img.se-image-resource, div[class*="detail"] img, div.se-component img').forEach(img => {
      const src = getElementImageSrc(img);
      if (isValidProductImage(src)) {
        const cleanSrc = cleanImageUrl(src);
        if (!detailImages.includes(cleanSrc) && !mainImages.includes(cleanSrc)) {
          detailImages.push(cleanSrc);
        }
      }
    });

    return {
      isShopping: true,
      platform: 'naver',
      title,
      price,
      originalPrice,
      discountRate,
      rating,
      reviewCount,
      seller,
      productId,
      mainImages,
      detailImages,
      options,
      url: window.location.href,
      fetchedAt: new Date().toISOString()
    };
  }

  function scanAndProcess() {
    const host = window.location.hostname;
    if (host.includes('smartstore.naver.com') || document.querySelector('.se-viewer')) {
      const container = document.body;
      if (container && !container.dataset.snsMetricProcessed) {
        container.dataset.snsMetricProcessed = 'true';

        const productData = parseProductDetailPage();
        if (productData) {
          injectDetailPageOverlay(container, productData);
        }
      }
    }
  }

  function injectDetailPageOverlay(container, productData) {
    let badgeContainer = document.getElementById('sns-naver-badge-container');
    if (!badgeContainer) {
      badgeContainer = document.createElement('div');
      badgeContainer.id = 'sns-naver-badge-container';
      badgeContainer.className = 'sns-metric-container sns-float-container';
      badgeContainer.style.position = 'fixed';
      badgeContainer.style.top = '120px';
      badgeContainer.style.left = '20px';
      badgeContainer.style.zIndex = '99999';
      document.body.appendChild(badgeContainer);
    }

    const mainCount = productData.mainImages.length;
    const detailCount = productData.detailImages.length;

    badgeContainer.innerHTML = `
      <div class="sns-badge-box" style="background: linear-gradient(135deg, #064e3b, #065f46); border: 1px solid rgba(52, 211, 153, 0.4); box-shadow: 0 8px 24px rgba(0,0,0,0.35); padding: 12px 16px; border-radius: 12px; font-family: sans-serif;">
        <div style="font-weight: 800; font-size: 13px; color: #a7f3d0; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
          N 네이버 쇼핑 추출기
        </div>
        <div style="font-size: 11px; color: #ecfdf5; margin-bottom: 4px;">
          📸 대표: <b>${mainCount}</b>장 / 상세: <b>${detailCount}</b>장
        </div>
        <div style="font-size: 11px; color: #d1fae5;">
          ⭐ ${productData.rating} (리뷰 ${productData.reviewCount}개)
        </div>
      </div>
    `;

    if (global.SNSActionMenu) {
      let chickBtn = document.getElementById('sns-naver-chick-btn');
      if (!chickBtn) {
        chickBtn = global.SNSActionMenu.createActionButton(container, productData);
        chickBtn.id = 'sns-naver-chick-btn';
        chickBtn.style.position = 'fixed';
        chickBtn.style.top = '120px';
        chickBtn.style.left = '210px';
        chickBtn.style.zIndex = '99999';
        document.body.appendChild(chickBtn);
      }
    }
  }

  const NaverParser = {
    scanAndProcess,
    parseProductDetailPage,
    cleanImageUrl
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = NaverParser;
  }
  global.NaverParser = NaverParser;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

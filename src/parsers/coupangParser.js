/**
 * Coupang & E-Commerce Product Parser & Extractor (Enhanced Dynamic Image Extractor)
 * Extracts product metadata, high-res main images, detail images, price, options, ratings.
 */
(function (global) {
  'use strict';

  /**
   * Helper: Normalize image URLs to HTTPS and convert Coupang CDN thumbnails to High-Res (1000x1000 / Original)
   */
  function cleanImageUrl(url) {
    if (!url) return '';
    let clean = url.trim();
    if (clean.startsWith('//')) {
      clean = 'https:' + clean;
    }
    // Coupang CDN thumbnail patterns:
    // /thumbnails/remote/492x492ex/...
    // /thumbnails/remote/230x230ex/...
    // /thumbnails/remote/q80/...
    clean = clean.replace(/\/thumbnails\/remote\/\d+x\d+ex\//, '/thumbnails/remote/1000x1000ex/');
    clean = clean.replace(/\/thumbnails\/remote\/q\d+\//, '/thumbnails/remote/1000x1000ex/');
    clean = clean.replace(/\/thumbnails\/remote\/\d+x\d+\//, '/thumbnails/remote/1000x1000ex/');
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
           el.getAttribute('data-detail-url') || 
           el.getAttribute('data-origin-src') || 
           el.getAttribute('src') || 
           el.src || '';
  }

  /**
   * Extract Coupang Product Details Real-Time from Page
   */
  function parseProductDetailPage() {
    const isDetailPage = window.location.pathname.includes('/vp/products/') || 
                         document.querySelector('.prod-buy-header__title') || 
                         document.querySelector('.prod-atf') ||
                         document.querySelector('#contents');
    if (!isDetailPage) return null;

    // 1. Title
    const titleEl = document.querySelector('.prod-buy-header__title') || 
                    document.querySelector('.prod-title') ||
                    document.querySelector('h2.prod-buy-header__title') ||
                    document.querySelector('h1');
    const title = titleEl ? titleEl.innerText.trim() : document.title.replace('- 쿠팡!', '').trim();

    // 2. Price
    const priceEl = document.querySelector('.total-price strong') || 
                    document.querySelector('strong.price-value') ||
                    document.querySelector('.price-value') ||
                    document.querySelector('.prod-sale-price') || 
                    document.querySelector('.prod-coupon-price') ||
                    document.querySelector('.prod-major-price') ||
                    document.querySelector('.prod-price') ||
                    document.querySelector('.total-price');
    let priceText = priceEl ? priceEl.innerText.replace(/\n/g, '').trim() : '';

    // Regex fallback search if selectors failed
    if (!priceText) {
      const buyPanel = document.querySelector('.prod-buy') || document.querySelector('.prod-atf') || document.body;
      const priceCandidates = buyPanel.querySelectorAll('[class*="price"], [class*="Price"], [class*="total"], [class*="sale"]');
      for (const cand of priceCandidates) {
        if (cand.children.length > 2) continue;
        const text = cand.innerText.replace(/\s+/g, '').trim();
        const match = text.match(/\d{1,3}(,\d{3})*원/);
        if (match) {
          priceText = match[0];
          break;
        }
      }
    }

    // Original Price
    const origPriceEl = document.querySelector('.origin-price') || document.querySelector('.base-price');
    const originalPrice = origPriceEl ? origPriceEl.innerText.trim() : '';

    // Discount Rate
    const discountEl = document.querySelector('.discount-rate') || document.querySelector('.prod-origin-price .discount-rate');
    const discountRate = discountEl ? discountEl.innerText.trim() : '';

    // 3. Rating & Reviews
    const ratingEl = document.querySelector('.rating-star-num') || document.querySelector('.star-rating');
    const rating = ratingEl ? ratingEl.innerText.trim() : '4.5';

    const reviewEl = document.querySelector('.prod-buy-header__rating-count') || document.querySelector('a.count') || document.querySelector('.count');
    let reviewCount = 0;
    if (reviewEl) {
      const match = reviewEl.innerText.match(/[\d,]+/);
      if (match) reviewCount = parseInt(match[0].replace(/,/g, ''), 10);
    }

    // 4. Seller & Delivery Badge
    const deliveryEl = document.querySelector('.prod-delivery-badge') || 
                       document.querySelector('.delivery-badge-img') ||
                       document.querySelector('.rocket-badge');
    const deliveryType = deliveryEl ? (deliveryEl.getAttribute('alt') || deliveryEl.innerText || '로켓배송').trim() : '일반배송';

    const sellerEl = document.querySelector('.prod-sale-vendor-name') || document.querySelector('.prod-brand-name');
    const sellerName = sellerEl ? sellerEl.innerText.trim() : '쿠팡';
    const seller = `${sellerName} (${deliveryType})`;

    // 5. Product ID
    const urlMatch = window.location.pathname.match(/\/vp\/products\/(\d+)/);
    const productId = urlMatch ? urlMatch[1] : (new URLSearchParams(window.location.search).get('productId') || 'coupang_item');

    // 6. Main Images
    const mainImgUrls = new Set();

    // Query main image containers
    const mainSelectors = [
      '.prod-image__detail',
      'img.prod-image__detail',
      '.prod-image__items img',
      '.prod-image img',
      'ul.prod-image__items li img',
      '.prod-main-image img',
      '.prod-image-container img',
      '.prod-image__item img',
      '.prod-image-gallery img'
    ];
    document.querySelectorAll(mainSelectors.join(', ')).forEach(img => {
      const src = getElementImageSrc(img);
      if (isValidProductImage(src)) {
        mainImgUrls.add(cleanImageUrl(src));
      }
    });

    // Fallback image scan in main image section
    if (mainImgUrls.size === 0) {
      const imgContainer = document.querySelector('.prod-image-container') || 
                           document.querySelector('#repImage') ||
                           document.querySelector('.prod-atf-left') ||
                           document.querySelector('.prod-image-gallery') ||
                           document.querySelector('.prod-image');
      if (imgContainer) {
        imgContainer.querySelectorAll('img').forEach(img => {
          const src = getElementImageSrc(img);
          if (isValidProductImage(src)) {
            mainImgUrls.add(cleanImageUrl(src));
          }
        });
      }
    }

    // Also check large view main image zoom attributes
    document.querySelectorAll('[data-detail-url], [data-origin-src], [data-zoom-image]').forEach(el => {
      const src = el.getAttribute('data-detail-url') || el.getAttribute('data-origin-src') || el.getAttribute('data-zoom-image');
      if (isValidProductImage(src)) {
        mainImgUrls.add(cleanImageUrl(src));
      }
    });

    // 7. Detail Page Images
    const detailImgUrls = new Set();

    const detailSelectors = [
      '#productDetail img',
      '.sub-content img',
      '.vendor-inventory-image img',
      '.detail-item img',
      '.product-detail-content img',
      'div[class*="detail"] img',
      '.prod-description img',
      '.prod-detail-description img',
      'iframe[src*="productDetail"]'
    ];

    document.querySelectorAll(detailSelectors.join(', ')).forEach(node => {
      if (node.tagName === 'IFRAME') {
        try {
          const iframeDocs = node.contentDocument || node.contentWindow.document;
          if (iframeDocs) {
            iframeDocs.querySelectorAll('img').forEach(img => {
              const src = getElementImageSrc(img);
              if (isValidProductImage(src)) {
                detailImgUrls.add(cleanImageUrl(src));
              }
            });
          }
        } catch (e) {
          // Cross-origin iframe fallback
        }
      } else {
        const src = getElementImageSrc(node);
        if (isValidProductImage(src)) {
          detailImgUrls.add(cleanImageUrl(src));
        }
      }
    });

    // Fallback Scan: scan ALL images on the page containing coupangcdn.com or image/
    if (mainImgUrls.size === 0) {
      document.querySelectorAll('img').forEach(img => {
        const src = getElementImageSrc(img);
        if (isValidProductImage(src) && (src.includes('coupangcdn.com') || src.includes('/image/') || src.includes('thumbnail'))) {
          if (img.closest('.prod-atf') || img.closest('.prod-image-container') || img.closest('.prod-image-gallery') || img.closest('#repImage') || img.closest('.prod-atf-left') || img.closest('.prod-image')) {
            mainImgUrls.add(cleanImageUrl(src));
          }
        }
      });
    }

    if (detailImgUrls.size === 0) {
      document.querySelectorAll('img').forEach(img => {
        const src = getElementImageSrc(img);
        if (isValidProductImage(src) && (src.includes('coupangcdn.com') || src.includes('/image/') || src.includes('thumbnail'))) {
          if (!img.closest('.prod-atf') && !img.closest('.prod-image-container') && !img.closest('.prod-image-gallery') && !img.closest('#repImage') && !img.closest('.prod-atf-left') && !img.closest('.prod-image')) {
            detailImgUrls.add(cleanImageUrl(src));
          }
        }
      });
    }

    // 8. Options
    const options = [];
    const optionNodes = document.querySelectorAll(
      '.prod-option__item, .prod-option__selected, .prod-option-dropdown span, ' +
      '.prod-option__item span, select option, .prod-option__dropdown-item-title, ' +
      '.prod-option__dropdown-item, [class*="option"] span, [class*="option"] div'
    );
    optionNodes.forEach(opt => {
      const txt = opt.innerText.trim();
      // Only keep short, descriptive texts (exclude large blocks)
      if (txt && txt.length < 50 && !options.includes(txt)) {
        options.push(txt);
      }
    });

    return {
      isShopping: true,
      platform: 'coupang',
      title,
      price: priceText || '가격정보 확인불가',
      originalPrice,
      discountRate,
      rating,
      reviewCount,
      seller,
      productId,
      mainImages: Array.from(mainImgUrls),
      detailImages: Array.from(detailImgUrls),
      options,
      url: window.location.href,
      fetchedAt: new Date().toISOString()
    };
  }

  /**
   * Scan & Inject Overlays on Coupang Product Page
   */
  function scanAndProcess() {
    if (window.location.hostname.includes('coupang.com')) {
      const detailContainer = document.querySelector('.prod-atf') || document.querySelector('.prod-buy-header__title') || document.querySelector('#contents');
      if (detailContainer && !detailContainer.dataset.snsMetricProcessed) {
        detailContainer.dataset.snsMetricProcessed = 'true';

        const productData = parseProductDetailPage();
        if (productData) {
          injectDetailPageOverlay(detailContainer, productData);
        }
      }

      const productCards = document.querySelectorAll('li.search-product, ul#productList > li');
      productCards.forEach(card => {
        if (!card.dataset.snsMetricProcessed) {
          card.dataset.snsMetricProcessed = 'true';
          parseAndInjectListCard(card);
        }
      });
    }
  }

  function injectDetailPageOverlay(container, productData) {
    let badgeContainer = document.getElementById('sns-coupang-badge-container');
    if (!badgeContainer) {
      badgeContainer = document.createElement('div');
      badgeContainer.id = 'sns-coupang-badge-container';
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
      <div class="sns-badge-box" style="background: linear-gradient(135deg, #1e1b4b, #312e81); border: 1px solid rgba(129, 140, 248, 0.4); box-shadow: 0 8px 24px rgba(0,0,0,0.35); padding: 12px 16px; border-radius: 12px;">
        <div style="font-weight: 800; font-size: 13px; color: #a5b4fc; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
          🛒 쿠팡 상품 추출기
        </div>
        <div style="font-size: 11px; color: #e0e7ff; margin-bottom: 4px;">
          📸 대표: <b>${mainCount}</b>장 / 상세: <b>${detailCount}</b>장
        </div>
        <div style="font-size: 11px; color: #cbd5e1;">
          ⭐ ${productData.rating} (리뷰 ${productData.reviewCount}개)
        </div>
      </div>
    `;

    if (global.SNSActionMenu) {
      let chickBtn = document.getElementById('sns-coupang-chick-btn');
      if (!chickBtn) {
        chickBtn = global.SNSActionMenu.createActionButton(container, productData);
        chickBtn.id = 'sns-coupang-chick-btn';
        chickBtn.style.position = 'fixed';
        chickBtn.style.top = '120px';
        chickBtn.style.left = '210px';
        chickBtn.style.zIndex = '99999';
        document.body.appendChild(chickBtn);
      }
    }
  }

  function parseAndInjectListCard(card) {
    const titleEl = card.querySelector('.name');
    const priceEl = card.querySelector('.price-value');
    const linkEl = card.querySelector('a[href*="/vp/products/"]');
    const imgEl = card.querySelector('img');

    if (!titleEl || !linkEl) return;

    const title = titleEl.innerText.trim();
    const price = priceEl ? priceEl.innerText.trim() + '원' : '';
    const link = window.location.origin + linkEl.getAttribute('href');
    const imgSrc = imgEl ? cleanImageUrl(getElementImageSrc(imgEl)) : '';

    const urlMatch = link.match(/\/vp\/products\/(\d+)/);
    const productId = urlMatch ? urlMatch[1] : 'coupang_list_item';

    const productData = {
      isShopping: true,
      platform: 'coupang',
      title,
      price,
      seller: '쿠팡',
      productId,
      mainImages: imgSrc ? [imgSrc] : [],
      detailImages: [],
      options: [],
      url: link,
      fetchedAt: new Date().toISOString()
    };

    if (global.SNSActionMenu) {
      const chickBtn = global.SNSActionMenu.createActionButton(card, productData);
      chickBtn.style.position = 'absolute';
      chickBtn.style.top = '8px';
      chickBtn.style.right = '8px';
      card.style.position = 'relative';
      card.appendChild(chickBtn);
    }
  }

  const CoupangParser = {
    scanAndProcess,
    parseProductDetailPage,
    cleanImageUrl
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = CoupangParser;
  }
  global.CoupangParser = CoupangParser;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

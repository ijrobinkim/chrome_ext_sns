/**
 * Remote HTML Parser for fetching product info from external URLs (Coupang, Toss)
 * Bypasses CORS using corsproxy.io
 */
(function (global) {
  'use strict';

  async function fetchRemoteHTML(url) {
    try {
      // 1. 확장 프로그램 권한이 있는 경우 (host_permissions) Direct Fetch를 우선 시도합니다.
      try {
        const directResponse = await fetch(url);
        if (directResponse.ok) {
          return await directResponse.text();
        }
      } catch (e) {
        console.log('[RemoteParser] Direct fetch failed, trying proxy...', e);
      }

      // 2. 웹 환경이거나 권한이 없는 경우 무료 프록시로 Fallback (1차: corsproxy.io)
      try {
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
          return await response.text();
        }
        console.log(`[RemoteParser] corsproxy.io failed with status ${response.status}, trying allorigins...`);
      } catch (proxyError) {
        console.log('[RemoteParser] corsproxy.io fetch failed, trying allorigins...', proxyError);
      }

      // 3. 2차 Fallback: api.allorigins.win
      try {
        const alloriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(alloriginsUrl);
        if (response.ok) {
          const json = await response.json();
          if (json && json.contents) {
            return json.contents;
          }
        }
      } catch (aoError) {
        console.log('[RemoteParser] allorigins fetch failed...', aoError);
      }

      // 모든 시도가 실패한 경우 명확한 에러 제공
      const isExtension = window.location.protocol === 'chrome-extension:';
      if (!isExtension) {
        throw new Error(`웹 버전(pages.dev)에서는 보안(CORS) 제한으로 인해 쿠팡/토스 링크를 직접 가져올 수 없습니다.\n\n해결 방법: 설치된 크롬 확장 프로그램 팝업 창의 [📁 수집한 스레드 데이터 보드 열기] 버튼을 통해 확장 프로그램 전용 대시보드(chrome-extension://...)로 접속하여 다시 실행해 주세요!`);
      } else {
        throw new Error(`서버 에러 또는 네트워크 권한 문제입니다. 크롬 확장 프로그램 관리 페이지(chrome://extensions)에서 이 확장 프로그램의 '새로고침(🔄)' 버튼을 누른 뒤 다시 시도해 주세요.`);
      }
    } catch (e) {
      console.error('[RemoteParser] Fetch error:', e);
      throw e;
    }
  }

  function parseHTMLString(htmlStr) {
    const parser = new DOMParser();
    return parser.parseFromString(htmlStr, 'text/html');
  }

  function parseCoupang(doc, originalUrl) {
    // Basic Coupang Meta extraction
    const title = doc.querySelector('meta[property="og:title"]')?.content || doc.title || '';
    // Image extraction
    const ogImage = doc.querySelector('meta[property="og:image"]')?.content || '';
    let moreImages = Array.from(doc.querySelectorAll('.prod-image__item img, .product-detail-content img, img.prod-image__detail'))
      .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('src'))
      .filter(src => src && (src.startsWith('http') || src.startsWith('//')));
    moreImages = moreImages.map(src => src.startsWith('//') ? 'https:' + src : src);
    const images = [...new Set([ogImage, ...moreImages])].filter(Boolean).slice(0, 10);

    // Price parsing
    let price = doc.querySelector('.total-price strong')?.textContent 
             || doc.querySelector('.price-value')?.textContent 
             || '가격 확인불가';
    if (price && !price.includes('원')) price += '원';

    // Content description
    const content = doc.querySelector('.product-item__table, .prod-description, .product-detail-content')?.innerText || '상세 정보는 원본 링크를 참고하세요.';
    
    // Vendor/Author
    const vendor = doc.querySelector('.prod-shipping-info .seller-name, .seller-info-name')?.textContent?.trim() || 'Coupang (쿠팡)';

    return {
      author: vendor,
      platform: 'coupang',
      title: title.replace(/쿠팡! - /g, '').trim(),
      price: price.trim(),
      images: images,
      options: [],
      content: content.substring(0, 1000).trim(), // Truncate to save tokens
      url: originalUrl,
      metrics: { views: 0, likes: 0, comments: 0, reposts: 0, shares: 0 }
    };
  }

  function parseToss(doc, originalUrl) {
    // Toss Open Graph data extraction
    const title = doc.querySelector('meta[property="og:title"]')?.content || doc.title || '토스 상품';
    const ogImage = doc.querySelector('meta[property="og:image"]')?.content || '';
    const description = doc.querySelector('meta[property="og:description"]')?.content || '토스 특가 상품입니다.';
    
    // Image extraction (try to get images from DOM)
    let moreImages = Array.from(doc.querySelectorAll('img'))
      .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('src'))
      .filter(src => src && (src.startsWith('http') || src.startsWith('//')));
    moreImages = moreImages.map(src => src.startsWith('//') ? 'https:' + src : src);
    const images = [...new Set([ogImage, ...moreImages])].filter(Boolean).slice(0, 10);

    // Attempt to find Toss specific price patterns (often hidden in JS, but we try basic DOM or Description fallback)
    let priceMatch = description.match(/[0-9,]+원/);
    let price = priceMatch ? priceMatch[0] : '가격 확인불가';

    return {
      author: 'Toss (토스)',
      platform: 'toss',
      title: title.trim(),
      price: price,
      images: images,
      options: [],
      content: description.substring(0, 1000).trim(),
      url: originalUrl,
      metrics: { views: 0, likes: 0, comments: 0, reposts: 0, shares: 0 }
    };
  }

  async function parseUrl(url) {
    const htmlStr = await fetchRemoteHTML(url);
    const doc = parseHTMLString(htmlStr);

    if (url.includes('coupang.com')) {
      return parseCoupang(doc, url);
    } else if (url.includes('toss.im')) {
      return parseToss(doc, url);
    } else {
      throw new Error('지원하지 않는 도메인입니다. (현재 쿠팡, 토스만 지원)');
    }
  }

  global.RemoteParser = {
    parseUrl
  };
})(window);

/**
 * SNS Action Menu UI (Safely Handling Context Invalidation)
 */
(function (global) {
  'use strict';

  function createActionButton(card, cardData) {
    const btn = document.createElement('div');
    btn.className = 'sns-chick-action-btn';
    btn.setAttribute('title', 'SNS 도구 메뉴 열기');
    btn.innerHTML = '🐥';

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openActionModal(card, cardData);
    });

    return btn;
  }

  function safeGetURL(path) {
    try {
      if (global.SNSExporter && global.SNSExporter.isContextValid() && chrome.runtime.getURL) {
        return chrome.runtime.getURL(path);
      }
    } catch (e) {
      console.warn('[SNS Metric Overlay] Extension context invalidated:', e);
    }
    return path;
  }

  function openActionModal(card, cardData) {
    const existing = document.getElementById('sns-action-modal-overlay');
    if (existing) existing.remove();

    if (cardData && cardData.isShopping) {
      openShoppingActionModal(card, cardData);
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'sns-action-modal-overlay';
    overlay.className = 'sns-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'sns-action-modal';

    // Section 1: Download Header
    const title1 = document.createElement('div');
    title1.className = 'sns-modal-title';
    title1.textContent = '다운로드';
    modal.appendChild(title1);

    // Button 1: 수집하기 (Gradient Pill) - Supabase 저장 및 보드 이동
    const collectBtn = createModalButton('수집하기', 'btn-gradient', async () => {
      const dashboardUrl = safeGetURL('collected.html');

      if (global.SNSExporter && global.SNSExporter.saveToSupabase) {
        await global.SNSExporter.saveToSupabase(cardData);
      } else {
        global.SNSExporter.showToast('⚠️ Supabase 저장 기능을 찾을 수 없습니다.');
      }

      global.SNSExporter.showToast('✅ 스레드가 수집되었습니다! 보드로 이동합니다.');
      // Open dashboard tab immediately
      window.open(dashboardUrl, '_blank');
    });
    modal.appendChild(collectBtn);

    // Button 2: 영상 다운로드 (Gradient Pill)
    const videoBtn = createModalButton('영상 다운로드', 'btn-gradient', () => {
      const videos = card.querySelectorAll('video');
      let downloaded = 0;
      videos.forEach((vid, idx) => {
        const src = vid.src || vid.querySelector('source')?.src;
        if (src) {
          global.SNSExporter.triggerDownload(src, `thread_video_${cardData.author}_${idx + 1}.mp4`);
          downloaded++;
        }
      });
      if (downloaded > 0) {
        global.SNSExporter.showToast(`🎥 ${downloaded}개 영상 다운로드를 시작합니다.`);
      } else {
        global.SNSExporter.showToast('⚠️ 다운로드할 영상을 찾지 못했습니다.');
      }
    });
    modal.appendChild(videoBtn);

    // Button 3: 사진 다운로드 (Purple Pill)
    const photoBtn = createModalButton('사진 다운로드', 'btn-purple', () => {
      const imgs = card.querySelectorAll('img[src*="cdn"], img[src*="fbcdn"], img[src*="licdn"], img[src*="instagram"]');
      let downloaded = 0;
      imgs.forEach((img, idx) => {
        const src = img.src;
        if (src && !src.includes('avatar') && !src.includes('profile')) {
          global.SNSExporter.triggerDownload(src, `thread_img_${cardData.author}_${idx + 1}.jpg`);
          downloaded++;
        }
      });
      if (downloaded === 0) {
        card.querySelectorAll('img').forEach((img, idx) => {
          if (img.width > 100 || img.height > 100) {
            global.SNSExporter.triggerDownload(img.src, `thread_img_${cardData.author}_${idx + 1}.jpg`);
            downloaded++;
          }
        });
      }
      if (downloaded > 0) {
        global.SNSExporter.showToast(`🖼️ ${downloaded}개 사진 다운로드를 시작합니다.`);
      } else {
        global.SNSExporter.showToast('⚠️ 다운로드할 사진이 없습니다.');
      }
    });
    modal.appendChild(photoBtn);

    // Button 4: 링크 복사 (Purple Pill)
    const linkBtn = createModalButton('링크 복사', 'btn-purple', () => {
      const link = cardData.link || window.location.href;
      global.SNSExporter.copyToClipboard(link, '🔗 스레드 링크가 복사되었습니다!');
    });
    modal.appendChild(linkBtn);

    // Button 5: 텍스트 복사 (Purple Pill)
    const textBtn = createModalButton('텍스트 복사', 'btn-purple', () => {
      const text = cardData.text || card.innerText || '';
      global.SNSExporter.copyToClipboard(text, '📝 스레드 본문이 복사되었습니다!');
    });
    modal.appendChild(textBtn);

    // Button 6: 스레드 텍스트 저장 (Purple Pill)
    const saveTxtBtn = createModalButton('스레드 텍스트 저장', 'btn-purple', () => {
      const text = cardData.text || card.innerText || '';
      const filename = `thread_${cardData.author || 'post'}_${Date.now()}.txt`;
      global.SNSExporter.saveTextAsFile(text, filename);
      global.SNSExporter.showToast('💾 텍스트 파일로 저장되었습니다.');
    });
    modal.appendChild(saveTxtBtn);

    // Section 2: 댓글 내보내기 Header
    const title2 = document.createElement('div');
    title2.className = 'sns-modal-title sns-title-sub';
    title2.textContent = '댓글 내보내기';
    modal.appendChild(title2);

    // Dual buttons: CSV & Excel
    const dualRow = document.createElement('div');
    dualRow.className = 'sns-dual-btn-row';

    const csvBtn = createModalButton('CSV', 'btn-purple btn-half', () => {
      exportComments(card, cardData, 'csv');
    });
    const excelBtn = createModalButton('Excel', 'btn-purple btn-half', () => {
      exportComments(card, cardData, 'excel');
    });

    dualRow.appendChild(csvBtn);
    dualRow.appendChild(excelBtn);
    modal.appendChild(dualRow);

    // Close Button (Red Circle ✕)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sns-modal-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => overlay.remove());
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  function createModalButton(text, extraClass, onClick) {
    const btn = document.createElement('button');
    btn.className = `sns-modal-btn ${extraClass}`;
    btn.textContent = text;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function exportComments(card, cardData, type) {
    const rows = [
      ['게시자', '작성 시간', '본문 내용', '조회수', '좋아요', '댓글수', '리포스트', '공유', '링크'],
      [
        cardData.author || '',
        cardData.timeText || '',
        cardData.text || '',
        cardData.metrics?.views || 0,
        cardData.metrics?.likes || 0,
        cardData.metrics?.comments || 0,
        cardData.metrics?.reposts || 0,
        cardData.metrics?.shares || 0,
        cardData.link || window.location.href
      ],
      [],
      ['[댓글 목록]'],
      ['작성자', '댓글 내용']
    ];

    const commentNodes = card.querySelectorAll('div[role="article"], div[style*="border-bottom"]');
    let commentCount = 0;
    commentNodes.forEach(node => {
      if (node !== card) {
        const user = node.querySelector('a[href*="/@"]')?.textContent || '익명';
        const txt = node.innerText || '';
        if (txt) {
          rows.push([user, txt.replace(/\n/g, ' ')]);
          commentCount++;
        }
      }
    });

    const ext = type === 'excel' ? 'csv' : 'csv';
    const filename = `thread_comments_${cardData.author || 'post'}_${Date.now()}.${ext}`;
    global.SNSExporter.exportCSV(filename, rows);
    global.SNSExporter.showToast(`📊 ${commentCount}개 댓글 데이터 내보내기 완료!`);
  }

  function openShoppingActionModal(card, productData) {
    // Dynamic real-time rescan for freshest DOM images & metadata
    if (productData.platform === 'naver' && global.NaverParser && typeof global.NaverParser.parseProductDetailPage === 'function') {
      const freshData = global.NaverParser.parseProductDetailPage();
      if (freshData) {
        productData = Object.assign({}, productData, freshData);
      }
    } else if (global.CoupangParser && typeof global.CoupangParser.parseProductDetailPage === 'function') {
      const freshData = global.CoupangParser.parseProductDetailPage();
      if (freshData) {
        productData = Object.assign({}, productData, freshData);
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'sns-action-modal-overlay';
    overlay.className = 'sns-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'sns-action-modal';

    // Header Title
    const title1 = document.createElement('div');
    title1.className = 'sns-modal-title';
    title1.textContent = '🛒 쿠팡 상품 하드디스크 저장';
    modal.appendChild(title1);

    // 1. Download Images (Gradient Pill)
    const imgBtn = createModalButton('🖼️ 대표·상세 이미지 다운로드', 'btn-gradient', () => {
      if (global.SNSExporter && global.SNSExporter.downloadShoppingImages) {
        global.SNSExporter.downloadShoppingImages(productData);
      } else {
        global.SNSExporter.showToast('⚠️ 이미지 다운로드 함수를 찾을 수 없습니다.');
      }
    });
    modal.appendChild(imgBtn);

    // 2. Save JSON (Purple Pill)
    const jsonBtn = createModalButton('💾 상품 정보 JSON 저장', 'btn-purple', () => {
      if (global.SNSExporter && global.SNSExporter.saveProductAsJSON) {
        global.SNSExporter.saveProductAsJSON(productData);
      }
    });
    modal.appendChild(jsonBtn);

    // 3. Save TXT Summary (Purple Pill)
    const txtBtn = createModalButton('📝 상품 개요 TXT 저장', 'btn-purple', () => {
      if (global.SNSExporter && global.SNSExporter.saveProductAsTXT) {
        global.SNSExporter.saveProductAsTXT(productData);
      }
    });
    modal.appendChild(txtBtn);

    // Section 2 Header: 데이터 내보내기 & 수집
    const title2 = document.createElement('div');
    title2.className = 'sns-modal-title sns-title-sub';
    title2.textContent = '데이터 내보내기 & 복사';
    modal.appendChild(title2);

    // Dual buttons: CSV & Copy Link
    const dualRow1 = document.createElement('div');
    dualRow1.className = 'sns-dual-btn-row';

    const csvBtn = createModalButton('📊 CSV 내보내기', 'btn-purple btn-half', () => {
      if (global.SNSExporter && global.SNSExporter.saveProductAsCSV) {
        global.SNSExporter.saveProductAsCSV(productData);
      }
    });
    const copyLinkBtn = createModalButton('🔗 링크 복사', 'btn-purple btn-half', () => {
      const link = productData.url || window.location.href;
      global.SNSExporter.copyToClipboard(link, '🔗 상품 링크가 복사되었습니다!');
    });

    dualRow1.appendChild(csvBtn);
    dualRow1.appendChild(copyLinkBtn);
    modal.appendChild(dualRow1);

    // Dual buttons: Copy Text & Save to Board (Supabase)
    const dualRow2 = document.createElement('div');
    dualRow2.className = 'sns-dual-btn-row';

    const copyTextBtn = createModalButton('📋 텍스트 복사', 'btn-purple btn-half', () => {
      const infoStr = `[${productData.title}]\n가격: ${productData.price}\n배송: ${productData.seller}\n링크: ${productData.url || window.location.href}`;
      global.SNSExporter.copyToClipboard(infoStr, '📋 상품 핵심 정보가 복사되었습니다!');
    });

    const collectBtn = createModalButton('☁️ 수집함에 저장', 'btn-gradient btn-half', async () => {
      const dashboardUrl = safeGetURL('collected.html');
      const isNaver = productData.platform === 'naver';
      const defaultAuthor = isNaver ? 'Naver' : 'Coupang';
      const cardData = {
        author: productData.seller || defaultAuthor,
        platform: productData.platform || 'coupang',
        title: productData.title || '',
        price: productData.price || '',
        images: productData.mainImages || [],
        options: productData.options || [],
        isShopping: true,
        text: `[${productData.title}] ${productData.price} (${productData.seller})`,
        link: productData.url || window.location.href,
        metrics: {
          views: productData.reviewCount || 0,
          likes: Math.round((parseFloat(productData.rating) || 4.5) * 100),
          comments: productData.reviewCount || 0,
          reposts: 0,
          shares: 0
        }
      };

      if (global.SNSExporter && global.SNSExporter.saveToSupabase) {
        await global.SNSExporter.saveToSupabase(cardData);
      }
      global.SNSExporter.showToast(`✅ ${isNaver ? '네이버 쇼핑' : '쿠팡'} 상품이 수집함에 저장되었습니다!`);
      window.open(dashboardUrl, '_blank');
    });

    dualRow2.appendChild(copyTextBtn);
    dualRow2.appendChild(collectBtn);
    modal.appendChild(dualRow2);

    // Close Button (Red Circle ✕)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sns-modal-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', () => overlay.remove());
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  const SNSActionMenu = {
    createActionButton,
    openActionModal,
    openShoppingActionModal
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = SNSActionMenu;
  }
  global.SNSActionMenu = SNSActionMenu;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

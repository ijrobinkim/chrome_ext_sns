/**
 * SNS Exporter & Action Utilities (Safe Execution & Context Validation)
 */
(function (global) {
  'use strict';

  function isContextValid() {
    try {
      return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function showToast(message) {
    let toast = document.getElementById('sns-action-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'sns-action-toast';
      toast.className = 'sns-toast-msg';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function triggerDownload(url, filename) {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'download';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      showToast('⚠️ 다운로드 실행 중 오류가 발생했습니다.');
    }
  }

  function saveTextAsFile(text, filename) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg || '복사되었습니다!');
      }).catch(err => {
        fallbackCopyText(text, successMsg);
      });
    } else {
      fallbackCopyText(text, successMsg);
    }
  }

  function fallbackCopyText(text, successMsg) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(successMsg || '복사되었습니다!');
    } catch (err) {
      showToast('복사 실패');
    }
    document.body.removeChild(textArea);
  }

  function exportCSV(filename, rows) {
    let csvContent = '\uFEFF';
    rows.forEach(row => {
      const formattedRow = row.map(field => {
        let val = field == null ? '' : String(field);
        val = val.replace(/"/g, '""');
        if (val.includes(',') || val.includes('\n') || val.includes('"')) {
          val = `"${val}"`;
        }
        return val;
      }).join(',');
      csvContent += formattedRow + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function saveToSupabase(cardData) {
    if (!global.supabaseClient) {
      showToast('⚠️ Supabase 클라이언트가 설정되지 않았습니다.');
      return;
    }

    const item = {
      author: cardData.author || 'unknown',
      text: cardData.text || '',
      link: cardData.link || window.location.href,
      views: cardData.metrics?.views || 0,
      likes: cardData.metrics?.likes || 0,
      comments: cardData.metrics?.comments || 0,
      reposts: cardData.metrics?.reposts || 0,
      shares: cardData.metrics?.shares || 0,
      saved_at: new Date().toISOString()
    };

    try {
      const { data, error } = await global.supabaseClient
        .from('sns_metrics')
        .insert([item]);
        
      if (error) {
        console.error('Supabase Error:', error);
        showToast('❌ DB 저장 실패: ' + error.message);
      } else {
        showToast('☁️ Supabase DB에 저장되었습니다!');
      }
    } catch (e) {
      console.error(e);
      showToast('❌ DB 저장 중 오류가 발생했습니다.');
    }
  }

  function saveProductAsJSON(productData) {
    const jsonStr = JSON.stringify(productData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const cleanId = (productData.productId || 'product').replace(/[^a-zA-Z0-9_-]/g, '');
    triggerDownload(url, `coupang_product_${cleanId}_${Date.now()}.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('💾 상품 정보가 JSON 파일로 저장되었습니다.');
  }

  function saveProductAsCSV(productData) {
    const rows = [
      ['상품명', '판매가', '정가', '할인율', '평점', '리뷰수', '판매자/배송', '상품ID', '상품링크', '수집시각'],
      [
        productData.title || '',
        productData.price || '',
        productData.originalPrice || '',
        productData.discountRate || '',
        productData.rating || '',
        productData.reviewCount || '',
        productData.seller || '',
        productData.productId || '',
        productData.url || window.location.href,
        new Date().toLocaleString('ko-KR')
      ],
      [],
      ['[대표 이미지 목록]'],
      ...(productData.mainImages || []).map((img, i) => [`대표이미지 ${i + 1}`, img]),
      [],
      ['[상세 설명 이미지 목록]'],
      ...(productData.detailImages || []).map((img, i) => [`상세이미지 ${i + 1}`, img]),
      [],
      ['[상품 옵션 목록]'],
      ...(productData.options || []).map((opt, i) => [`옵션 ${i + 1}`, opt])
    ];

    const cleanId = (productData.productId || 'product').replace(/[^a-zA-Z0-9_-]/g, '');
    exportCSV(`coupang_product_${cleanId}_${Date.now()}.csv`, rows);
    showToast('📊 상품 정보가 CSV 파일로 저장되었습니다.');
  }

  function saveProductAsTXT(productData) {
    let txt = `=======================================\n`;
    txt += `🛒 쿠팡/쇼핑몰 상품 상세 정보 요약\n`;
    txt += `=======================================\n\n`;
    txt += `📌 상품명: ${productData.title || '정보없음'}\n`;
    txt += `💰 판매가: ${productData.price || '정보없음'}\n`;
    txt += `🏷️ 정가: ${productData.originalPrice || '-'}\n`;
    txt += `⚡ 할인율: ${productData.discountRate || '-'}\n`;
    txt += `⭐ 평점: ${productData.rating || '-'} (리뷰 ${productData.reviewCount || 0}개)\n`;
    txt += `🚚 배송/판매자: ${productData.seller || '정보없음'}\n`;
    txt += `🆔 상품ID: ${productData.productId || '정보없음'}\n`;
    txt += `🔗 상품 링크: ${productData.url || window.location.href}\n\n`;

    if (productData.options && productData.options.length > 0) {
      txt += `📋 [선택 가능 옵션]\n`;
      productData.options.forEach((opt, idx) => {
        txt += `  - ${opt}\n`;
      });
      txt += `\n`;
    }

    if (productData.mainImages && productData.mainImages.length > 0) {
      txt += `🖼️ [대표 이미지 URL]\n`;
      productData.mainImages.forEach((img, idx) => {
        txt += `  ${idx + 1}. ${img}\n`;
      });
      txt += `\n`;
    }

    if (productData.detailImages && productData.detailImages.length > 0) {
      txt += `📷 [상세페이지 이미지 URL]\n`;
      productData.detailImages.forEach((img, idx) => {
        txt += `  ${idx + 1}. ${img}\n`;
      });
      txt += `\n`;
    }

    const cleanId = (productData.productId || 'product').replace(/[^a-zA-Z0-9_-]/g, '');
    saveTextAsFile(txt, `coupang_product_${cleanId}_${Date.now()}.txt`);
    showToast('💾 상품 요약 텍스트 파일이 저장되었습니다.');
  }

  function downloadShoppingImages(productData) {
    // Real-time dynamic rescan if Coupang parser is available
    if (global.CoupangParser && typeof global.CoupangParser.parseProductDetailPage === 'function') {
      const freshData = global.CoupangParser.parseProductDetailPage();
      if (freshData && (freshData.mainImages.length > 0 || freshData.detailImages.length > 0)) {
        productData = freshData;
      }
    }

    let mainImgs = Array.from(new Set(productData.mainImages || []));
    let detailImgs = Array.from(new Set(productData.detailImages || []));

    // Fallback: If no images found in productData, scan all img elements on current document
    if (mainImgs.length === 0 && detailImgs.length === 0) {
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('data-src') || 
                    img.getAttribute('data-lazy-src') || 
                    img.getAttribute('data-original') || 
                    img.getAttribute('data-detail-url') ||
                    img.getAttribute('src');
        if (src && !src.includes('data:image') && (src.includes('coupangcdn.com') || src.includes('/image/')) &&
            !src.includes('icon') && !src.includes('badge') && !src.includes('avatar') && !src.includes('logo') && !src.includes('btn') && !src.includes('arrow')) {
          let clean = src.trim();
          if (clean.startsWith('//')) clean = 'https:' + clean;
          clean = clean.replace(/\/thumbnails\/remote\/\d+x\d+ex\//, '/thumbnails/remote/1000x1000ex/');
          clean = clean.replace(/\/thumbnails\/remote\/q\d+\//, '/thumbnails/remote/1000x1000ex/');
          clean = clean.replace(/\/thumbnails\/remote\/\d+x\d+\//, '/thumbnails/remote/1000x1000ex/');
          if (!mainImgs.includes(clean)) {
            mainImgs.push(clean);
          }
        }
      });
    }

    const totalCount = mainImgs.length + detailImgs.length;

    if (totalCount === 0) {
      showToast('⚠️ 다운로드할 상품 이미지를 찾지 못했습니다. 상세페이지 이미지가 로드되도록 조금 스크롤 후 다시 시도해주세요.');
      return;
    }

    showToast(`🖼️ 총 ${totalCount}개 이미지 다운로드를 시작합니다 (하드디스크 저장)`);

    const cleanId = (productData.productId || 'product').replace(/[^a-zA-Z0-9_-]/g, '');
    let delay = 0;

    // Download main images
    mainImgs.forEach((imgUrl, idx) => {
      setTimeout(() => {
        const ext = imgUrl.includes('.png') ? 'png' : imgUrl.includes('.webp') ? 'webp' : 'jpg';
        triggerDownload(imgUrl, `coupang_${cleanId}_main_${idx + 1}.${ext}`);
      }, delay);
      delay += 250;
    });

    // Download detail images
    detailImgs.forEach((imgUrl, idx) => {
      setTimeout(() => {
        const ext = imgUrl.includes('.png') ? 'png' : imgUrl.includes('.webp') ? 'webp' : 'jpg';
        triggerDownload(imgUrl, `coupang_${cleanId}_detail_${idx + 1}.${ext}`);
      }, delay);
      delay += 250;
    });
  }

  const SNSExporter = {
    isContextValid,
    showToast,
    triggerDownload,
    saveTextAsFile,
    copyToClipboard,
    exportCSV,
    saveToSupabase,
    saveProductAsJSON,
    saveProductAsCSV,
    saveProductAsTXT,
    downloadShoppingImages
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = SNSExporter;
  }
  global.SNSExporter = SNSExporter;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

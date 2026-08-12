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

  const SNSExporter = {
    isContextValid,
    showToast,
    triggerDownload,
    saveTextAsFile,
    copyToClipboard,
    exportCSV,
    saveToSupabase
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = SNSExporter;
  }
  global.SNSExporter = SNSExporter;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

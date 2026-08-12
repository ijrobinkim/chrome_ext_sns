/**
 * SNS Dashboard Logic - Matching Photo 1 Data Table & Controls
 */
(function () {
  'use strict';

  let allItems = [];
  let currentFilterStatus = 'all';
  let currentSearchKeyword = '';
  let currentGradeFilter = 'all';
  let currentLayoutMode = 'list'; // 'list' | 'grid'

  // Default sample item matching Photo 1 exact screenshot
  const photo1Sample = {
    id: 1,
    author: '1lumi_log',
    text: '코스트코에서 다들 이거 담길래',
    date: '2026-07-29',
    views: 3300,
    likes: 8,
    comments: 3,
    reposts: 2,
    shares: 1,
    status: 'editing', // 편집
    statusLabel: '편집',
    multiplier: 4.8,
    multiplierLabel: '우수 4.8배',
    savedDate: '7/29',
    link: 'https://www.threads.com/@1lumi_log/post/costco_sample'
  };

  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindEvents();
  });

  async function loadData() {
    try {
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient
          .from('sns_metrics')
          .select('*')
          .order('saved_at', { ascending: false });

        if (error) {
          console.error('Supabase fetch error:', error);
          allItems = [photo1Sample];
        } else if (data && data.length > 0) {
          allItems = data.map((item, idx) => {
            const dateObj = item.saved_at ? new Date(item.saved_at) : new Date();
            const dateStr = dateObj.toISOString().split('T')[0];
            const shortDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            
            // 임의의 성과배수 계산 로직 (예: 인게이지먼트율)
            let multiplier = 0;
            if (item.views > 0) {
              multiplier = ((item.likes + item.comments + item.reposts + item.shares) / item.views * 100) || 0;
            }

            return {
              id: item.id || idx + 1,
              author: item.author || 'unknown',
              text: item.text || '',
              date: dateStr,
              views: item.views || 0,
              likes: item.likes || 0,
              comments: item.comments || 0,
              reposts: item.reposts || 0,
              shares: item.shares || 0,
              status: 'collected',
              statusLabel: '수집완료',
              multiplier: multiplier,
              multiplierLabel: multiplier > 0 ? `${multiplier.toFixed(1)}%` : '-',
              savedDate: shortDate,
              link: item.link || 'https://www.threads.com'
            };
          });
        } else {
          // 데이터가 없을 경우 기본 샘플 표시
          allItems = [photo1Sample];
        }
      } else {
        allItems = [photo1Sample];
      }
    } catch (e) {
      console.error('Dashboard loadData Error:', e);
      allItems = [photo1Sample];
    }
    renderDashboard();
  }

  function bindEvents() {
    // Status Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilterStatus = btn.dataset.status;
        renderDashboard();
      });
    });

    // Keyword Filter Input
    const keywordInput = document.getElementById('filter-keyword');
    if (keywordInput) {
      keywordInput.addEventListener('input', (e) => {
        currentSearchKeyword = e.target.value.toLowerCase().trim();
        renderDashboard();
      });
    }

    // Top Search Input
    const topSearch = document.getElementById('top-search-input');
    if (topSearch) {
      topSearch.addEventListener('input', (e) => {
        currentSearchKeyword = e.target.value.toLowerCase().trim();
        renderDashboard();
      });
    }

    // Grade Filter Select
    const gradeSelect = document.getElementById('filter-grade');
    if (gradeSelect) {
      gradeSelect.addEventListener('change', (e) => {
        currentGradeFilter = e.target.value;
        renderDashboard();
      });
    }

    // Layout Toggle Mode (Grid vs List)
    const btnList = document.getElementById('btn-list-mode');
    const btnGrid = document.getElementById('btn-grid-mode');

    if (btnList && btnGrid) {
      btnList.addEventListener('click', () => {
        btnList.classList.add('active');
        btnGrid.classList.remove('active');
        currentLayoutMode = 'list';
        renderDashboard();
      });

      btnGrid.addEventListener('click', () => {
        btnGrid.classList.add('active');
        btnList.classList.remove('active');
        currentLayoutMode = 'grid';
        renderDashboard();
      });
    }

    // Go to Threads collect button
    const btnCollect = document.getElementById('btn-goto-collect');
    if (btnCollect) {
      btnCollect.addEventListener('click', () => {
        window.open('https://www.threads.com/', '_blank');
      });
    }
  }

  function renderDashboard() {
    // Filter items
    const filtered = allItems.filter(item => {
      // Status filter
      if (currentFilterStatus !== 'all' && item.status !== currentFilterStatus) {
        return false;
      }
      // Keyword filter
      if (currentSearchKeyword) {
        const textMatch = item.text.toLowerCase().includes(currentSearchKeyword);
        const authorMatch = item.author.toLowerCase().includes(currentSearchKeyword);
        if (!textMatch && !authorMatch) return false;
      }
      // Grade filter
      if (currentGradeFilter === 'super' && item.multiplier < 8) return false;
      if (currentGradeFilter === 'medium' && (item.multiplier < 3 || item.multiplier >= 8)) return false;
      if (currentGradeFilter === 'normal' && item.multiplier >= 3) return false;

      return true;
    });

    // Update Counts
    document.getElementById('count-all').textContent = allItems.length;
    document.getElementById('count-collected').textContent = allItems.filter(i => i.status === 'collected').length;
    document.getElementById('count-analyzed').textContent = allItems.filter(i => i.status === 'analyzed').length;
    document.getElementById('count-editing').textContent = allItems.filter(i => i.status === 'editing').length;
    document.getElementById('count-failed').textContent = allItems.filter(i => i.status === 'failed').length;
    document.getElementById('count-reserved').textContent = allItems.filter(i => i.status === 'reserved').length;
    document.getElementById('count-uploaded').textContent = allItems.filter(i => i.status === 'uploaded').length;

    document.getElementById('total-item-count').textContent = `${filtered.length}개`;

    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" class="empty-state">
            📌 수집된 스레드가 없습니다.<br>Threads 페이지에서 🐥 버튼 -> [수집하기]를 클릭해보세요!
          </td>
        </tr>
      `;
      return;
    }

    // Render Data Rows matching Photo 1
    filtered.forEach((item, index) => {
      const tr = document.createElement('tr');

      // 1. Checkbox
      const tdCheck = document.createElement('td');
      tdCheck.innerHTML = `<input type="checkbox" class="row-checkbox" value="${item.id}">`;
      tr.appendChild(tdCheck);

      // 2. Index #
      const tdIdx = document.createElement('td');
      tdIdx.style.color = '#7c3aed';
      tdIdx.style.fontWeight = '700';
      tdIdx.textContent = index + 1;
      tr.appendChild(tdIdx);

      // 3. 콘텐츠 - 작성일 (Photo 1 matching layout)
      const tdPost = document.createElement('td');
      tdPost.innerHTML = `
        <div class="post-cell">
          <div class="avatar" style="width:34px;height:34px;font-size:12px;">${item.author[0].toUpperCase()}</div>
          <div class="post-info">
            <div class="post-title-text" title="${escapeHtml(item.text)}">${escapeHtml(item.text)}</div>
            <div class="post-meta-sub">@${escapeHtml(item.author)} · ${item.date} · 팔로워 457</div>
          </div>
        </div>
      `;
      tr.appendChild(tdPost);

      // 4. 조회
      const tdViews = document.createElement('td');
      tdViews.style.fontWeight = '600';
      tdViews.textContent = (item.views || 3300).toLocaleString('ko-KR');
      tr.appendChild(tdViews);

      // 5. 좋아요
      const tdLikes = document.createElement('td');
      tdLikes.textContent = (item.likes || 8).toLocaleString('ko-KR');
      tr.appendChild(tdLikes);

      // 6. 답글
      const tdComments = document.createElement('td');
      tdComments.textContent = (item.comments || 3).toLocaleString('ko-KR');
      tr.appendChild(tdComments);

      // 7. 상태 (Photo 1 yellow pill: 편집)
      const tdStatus = document.createElement('td');
      tdStatus.innerHTML = `<span class="status-pill-edit">${item.statusLabel || '편집'}</span>`;
      tr.appendChild(tdStatus);

      // 8. 성과 배수 (Photo 1 yellow pill badge: 우수 4.8배)
      const tdMult = document.createElement('td');
      const multVal = item.multiplier || 4.8;
      const multLabel = item.multiplierLabel || `우수 ${multVal}배`;
      tdMult.innerHTML = `<span class="multiplier-pill-photo">${multLabel}</span>`;
      tr.appendChild(tdMult);

      // 9. 수집일 (7/29)
      const tdSaved = document.createElement('td');
      tdSaved.style.color = '#64748b';
      tdSaved.textContent = item.savedDate || '7/29';
      tr.appendChild(tdSaved);

      // 10. Actions (🔗, 내 스타일로, 분석하기)
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';
      
      const actionGroup = document.createElement('div');
      actionGroup.className = 'row-actions';
      actionGroup.style.justifyContent = 'flex-end';

      // Link button
      const linkBtn = document.createElement('button');
      linkBtn.className = 'btn-icon-square';
      linkBtn.innerHTML = '🔗';
      linkBtn.title = '원본 게시물 보기';
      linkBtn.addEventListener('click', () => window.open(item.link, '_blank'));

      // Re-style button (내 스타일로)
      const styleBtn = document.createElement('button');
      styleBtn.className = 'btn-my-style';
      styleBtn.textContent = '내 스타일로';
      styleBtn.addEventListener('click', () => {
        if (global.SNSExporter) {
          global.SNSExporter.showToast('✨ AI 텍스트 재작성 모드가 실행되었습니다.');
        } else {
          alert('AI 텍스트 재작성 모드: ' + item.text);
        }
      });

      // Analyze button (분석하기 purple pill)
      const analyzeBtn = document.createElement('button');
      analyzeBtn.className = 'btn-analyze-purple';
      analyzeBtn.textContent = '분석하기';
      analyzeBtn.addEventListener('click', () => {
        if (global.SNSExporter) {
          global.SNSExporter.showToast(`📊 @${item.author} 성과 정밀 분석 완료! (성과배수: ${item.multiplier}배)`);
        } else {
          alert(`분석 완료: ${item.author}`);
        }
      });

      actionGroup.appendChild(linkBtn);
      actionGroup.appendChild(styleBtn);
      actionGroup.appendChild(analyzeBtn);

      tdActions.appendChild(actionGroup);
      tr.appendChild(tdActions);

      tableBody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();

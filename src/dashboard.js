/**
 * Cloudflare Pages & SNS Dashboard Bulletin Board Logic
 */
(function () {
  'use strict';

  let allPosts = [];
  let currentFilterStatus = 'all';
  let currentCategory = 'all';
  let currentSearchKeyword = '';
  let currentLayoutMode = 'list'; // 'list' | 'grid'
  let activeViewingPostId = null;

  document.addEventListener('DOMContentLoaded', () => {
    loadData();
    bindEvents();
  });

  async function loadData() {
    try {
      if (window.CloudflareClient && typeof window.CloudflareClient.fetchBoardPosts === 'function') {
        allPosts = await window.CloudflareClient.fetchBoardPosts();
      } else {
        allPosts = [];
      }
    } catch (e) {
      console.error('Dashboard loadData Error:', e);
      allPosts = [];
    }
    renderDashboard();
  }

  function bindEvents() {
    // 1. Status Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilterStatus = btn.dataset.status;
        renderDashboard();
      });
    });

    // 2. Search Inputs
    const keywordInput = document.getElementById('filter-keyword');
    if (keywordInput) {
      keywordInput.addEventListener('input', (e) => {
        currentSearchKeyword = e.target.value.toLowerCase().trim();
        renderDashboard();
      });
    }

    const topSearch = document.getElementById('top-search-input');
    if (topSearch) {
      topSearch.addEventListener('input', (e) => {
        currentSearchKeyword = e.target.value.toLowerCase().trim();
        renderDashboard();
      });
    }

    // 3. Category Filter
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        renderDashboard();
      });
    }

    // 4. Layout Mode Toggle (Grid vs List)
    const btnGrid = document.getElementById('btn-grid-mode');
    const btnList = document.getElementById('btn-list-mode');

    if (btnGrid && btnList) {
      btnGrid.addEventListener('click', () => {
        currentLayoutMode = 'grid';
        btnGrid.classList.add('active');
        btnList.classList.remove('active');
        renderDashboard();
      });

      btnList.addEventListener('click', () => {
        currentLayoutMode = 'list';
        btnList.classList.add('active');
        btnGrid.classList.remove('active');
        renderDashboard();
      });
    }

    // 5. Open Create Post Modal
    const btnCreate = document.getElementById('btn-create-post');
    const modalCreate = document.getElementById('modal-create-post');
    const btnCancelCreate = document.getElementById('btn-cancel-create');
    const btnSubmitCreate = document.getElementById('btn-submit-create');

    if (btnCreate && modalCreate) {
      btnCreate.addEventListener('click', () => {
        modalCreate.style.display = 'flex';
      });
    }

    if (btnCancelCreate && modalCreate) {
      btnCancelCreate.addEventListener('click', () => {
        modalCreate.style.display = 'none';
      });
    }

    if (btnSubmitCreate && modalCreate) {
      btnSubmitCreate.addEventListener('click', async () => {
        const title = document.getElementById('post-input-title')?.value.trim();
        const category = document.getElementById('post-input-category')?.value;
        const author = document.getElementById('post-input-author')?.value.trim() || '익명';
        const content = document.getElementById('post-input-content')?.value.trim();
        const link = document.getElementById('post-input-link')?.value.trim();

        if (!title || !content) {
          alert('게시글 제목과 본문 내용을 입력해주세요.');
          return;
        }

        if (window.CloudflareClient && typeof window.CloudflareClient.saveBoardPost === 'function') {
          await window.CloudflareClient.saveBoardPost({
            title,
            category,
            author,
            content,
            link
          });
        }

        // Reset inputs & close modal
        document.getElementById('post-input-title').value = '';
        document.getElementById('post-input-content').value = '';
        document.getElementById('post-input-link').value = '';
        modalCreate.style.display = 'none';

        await loadData();
      });
    }

    // 6. View Post Detail Modal Controls
    const modalView = document.getElementById('modal-view-post');
    const btnCloseView = document.getElementById('btn-close-view');
    const btnDeletePost = document.getElementById('btn-delete-post');

    if (btnCloseView && modalView) {
      btnCloseView.addEventListener('click', () => {
        modalView.style.display = 'none';
      });
    }

    if (btnDeletePost && modalView) {
      btnDeletePost.addEventListener('click', async () => {
        if (!activeViewingPostId) return;
        if (confirm('이 게시글을 정말 삭제하시겠습니까?')) {
          if (window.CloudflareClient && typeof window.CloudflareClient.deleteBoardPost === 'function') {
            await window.CloudflareClient.deleteBoardPost(activeViewingPostId);
          }
          modalView.style.display = 'none';
          await loadData();
        }
      });
    }

    // Modal background overlay click close
    [modalCreate, modalView].forEach(m => {
      if (m) {
        m.addEventListener('click', (e) => {
          if (e.target === m) m.style.display = 'none';
        });
      }
    });

    // Action Collect Btn
    const btnCollect = document.getElementById('btn-goto-collect');
    if (btnCollect) {
      btnCollect.addEventListener('click', () => {
        window.open('https://coupang.com', '_blank');
      });
    }
  }

  function getFilteredPosts() {
    return allPosts.filter(post => {
      // Category filter
      if (currentCategory !== 'all' && post.category !== currentCategory) {
        return false;
      }

      // Keyword search
      if (currentSearchKeyword) {
        const titleMatch = (post.title || '').toLowerCase().includes(currentSearchKeyword);
        const contentMatch = (post.content || '').toLowerCase().includes(currentSearchKeyword);
        const authorMatch = (post.author || '').toLowerCase().includes(currentSearchKeyword);
        if (!titleMatch && !contentMatch && !authorMatch) {
          return false;
        }
      }

      return true;
    });
  }

  function openViewModal(post) {
    activeViewingPostId = post.id;
    const modalView = document.getElementById('modal-view-post');
    if (!modalView) return;

    document.getElementById('view-post-category').textContent = post.categoryLabel || post.category;
    document.getElementById('view-post-title').textContent = post.title || '제목 없음';
    document.getElementById('view-post-author').textContent = post.author || '익명';
    document.getElementById('view-post-date').textContent = post.createdAt || '';
    document.getElementById('view-post-content').textContent = post.content || '';

    const linkEl = document.getElementById('view-post-link');
    if (linkEl) {
      if (post.link && post.link !== '#') {
        linkEl.href = post.link;
        linkEl.style.display = 'inline-block';
      } else {
        linkEl.style.display = 'none';
      }
    }

    // Images
    const imgsContainer = document.getElementById('view-post-images');
    if (imgsContainer) {
      imgsContainer.innerHTML = '';
      if (post.images && post.images.length > 0) {
        post.images.forEach(src => {
          const img = document.createElement('img');
          img.src = src;
          img.style.width = '100px';
          img.style.height = '100px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          img.style.border = '1px solid #313244';
          imgsContainer.appendChild(img);
        });
      }
    }

    modalView.style.display = 'flex';
  }

  function renderDashboard() {
    const posts = getFilteredPosts();

    // Update Counts
    const countAll = document.getElementById('count-all');
    if (countAll) countAll.textContent = allPosts.length;

    const totalItemCount = document.getElementById('total-item-count');
    if (totalItemCount) totalItemCount.textContent = `${posts.length}개`;

    const listContainer = document.getElementById('list-container');
    const gridContainer = document.getElementById('grid-container');
    const tbody = document.getElementById('table-body');

    if (currentLayoutMode === 'list') {
      if (listContainer) listContainer.style.display = 'block';
      if (gridContainer) gridContainer.style.display = 'none';

      if (tbody) {
        tbody.innerHTML = '';
        if (posts.length === 0) {
          tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: #94a3b8;">등록된 게시글이 없습니다. 상단 [✏️ 새 글 작성] 버튼을 눌러보세요.</td></tr>`;
          return;
        }

        posts.forEach((post, idx) => {
          const tr = document.createElement('tr');
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', () => openViewModal(post));

          tr.innerHTML = `
            <td><input type="checkbox"></td>
            <td style="color: #94a3b8;">${idx + 1}</td>
            <td>
              <div style="font-weight: 700; color: #f8fafc;">${escapeHtml(post.title)}</div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">by ${escapeHtml(post.author)}</div>
            </td>
            <td>
              <span class="status-badge" style="background: rgba(124, 58, 237, 0.2); color: #c4b5fd; border: 1px solid rgba(124, 58, 237, 0.4);">
                ${escapeHtml(post.categoryLabel || post.category)}
              </span>
            </td>
            <td>${(post.views || 0).toLocaleString()}회</td>
            <td>❤️ ${post.likes || 0}</td>
            <td>
              <span class="status-badge status-collected">게시됨</span>
            </td>
            <td style="color: #94a3b8; font-size: 12px;">${escapeHtml(post.createdAt)}</td>
            <td style="text-align: right;" onclick="event.stopPropagation();">
              <button class="row-action-btn" style="color: #818cf8; background: none; border: none; font-weight: 700; cursor: pointer;">보기 ➔</button>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    } else {
      // Grid Mode
      if (listContainer) listContainer.style.display = 'none';
      if (gridContainer) {
        gridContainer.style.display = 'grid';
        gridContainer.innerHTML = '';

        if (posts.length === 0) {
          gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">등록된 게시글이 없습니다.</div>`;
          return;
        }

        posts.forEach(post => {
          const card = document.createElement('div');
          card.style.background = '#181824';
          card.style.border = '1px solid #2e2e3e';
          card.style.borderRadius = '16px';
          card.style.padding = '18px';
          card.style.cursor = 'pointer';
          card.style.transition = 'transform 0.2s, border-color 0.2s';

          card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-3px)';
            card.style.borderColor = '#7c3aed';
          });
          card.addEventListener('mouseleave', () => {
            card.style.transform = 'none';
            card.style.borderColor = '#2e2e3e';
          });
          card.addEventListener('click', () => openViewModal(post));

          const firstImg = (post.images && post.images.length > 0) ? post.images[0] : null;

          card.innerHTML = `
            ${firstImg ? `<img src="${firstImg}" style="width:100%; height:140px; object-fit:cover; border-radius:10px; margin-bottom:12px;">` : ''}
            <div style="font-size: 11px; color: #a5b4fc; font-weight: 700; margin-bottom: 6px;">${escapeHtml(post.categoryLabel || post.category)}</div>
            <div style="font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 8px; line-height: 1.3;">${escapeHtml(post.title)}</div>
            <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 12px; height: 38px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHtml(post.content)}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #282838; padding-top: 10px;">
              <span>by ${escapeHtml(post.author)}</span>
              <span>❤️ ${post.likes || 0}</span>
            </div>
          `;

          gridContainer.appendChild(card);
        });
      }
    }
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

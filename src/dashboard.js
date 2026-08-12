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

    // --- Blog & Threads Post Generation Modal Handling ---
    const btnCreateBlogModal = document.getElementById('btn-create-blog-modal');
    const modalBlog = document.getElementById('modal-blog-generation');
    const btnCloseBlog = document.getElementById('btn-close-blog');
    const inputApiKey = document.getElementById('gemini-api-key-input');
    const btnSaveApiKey = document.getElementById('btn-save-api-key');
    const statusMessage = document.getElementById('blog-status-message');

    // Tab buttons
    const tabBlogMode = document.getElementById('tab-blog-mode');
    const tabThreadsMode = document.getElementById('tab-threads-mode');

    // View Containers
    const containerBlogView = document.getElementById('container-blog-view');
    const containerThreadsView = document.getElementById('container-threads-view');

    // Blog Elements
    const btnGenerateBlogRun = document.getElementById('btn-generate-blog-run');
    const selectBlogStyle = document.getElementById('blog-style-select');
    const resultTitle = document.getElementById('blog-result-title');
    const resultBody = document.getElementById('blog-result-body');
    const btnCopyTitle = document.getElementById('btn-copy-blog-title');
    const btnCopyMarkdown = document.getElementById('btn-copy-blog-markdown');
    const btnCopyHTML = document.getElementById('btn-copy-blog-html');

    // Threads Elements
    const btnGenerateThreadsRun = document.getElementById('btn-generate-threads-run');
    const selectThreadsStyle = document.getElementById('threads-style-select');
    const resultThreadsMain = document.getElementById('threads-result-main');
    const resultThreadsReply = document.getElementById('threads-result-reply');
    const btnCopyThreadsMain = document.getElementById('btn-copy-threads-main');
    const btnCopyThreadsReply = document.getElementById('btn-copy-threads-reply');

    // Active mode state ('blog' or 'threads')
    let activeMode = 'blog';

    // Load saved API Key on start
    if (inputApiKey && window.AIBlogClient) {
      inputApiKey.value = window.AIBlogClient.getGeminiKey();
    }

    if (btnSaveApiKey && inputApiKey && window.AIBlogClient) {
      btnSaveApiKey.addEventListener('click', () => {
        const key = inputApiKey.value.trim();
        window.AIBlogClient.saveGeminiKey(key);
        alert('🔑 API 키가 안전하게 로컬 브라우저(localStorage)에 저장되었습니다!');
      });
    }

    // Tab switching event listeners
    if (tabBlogMode && tabThreadsMode && containerBlogView && containerThreadsView) {
      tabBlogMode.addEventListener('click', () => {
        activeMode = 'blog';
        tabBlogMode.style.background = 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)';
        tabBlogMode.style.color = '#ffffff';
        tabBlogMode.style.border = 'none';

        tabThreadsMode.style.background = '#1e1e2f';
        tabThreadsMode.style.color = '#94a3b8';
        tabThreadsMode.style.border = '1px solid #31324f';

        containerBlogView.style.display = 'flex';
        containerThreadsView.style.display = 'none';
        if (statusMessage) statusMessage.style.display = 'none';
      });

      tabThreadsMode.addEventListener('click', () => {
        activeMode = 'threads';
        tabThreadsMode.style.background = 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)';
        tabThreadsMode.style.color = '#ffffff';
        tabThreadsMode.style.border = 'none';

        tabBlogMode.style.background = '#1e1e2f';
        tabBlogMode.style.color = '#94a3b8';
        tabBlogMode.style.border = '1px solid #31324f';

        containerThreadsView.style.display = 'flex';
        containerBlogView.style.display = 'none';
        if (statusMessage) statusMessage.style.display = 'none';
      });
    }

    if (btnCreateBlogModal && modalBlog && modalView) {
      btnCreateBlogModal.addEventListener('click', () => {
        // Hide view modal and show blog modal
        modalView.style.display = 'none';
        modalBlog.style.display = 'flex';
        
        // Reset status message
        if (statusMessage) statusMessage.style.display = 'none';

        // Retrieve current post data
        const currentPost = allPosts.find(p => String(p.id) === String(activeViewingPostId));
        if (currentPost) {
          // Pre-populate custom link
          const inputPartnersLink = document.getElementById('coupang-partners-link-input');
          if (inputPartnersLink) {
            inputPartnersLink.value = currentPost.coupangPartnersLink || '';
          }
          
          // Pre-populate Blog fields
          if (resultTitle) resultTitle.value = currentPost.generatedBlogTitle || '';
          if (resultBody) resultBody.value = currentPost.generatedBlogBody || '';
          
          // Pre-populate Threads fields
          if (resultThreadsMain) resultThreadsMain.value = currentPost.generatedThreadsMain || '';
          if (resultThreadsReply) resultThreadsReply.value = currentPost.generatedThreadsReply || '';

          // Show/Hide copy buttons based on existing content
          if (btnCopyTitle) btnCopyTitle.style.display = currentPost.generatedBlogTitle ? 'inline-flex' : 'none';
          if (btnCopyMarkdown) btnCopyMarkdown.style.display = currentPost.generatedBlogBody ? 'inline-flex' : 'none';
          if (btnCopyHTML) btnCopyHTML.style.display = currentPost.generatedBlogBody ? 'inline-flex' : 'none';
          if (btnCopyThreadsMain) btnCopyThreadsMain.style.display = currentPost.generatedThreadsMain ? 'inline-flex' : 'none';
          if (btnCopyThreadsReply) btnCopyThreadsReply.style.display = currentPost.generatedThreadsReply ? 'inline-flex' : 'none';
        } else {
          // Fallback reset
          if (resultTitle) resultTitle.value = '';
          if (resultBody) resultBody.value = '';
          if (resultThreadsMain) resultThreadsMain.value = '';
          if (resultThreadsReply) resultThreadsReply.value = '';

          if (btnCopyTitle) btnCopyTitle.style.display = 'none';
          if (btnCopyMarkdown) btnCopyMarkdown.style.display = 'none';
          if (btnCopyHTML) btnCopyHTML.style.display = 'none';
          if (btnCopyThreadsMain) btnCopyThreadsMain.style.display = 'none';
          if (btnCopyThreadsReply) btnCopyThreadsReply.style.display = 'none';
        }

        // Reset tab to default (Blog)
        if (tabBlogMode) tabBlogMode.click();
      });
    }

    if (btnCloseBlog && modalBlog) {
      btnCloseBlog.addEventListener('click', () => {
        modalBlog.style.display = 'none';
        // Return to view modal
        if (modalView) modalView.style.display = 'flex';
      });
    }

    // Modal background close for Blog Modal
    if (modalBlog) {
      modalBlog.addEventListener('click', (e) => {
        if (e.target === modalBlog) {
          modalBlog.style.display = 'none';
          if (modalView) modalView.style.display = 'flex';
        }
      });
    }

    // Run Blog Generator
    if (btnGenerateBlogRun && window.AIBlogClient) {
      btnGenerateBlogRun.addEventListener('click', async () => {
        if (!activeViewingPostId) return;
        const currentPost = allPosts.find(p => String(p.id) === String(activeViewingPostId));
        if (!currentPost) {
          alert('상품 정보 데이터를 찾을 수 없습니다.');
          return;
        }

        const apiKey = window.AIBlogClient.getGeminiKey();
        if (!apiKey) {
          alert('⚠️ Google Gemini API Key를 먼저 입력하고 저장해 주세요!');
          if (inputApiKey) inputApiKey.focus();
          return;
        }

        // Show status
        if (statusMessage) {
          statusMessage.style.background = 'rgba(59, 130, 246, 0.1)';
          statusMessage.style.border = '1px solid rgba(59, 130, 246, 0.3)';
          statusMessage.style.color = '#93c5fd';
          statusMessage.textContent = '🤖 AI 분석 및 원고 작성을 진행 중입니다... (약 5~10초 소요)';
          statusMessage.style.display = 'block';
        }
        if (btnGenerateBlogRun) btnGenerateBlogRun.disabled = true;

        try {
          const style = selectBlogStyle ? selectBlogStyle.value : 'review';
          const inputPartnersLink = document.getElementById('coupang-partners-link-input');
          const customLink = inputPartnersLink ? inputPartnersLink.value.trim() : '';

          const result = await window.AIBlogClient.generatePost(currentPost, style, customLink);
          
          if (resultTitle) resultTitle.value = result.title;
          if (resultBody) resultBody.value = result.body;

          // Show copy buttons
          if (btnCopyTitle) btnCopyTitle.style.display = 'inline-flex';
          if (btnCopyMarkdown) btnCopyMarkdown.style.display = 'inline-flex';
          if (btnCopyHTML) btnCopyHTML.style.display = 'inline-flex';

          // Save generated content to database/Supabase
          if (window.CloudflareClient && typeof window.CloudflareClient.updateBoardPost === 'function') {
            const updated = await window.CloudflareClient.updateBoardPost(activeViewingPostId, {
              generatedBlogTitle: result.title,
              generatedBlogBody: result.body,
              coupangPartnersLink: customLink
            });
            if (updated) {
              const idx = allPosts.findIndex(p => String(p.id) === String(activeViewingPostId));
              if (idx !== -1) allPosts[idx] = updated;
            }
          }

          if (statusMessage) {
            statusMessage.textContent = '✅ 원고 작성이 성공적으로 완료되었습니다!';
            statusMessage.style.background = 'rgba(16, 185, 129, 0.1)';
            statusMessage.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            statusMessage.style.color = '#34d399';
          }
        } catch (err) {
          console.error(err);
          alert(err.message);
          if (statusMessage) statusMessage.style.display = 'none';
        } finally {
          if (btnGenerateBlogRun) btnGenerateBlogRun.disabled = false;
        }
      });
    }

    // Run Threads Generator
    if (btnGenerateThreadsRun && window.AIBlogClient) {
      btnGenerateThreadsRun.addEventListener('click', async () => {
        if (!activeViewingPostId) return;
        const currentPost = allPosts.find(p => String(p.id) === String(activeViewingPostId));
        if (!currentPost) {
          alert('상품 정보 데이터를 찾을 수 없습니다.');
          return;
        }

        const apiKey = window.AIBlogClient.getGeminiKey();
        if (!apiKey) {
          alert('⚠️ Google Gemini API Key를 먼저 입력하고 저장해 주세요!');
          if (inputApiKey) inputApiKey.focus();
          return;
        }

        // Show status
        if (statusMessage) {
          statusMessage.style.background = 'rgba(59, 130, 246, 0.1)';
          statusMessage.style.border = '1px solid rgba(59, 130, 246, 0.3)';
          statusMessage.style.color = '#93c5fd';
          statusMessage.textContent = '🤖 AI 분석 및 스레드 바이럴 텍스트 작성 중... (약 5초 소요)';
          statusMessage.style.display = 'block';
        }
        if (btnGenerateThreadsRun) btnGenerateThreadsRun.disabled = true;

        try {
          const style = selectThreadsStyle ? selectThreadsStyle.value : 'hook';
          const inputPartnersLink = document.getElementById('coupang-partners-link-input');
          const customLink = inputPartnersLink ? inputPartnersLink.value.trim() : '';

          const result = await window.AIBlogClient.generateThreadsPost(currentPost, style, customLink);
          
          if (resultThreadsMain) resultThreadsMain.value = result.main;
          if (resultThreadsReply) resultThreadsReply.value = result.reply;

          // Show copy buttons
          if (btnCopyThreadsMain) btnCopyThreadsMain.style.display = 'inline-flex';
          if (btnCopyThreadsReply) btnCopyThreadsReply.style.display = 'inline-flex';

          // Save generated content to database/Supabase
          if (window.CloudflareClient && typeof window.CloudflareClient.updateBoardPost === 'function') {
            const updated = await window.CloudflareClient.updateBoardPost(activeViewingPostId, {
              generatedThreadsMain: result.main,
              generatedThreadsReply: result.reply,
              coupangPartnersLink: customLink
            });
            if (updated) {
              const idx = allPosts.findIndex(p => String(p.id) === String(activeViewingPostId));
              if (idx !== -1) allPosts[idx] = updated;
            }
          }

          if (statusMessage) {
            statusMessage.textContent = '✅ 스레드 포스팅 작성 완료!';
            statusMessage.style.background = 'rgba(16, 185, 129, 0.1)';
            statusMessage.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            statusMessage.style.color = '#34d399';
          }
        } catch (err) {
          console.error(err);
          alert(err.message);
          if (statusMessage) statusMessage.style.display = 'none';
        } finally {
          if (btnGenerateThreadsRun) btnGenerateThreadsRun.disabled = false;
        }
      });
    }

    // Copy Handlers for Blog
    if (btnCopyTitle && resultTitle) {
      btnCopyTitle.addEventListener('click', () => {
        navigator.clipboard.writeText(resultTitle.value).then(() => {
          alert('📋 블로그 제목이 클립보드에 복사되었습니다!');
        });
      });
    }

    if (btnCopyMarkdown && resultBody) {
      btnCopyMarkdown.addEventListener('click', () => {
        navigator.clipboard.writeText(resultBody.value).then(() => {
          alert('📋 마크다운 포맷 본문이 클립보드에 복사되었습니다!');
        });
      });
    }

    if (btnCopyHTML && resultBody && resultTitle && window.AIBlogClient) {
      btnCopyHTML.addEventListener('click', () => {
        const mdText = resultBody.value;
        const htmlText = window.AIBlogClient.mdToHtml(mdText);
        
        // Rich Text copy
        const blobHTML = new Blob([htmlText], { type: 'text/html' });
        const blobText = new Blob([mdText], { type: 'text/plain' });
        const data = [new ClipboardItem({
          'text/html': blobHTML,
          'text/plain': blobText
        })];

        navigator.clipboard.write(data).then(() => {
          alert('✨ 서식이 유지된 본문이 복사되었습니다!\n블로그 에디터(네이버, 티스토리 등) 본문 영역에 Ctrl+V로 붙여넣기 하세요.');
        }).catch(err => {
          console.error(err);
          // Fallback to text copy
          navigator.clipboard.writeText(mdText).then(() => {
            alert('📋 마크다운 텍스트 복사로 대체되었습니다.');
          });
        });
      });
    }

    // Copy Handlers for Threads
    if (btnCopyThreadsMain && resultThreadsMain) {
      btnCopyThreadsMain.addEventListener('click', () => {
        navigator.clipboard.writeText(resultThreadsMain.value).then(() => {
          alert('📋 스레드 본문(노링크 후킹글)이 클립보드에 복사되었습니다!');
        });
      });
    }

    if (btnCopyThreadsReply && resultThreadsReply) {
      btnCopyThreadsReply.addEventListener('click', () => {
        navigator.clipboard.writeText(resultThreadsReply.value).then(() => {
          alert('📋 스레드 댓글(링크+공정위 문구)이 클립보드에 복사되었습니다!');
        });
      });
    }

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
    // Look up the freshest post reference from allPosts by ID to bypass stale render closures
    const latestPost = allPosts.find(p => String(p.id) === String(post.id)) || post;
    activeViewingPostId = latestPost.id;
    
    const modalView = document.getElementById('modal-view-post');
    if (!modalView) return;

    document.getElementById('view-post-category').textContent = latestPost.categoryLabel || latestPost.category;
    document.getElementById('view-post-title').textContent = latestPost.title || '제목 없음';
    document.getElementById('view-post-author').textContent = latestPost.author || '익명';
    document.getElementById('view-post-date').textContent = latestPost.createdAt || '';
    document.getElementById('view-post-content').textContent = latestPost.content || '';

    const linkEl = document.getElementById('view-post-link');
    if (linkEl) {
      if (latestPost.link && latestPost.link !== '#') {
        linkEl.href = latestPost.link;
        linkEl.style.display = 'inline-block';
      } else {
        linkEl.style.display = 'none';
      }
    }

    // Dynamic Price Section
    let priceSection = document.getElementById('view-post-price-section');
    if (!priceSection) {
      priceSection = document.createElement('div');
      priceSection.id = 'view-post-price-section';
      priceSection.style.fontSize = '20px';
      priceSection.style.fontWeight = '800';
      priceSection.style.color = '#f97316';
      priceSection.style.marginBottom = '12px';
      
      const contentEl = document.getElementById('view-post-content');
      contentEl.parentNode.insertBefore(priceSection, contentEl);
    }

    if (latestPost.price && latestPost.price !== '-') {
      priceSection.textContent = `판매가: ${latestPost.price}`;
      priceSection.style.display = 'block';
    } else {
      priceSection.style.display = 'none';
    }

    // Dynamic Options Section
    let optionsSection = document.getElementById('view-post-options-section');
    if (!optionsSection) {
      optionsSection = document.createElement('div');
      optionsSection.id = 'view-post-options-section';
      optionsSection.style.fontSize = '12px';
      optionsSection.style.color = '#a5b4fc';
      optionsSection.style.background = '#1e1e2f';
      optionsSection.style.border = '1px solid #31324f';
      optionsSection.style.padding = '10px 14px';
      optionsSection.style.borderRadius = '8px';
      optionsSection.style.marginBottom = '12px';
      
      const imgsEl = document.getElementById('view-post-images');
      imgsEl.parentNode.insertBefore(optionsSection, imgsEl);
    }

    if (latestPost.options && latestPost.options.length > 0) {
      optionsSection.innerHTML = `<b>선택 옵션:</b><br>${latestPost.options.join(', ')}`;
      optionsSection.style.display = 'block';
    } else {
      optionsSection.style.display = 'none';
    }

    // Images
    const imgsContainer = document.getElementById('view-post-images');
    if (imgsContainer) {
      imgsContainer.innerHTML = '';
      if (latestPost.images && latestPost.images.length > 0) {
        latestPost.images.forEach(src => {
          const img = document.createElement('img');
          img.src = src;
          img.style.width = '120px';
          img.style.height = '120px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          img.style.border = '1px solid #313244';
          img.style.cursor = 'zoom-in';
          img.title = '클릭하여 원본 보기';
          img.addEventListener('click', () => {
            window.open(src, '_blank');
          });
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

          const hasThumbnail = post.images && post.images.length > 0;
          const firstImg = hasThumbnail ? post.images[0] : '';

          tr.innerHTML = `
            <td><input type="checkbox"></td>
            <td style="color: #94a3b8;">${idx + 1}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                ${hasThumbnail ? `<img src="${firstImg}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 6px; border: 1px solid #313244; flex-shrink: 0;">` : ''}
                <div style="overflow: hidden; text-overflow: ellipsis;">
                  <div style="font-weight: 700; color: #f8fafc; font-size: 14px;">${escapeHtml(post.title)}</div>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 3px; display: flex; gap: 12px;">
                    <span>by ${escapeHtml(post.author)}</span>
                    ${post.price && post.price !== '-' ? `<span style="color: #f97316; font-weight: 700;">🏷️ ${escapeHtml(post.price)}</span>` : ''}
                  </div>
                </div>
              </div>
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
            ${firstImg ? `<img src="${firstImg}" style="width:100%; height:160px; object-fit:cover; border-radius:12px; margin-bottom:12px; border: 1px solid #2e2e3e;">` : ''}
            <div style="font-size: 11px; color: #a5b4fc; font-weight: 700; margin-bottom: 6px;">${escapeHtml(post.categoryLabel || post.category)}</div>
            <div style="font-size: 15px; font-weight: 800; color: #fff; margin-bottom: 6px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(post.title)}</div>
            ${post.price && post.price !== '-' ? `<div style="font-size: 16px; font-weight: 800; color: #f97316; margin-bottom: 8px;">${escapeHtml(post.price)}</div>` : ''}
            <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 12px; height: 38px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4;">${escapeHtml(post.content)}</div>
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

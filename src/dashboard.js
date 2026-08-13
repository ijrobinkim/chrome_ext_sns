/**
 * Cloudflare Pages & SNS Dashboard Bulletin Board Logic
 */
(function () {
  'use strict';

  let allPosts = [];
  let currentFilterStatus = 'all';
  let currentCategory = 'sns';
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
    // 0. Sidebar Navigation
    const navShopping = document.getElementById('nav-shopping');
    const navBoard = document.getElementById('nav-board');
    const navPublish = document.getElementById('nav-publish');
    const navRemoteArchive = document.getElementById('nav-remote-archive');
    const boardView = document.getElementById('board-view');
    const publishView = document.getElementById('publish-view');

    if (navBoard && navPublish && boardView && publishView) {
      const resetNavActive = () => {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
      };

      if (navShopping) {
        navShopping.addEventListener('click', async (e) => {
          e.preventDefault();
          resetNavActive();
          navShopping.classList.add('active');
          boardView.style.display = 'block';
          publishView.style.display = 'none';

          const catSelect = document.getElementById('filter-category');
          if (catSelect) {
            catSelect.value = 'shopping';
            currentCategory = 'shopping';
          }
          await loadData();
        });
      }

      navBoard.addEventListener('click', async (e) => {
        e.preventDefault();
        resetNavActive();
        navBoard.classList.add('active');
        boardView.style.display = 'block';
        publishView.style.display = 'none';
        
        const catSelect = document.getElementById('filter-category');
        if (catSelect) {
          catSelect.value = 'sns';
          currentCategory = 'sns';
        }
        await loadData();
      });

      navPublish.addEventListener('click', (e) => {
        e.preventDefault();
        resetNavActive();
        navPublish.classList.add('active');
        publishView.style.display = 'block';
        boardView.style.display = 'none';
      });

      if (navRemoteArchive) {
        navRemoteArchive.addEventListener('click', async (e) => {
          e.preventDefault();
          resetNavActive();
          navRemoteArchive.classList.add('active');
          boardView.style.display = 'block';
          publishView.style.display = 'none';

          const catSelect = document.getElementById('filter-category');
          if (catSelect) {
            catSelect.value = 'shopping_remote';
            currentCategory = 'shopping_remote';
          }
          await loadData();
        });
      }
    }

    // 0.5. Remote Publish Logic
    const btnFetchGenerate = document.getElementById('btn-fetch-generate');
    if (btnFetchGenerate) {
      btnFetchGenerate.addEventListener('click', async () => {
        const btnSaveRemotePost = document.getElementById('btn-save-remote-post');
        if (btnSaveRemotePost) {
          btnSaveRemotePost.style.display = 'none';
          btnSaveRemotePost.textContent = '💾 생성된 원고 수집함에 저장하기';
          btnSaveRemotePost.disabled = false;
        }

        const urlInput = document.getElementById('remote-url-input');
        const rawUrl = urlInput ? urlInput.value.trim() : '';
        const urlMatch = rawUrl.match(/https?:\/\/[^\s]+/);
        if (!urlMatch) {
          alert('상품 링크를 입력해주세요. (예: https://toss.im/...)');
          return;
        }
        const url = urlMatch[0];

        const apiKey = window.AIBlogClient ? window.AIBlogClient.getGeminiKey() : '';
        if (!apiKey) {
          alert('⚠️ Google Gemini API Key가 설정되어 있지 않습니다. 보드 뷰에서 [새 글 작성/생성] 버튼을 눌러 API 키를 먼저 설정해주세요.');
          return;
        }

        const statusText = document.getElementById('remote-status-text');
        if (statusText) {
          statusText.style.display = 'block';
          statusText.textContent = '⏳ 링크를 분석하고 원고를 작성하는 중입니다... (최대 1~2분 소요)';
          statusText.style.color = '#94a3b8';
        }
        btnFetchGenerate.disabled = true;

        try {
          if (!window.RemoteParser) throw new Error('RemoteParser 모듈을 불러올 수 없습니다.');
          
          // 1. Fetch & Parse
          const productData = await window.RemoteParser.parseUrl(url);

           const customLink = document.getElementById('remote-partners-link-input')?.value.trim() || '';

          // 2. Generate Blog Post
          const blogResult = await window.AIBlogClient.generatePost(productData, 'review', customLink || url);
          const remoteBlogTitle = document.getElementById('remote-blog-title-result');
          const remoteBlogBody = document.getElementById('remote-blog-result');
          if (remoteBlogTitle) remoteBlogTitle.value = blogResult.title || '제목 없음';
          if (remoteBlogBody) remoteBlogBody.value = blogResult.body || '';

          // 3. Generate Threads Post
          const threadsResult = await window.AIBlogClient.generateThreadsPost(productData, 'hook', customLink || url);
          const remoteThreadsMain = document.getElementById('remote-threads-main-result');
          const remoteThreadsReply = document.getElementById('remote-threads-reply-result');
          if (remoteThreadsMain) remoteThreadsMain.value = threadsResult.main || '';
          if (remoteThreadsReply) remoteThreadsReply.value = threadsResult.reply || '';

          // Store for saving later
          window.lastGeneratedRemotePost = {
            title: blogResult.title || '원격 발행 블로그 글',
            category: 'shopping_remote',
            author: productData.author || '익명',
            content: `[블로그 제목]\n${blogResult.title}\n\n[블로그 본문]\n${blogResult.body}\n\n[스레드 본문]\n${threadsResult.main}\n\n[스레드 댓글]\n${threadsResult.reply}`,
            link: url,
            images: productData.images || [],
            generatedBlogTitle: blogResult.title || '',
            generatedBlogBody: blogResult.body || '',
            generatedThreadsMain: threadsResult.main || '',
            generatedThreadsReply: threadsResult.reply || '',
            coupangPartnersLink: customLink
          };

          // Render Image Gallery
          const imgContainer = document.getElementById('remote-images-container');
          const imgGallery = document.getElementById('remote-images-gallery');
          if (imgContainer && imgGallery) {
            imgGallery.innerHTML = '';
            if (productData.images && productData.images.length > 0) {
              imgContainer.style.display = 'block';
              productData.images.forEach(imgUrl => {
                const imgEl = document.createElement('img');
                imgEl.src = imgUrl;
                imgEl.style.width = '100px';
                imgEl.style.height = '100px';
                imgEl.style.objectFit = 'cover';
                imgEl.style.borderRadius = '8px';
                imgEl.style.cursor = 'pointer';
                imgEl.style.border = '2px solid #313244';
                imgEl.style.transition = 'transform 0.2s';
                imgEl.addEventListener('mouseenter', () => imgEl.style.transform = 'scale(1.05)');
                imgEl.addEventListener('mouseleave', () => imgEl.style.transform = 'scale(1)');
                
                imgEl.addEventListener('click', () => {
                  const lightbox = document.getElementById('image-lightbox');
                  const lightboxImg = document.getElementById('lightbox-img');
                  if (lightbox && lightboxImg) {
                    lightboxImg.src = imgUrl;
                    lightbox.style.display = 'flex';
                    lightbox.dataset.currentUrl = imgUrl;
                  }
                });
                imgGallery.appendChild(imgEl);
              });
            } else {
              imgContainer.style.display = 'none';
            }
          }

          if (statusText) {
            statusText.textContent = '✅ 분석 완료 및 보관함에 자동으로 저장되었습니다!';
            statusText.style.color = '#34d399';
          }
          
          document.getElementById('btn-copy-remote-blog-title').style.display = 'inline-flex';
          document.getElementById('btn-copy-remote-blog-body').style.display = 'inline-flex';
          document.getElementById('btn-copy-remote-threads-main').style.display = 'inline-flex';
          document.getElementById('btn-copy-remote-threads-reply').style.display = 'inline-flex';
          
          const btnSaveRemotePost = document.getElementById('btn-save-remote-post');
          if (btnSaveRemotePost) {
            btnSaveRemotePost.style.display = 'inline-flex';
            btnSaveRemotePost.textContent = '✅ 보관함 자동 저장됨';
            btnSaveRemotePost.disabled = true;
          }

          // Auto save to database/localStorage
          if (window.CloudflareClient && typeof window.CloudflareClient.saveBoardPost === 'function') {
            try {
              const saved = await window.CloudflareClient.saveBoardPost(window.lastGeneratedRemotePost);
              if (saved) {
                window.lastGeneratedRemotePost.id = saved.id;
              }
              await loadData();
            } catch (saveErr) {
              console.warn('[AutoSave] Failed:', saveErr);
            }
          }

        } catch (err) {
          console.error(err);
          alert('오류 발생: ' + err.message);
          if (statusText) {
            statusText.textContent = '❌ 분석 중 오류가 발생했습니다.';
            statusText.style.color = '#ef4444';
          }
        } finally {
          btnFetchGenerate.disabled = false;
        }
      });
    }

    const btnCopyRemoteBlogTitle = document.getElementById('btn-copy-remote-blog-title');
    if (btnCopyRemoteBlogTitle) {
      btnCopyRemoteBlogTitle.addEventListener('click', () => {
        const text = document.getElementById('remote-blog-title-result').value;
        navigator.clipboard.writeText(text).then(() => alert('📋 제목이 복사되었습니다!'));
      });
    }

    const btnCopyRemoteBlogBody = document.getElementById('btn-copy-remote-blog-body');
    if (btnCopyRemoteBlogBody) {
      btnCopyRemoteBlogBody.addEventListener('click', () => {
        const text = document.getElementById('remote-blog-result').value;
        if (window.AIBlogClient) {
          const htmlText = window.AIBlogClient.mdToHtml(text);
          const blobHTML = new Blob([htmlText], { type: 'text/html' });
          const blobText = new Blob([text], { type: 'text/plain' });
          const data = [new ClipboardItem({ 'text/html': blobHTML, 'text/plain': blobText })];
          navigator.clipboard.write(data).then(() => {
            alert('✨ 서식이 유지된 블로그 본문이 복사되었습니다!');
          }).catch(() => {
            navigator.clipboard.writeText(text).then(() => alert('📋 마크다운 텍스트 복사로 대체되었습니다.'));
          });
        }
      });
    }

    const btnCopyRemoteThreadsMain = document.getElementById('btn-copy-remote-threads-main');
    if (btnCopyRemoteThreadsMain) {
      btnCopyRemoteThreadsMain.addEventListener('click', () => {
        const text = document.getElementById('remote-threads-main-result').value;
        navigator.clipboard.writeText(text).then(() => alert('📋 스레드 본문이 복사되었습니다!'));
      });
    }

    const btnCopyRemoteThreadsReply = document.getElementById('btn-copy-remote-threads-reply');
    if (btnCopyRemoteThreadsReply) {
      btnCopyRemoteThreadsReply.addEventListener('click', () => {
        const text = document.getElementById('remote-threads-reply-result').value;
        navigator.clipboard.writeText(text).then(() => alert('📋 스레드 타래가 복사되었습니다!'));
      });
    }

    const btnSaveRemotePost = document.getElementById('btn-save-remote-post');
    if (btnSaveRemotePost) {
      btnSaveRemotePost.addEventListener('click', async () => {
        if (!window.lastGeneratedRemotePost) {
          alert('저장할 원고가 없습니다.');
          return;
        }
        
        const originalText = btnSaveRemotePost.textContent;
        btnSaveRemotePost.textContent = '⏳ 저장 중...';
        btnSaveRemotePost.disabled = true;
        
        try {
          const blogTitle = document.getElementById('remote-blog-title-result').value;
          const blogBody = document.getElementById('remote-blog-result').value;
          const threadsMain = document.getElementById('remote-threads-main-result').value;
          const threadsReply = document.getElementById('remote-threads-reply-result').value;

          window.lastGeneratedRemotePost.title = blogTitle || '원격 발행 블로그 글';
          window.lastGeneratedRemotePost.generatedBlogTitle = blogTitle;
          window.lastGeneratedRemotePost.generatedBlogBody = blogBody;
          window.lastGeneratedRemotePost.generatedThreadsMain = threadsMain;
          window.lastGeneratedRemotePost.generatedThreadsReply = threadsReply;
          window.lastGeneratedRemotePost.content = `[블로그 제목]\n${blogTitle}\n\n[블로그 본문]\n${blogBody}\n\n[스레드 본문]\n${threadsMain}\n\n[스레드 댓글]\n${threadsReply}`;

          if (window.CloudflareClient) {
            if (window.lastGeneratedRemotePost.id) {
              // Update existing
              await window.CloudflareClient.updateBoardPost(window.lastGeneratedRemotePost.id, window.lastGeneratedRemotePost);
            } else {
              // Create new
              const saved = await window.CloudflareClient.saveBoardPost(window.lastGeneratedRemotePost);
              if (saved) window.lastGeneratedRemotePost.id = saved.id;
            }
            alert('🎉 보관함에 변경 사항이 성공적으로 저장되었습니다!');
            await loadData();
            
            btnSaveRemotePost.textContent = '✅ 보관함 자동 저장됨';
            btnSaveRemotePost.disabled = true;
          } else {
            throw new Error('CloudflareClient is not available.');
          }
        } catch (err) {
          console.error(err);
          alert('저장 중 오류가 발생했습니다: ' + err.message);
          btnSaveRemotePost.textContent = originalText;
          btnSaveRemotePost.disabled = false;
        }
      });
    }

    // Input listeners to detect edits on remote publish fields
    const remoteFields = [
      'remote-blog-title-result',
      'remote-blog-result',
      'remote-threads-main-result',
      'remote-threads-reply-result'
    ];
    remoteFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          if (btnSaveRemotePost && btnSaveRemotePost.disabled) {
            btnSaveRemotePost.textContent = '💾 변경 사항 보관함에 저장';
            btnSaveRemotePost.disabled = false;
          }
        });
      }
    });

    // Lightbox Modal Listeners
    const lightbox = document.getElementById('image-lightbox');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    const btnLightboxCopyLink = document.getElementById('btn-lightbox-copy-link');
    const btnLightboxDownload = document.getElementById('btn-lightbox-download');

    if (btnCloseLightbox && lightbox) {
      btnCloseLightbox.addEventListener('click', () => {
        lightbox.style.display = 'none';
      });
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
          lightbox.style.display = 'none';
        }
      });
    }

    if (btnLightboxCopyLink) {
      btnLightboxCopyLink.addEventListener('click', () => {
        const url = lightbox.dataset.currentUrl;
        if (url) {
          navigator.clipboard.writeText(url).then(() => alert('📋 이미지 원본 링크가 복사되었습니다!'));
        }
      });
    }

    if (btnLightboxDownload) {
      btnLightboxDownload.addEventListener('click', async () => {
        const url = lightbox.dataset.currentUrl;
        if (!url) return;

        const originalText = btnLightboxDownload.textContent;
        btnLightboxDownload.textContent = '⏳ 다운로드 중...';
        btnLightboxDownload.disabled = true;

        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('네트워크 응답이 올바르지 않습니다.');
          const blob = await response.blob();
          
          const filename = 'product_image_' + Date.now() + '.jpg';
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          
          document.body.removeChild(a);
          URL.revokeObjectURL(objectUrl);
        } catch (e) {
          console.error(e);
          alert('이미지 다운로드에 실패했습니다. (CORS 문제 또는 네트워크 오류)');
        } finally {
          btnLightboxDownload.textContent = originalText;
          btnLightboxDownload.disabled = false;
        }
      });
    }

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

    // Helper to populate and show/hide history dropdowns
    function updateHistoryDropdowns(currentPost) {
      const blogHistoryContainer = document.getElementById('blog-history-container');
      const blogHistorySelect = document.getElementById('blog-history-select');
      const threadsHistoryContainer = document.getElementById('threads-history-container');
      const threadsHistorySelect = document.getElementById('threads-history-select');

      // Blog History
      if (blogHistoryContainer && blogHistorySelect) {
        const history = Array.isArray(currentPost.blogHistory) ? currentPost.blogHistory : [];
        if (history.length > 0) {
          blogHistorySelect.innerHTML = `<option value="-1">⏳ 복구할 이전 블로그 원고 선택 (${history.length}개 저장됨)</option>` +
            history.map((h, idx) => {
              const styleName = h.style === 'review' ? '정보형' : h.style === 'comparison' ? '비교형' : '스토리형';
              return `<option value="${idx}">${h.generatedAt} [${styleName}]</option>`;
            }).join('');
          blogHistoryContainer.style.display = 'flex';
        } else {
          blogHistoryContainer.style.display = 'none';
        }
      }

      // Threads History
      if (threadsHistoryContainer && threadsHistorySelect) {
        const history = Array.isArray(currentPost.threadsHistory) ? currentPost.threadsHistory : [];
        if (history.length > 0) {
          threadsHistorySelect.innerHTML = `<option value="-1">⏳ 복구할 이전 스레드 원고 선택 (${history.length}개 저장됨)</option>` +
            history.map((h, idx) => {
              const styleName = h.style === 'hook' ? '후킹형' : h.style === 'tip' ? '정보형' : '수다형';
              return `<option value="${idx}">${h.generatedAt} [${styleName}]</option>`;
            }).join('');
          threadsHistoryContainer.style.display = 'flex';
        } else {
          threadsHistoryContainer.style.display = 'none';
        }
      }
    }

    // Bind History selection changes
    const blogHistorySelect = document.getElementById('blog-history-select');
    if (blogHistorySelect) {
      blogHistorySelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        if (idx < 0) return;
        const currentPost = allPosts.find(p => String(p.id) === String(activeViewingPostId));
        if (currentPost && currentPost.blogHistory && currentPost.blogHistory[idx]) {
          const selected = currentPost.blogHistory[idx];
          if (resultTitle) resultTitle.value = selected.title || '';
          if (resultBody) resultBody.value = selected.body || '';
          if (selectBlogStyle) selectBlogStyle.value = selected.style || 'review';
          
          const inputPartnersLink = document.getElementById('coupang-partners-link-input');
          if (inputPartnersLink) inputPartnersLink.value = selected.link || '';

          // Show copy buttons
          if (btnCopyTitle) btnCopyTitle.style.display = 'inline-flex';
          if (btnCopyMarkdown) btnCopyMarkdown.style.display = 'inline-flex';
          if (btnCopyHTML) btnCopyHTML.style.display = 'inline-flex';
        }
      });
    }

    const threadsHistorySelect = document.getElementById('threads-history-select');
    if (threadsHistorySelect) {
      threadsHistorySelect.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value, 10);
        if (idx < 0) return;
        const currentPost = allPosts.find(p => String(p.id) === String(activeViewingPostId));
        if (currentPost && currentPost.threadsHistory && currentPost.threadsHistory[idx]) {
          const selected = currentPost.threadsHistory[idx];
          if (resultThreadsMain) resultThreadsMain.value = selected.main || '';
          if (resultThreadsReply) resultThreadsReply.value = selected.reply || '';
          if (selectThreadsStyle) selectThreadsStyle.value = selected.style || 'hook';
          
          const inputPartnersLink = document.getElementById('coupang-partners-link-input');
          if (inputPartnersLink) inputPartnersLink.value = selected.link || '';

          // Show copy buttons
          if (btnCopyThreadsMain) btnCopyThreadsMain.style.display = 'inline-flex';
          if (btnCopyThreadsReply) btnCopyThreadsReply.style.display = 'inline-flex';
        }
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

          // Update History dropdowns
          updateHistoryDropdowns(currentPost);
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

          const blogHistoryContainer = document.getElementById('blog-history-container');
          if (blogHistoryContainer) blogHistoryContainer.style.display = 'none';
          const threadsHistoryContainer = document.getElementById('threads-history-container');
          if (threadsHistoryContainer) threadsHistoryContainer.style.display = 'none';
        }

        // Reset tab to default (Blog)
        if (tabBlogMode) tabBlogMode.click();
      });
    }

    if (btnCloseBlog && modalBlog) {
      btnCloseBlog.addEventListener('click', () => {
        modalBlog.style.display = 'none';
        const currentPost = allPosts.find(p => String(p.id) === String(activeViewingPostId));
        if (currentPost && currentPost.category !== 'shopping_remote') {
          if (modalView) modalView.style.display = 'flex';
        }
      });
    }

    const btnCloseBlogBottom = document.getElementById('btn-close-blog-bottom');
    if (btnCloseBlogBottom && modalBlog) {
      btnCloseBlogBottom.addEventListener('click', () => {
        modalBlog.style.display = 'none';
      });
    }

    // Modal background close for Blog Modal
    if (modalBlog) {
      modalBlog.addEventListener('click', (e) => {
        if (e.target === modalBlog) {
          modalBlog.style.display = 'none';
          const currentPost = allPosts.find(p => String(p.id) === String(activeViewingPostId));
          if (currentPost && currentPost.category !== 'shopping_remote') {
            if (modalView) modalView.style.display = 'flex';
          }
        }
      });
    }

    // Save Changes button inside modal
    const btnSaveModalChanges = document.getElementById('btn-save-modal-changes');
    if (btnSaveModalChanges) {
      btnSaveModalChanges.addEventListener('click', async () => {
        if (!activeViewingPostId) return;

        const originalText = btnSaveModalChanges.textContent;
        btnSaveModalChanges.textContent = '⏳ 저장 중...';
        btnSaveModalChanges.disabled = true;

        try {
          const blogTitle = document.getElementById('blog-result-title').value;
          const blogBody = document.getElementById('blog-result-body').value;
          const threadsMain = document.getElementById('threads-result-main').value;
          const threadsReply = document.getElementById('threads-result-reply').value;
          const customLink = document.getElementById('coupang-partners-link-input').value;

          const currentPost = allPosts.find(p => String(p.id) === String(activeViewingPostId));
          if (!currentPost) throw new Error('게시글을 찾을 수 없습니다.');

          const updateData = {
            generatedBlogTitle: blogTitle,
            generatedBlogBody: blogBody,
            generatedThreadsMain: threadsMain,
            generatedThreadsReply: threadsReply,
            coupangPartnersLink: customLink,
            content: `[블로그 제목]\n${blogTitle}\n\n[블로그 본문]\n${blogBody}\n\n[스레드 본문]\n${threadsMain}\n\n[스레드 댓글]\n${threadsReply}`
          };

          if (window.CloudflareClient && typeof window.CloudflareClient.updateBoardPost === 'function') {
            const updated = await window.CloudflareClient.updateBoardPost(activeViewingPostId, updateData);
            if (updated) {
              const idx = allPosts.findIndex(p => String(p.id) === String(activeViewingPostId));
              if (idx !== -1) allPosts[idx] = updated;
              alert('🎉 원고의 변경 사항이 보관함에 성공적으로 저장되었습니다!');
              await loadData();
            } else {
              throw new Error('데이터베이스 업데이트 실패');
            }
          }
        } catch (e) {
          console.error(e);
          alert('저장 중 오류가 발생했습니다: ' + e.message);
        } finally {
          btnSaveModalChanges.textContent = originalText;
          btnSaveModalChanges.disabled = false;
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

          // Fetch current history array and append new draft to front
          const blogHistory = Array.isArray(currentPost.blogHistory) ? [...currentPost.blogHistory] : [];
          blogHistory.unshift({
            title: result.title,
            body: result.body,
            style: style,
            link: customLink,
            generatedAt: new Date().toLocaleString('ko-KR')
          });

          // Save generated content to database/Supabase
          if (window.CloudflareClient && typeof window.CloudflareClient.updateBoardPost === 'function') {
            const updated = await window.CloudflareClient.updateBoardPost(activeViewingPostId, {
              generatedBlogTitle: result.title,
              generatedBlogBody: result.body,
              blogHistory: blogHistory,
              coupangPartnersLink: customLink
            });
            if (updated) {
              const idx = allPosts.findIndex(p => String(p.id) === String(activeViewingPostId));
              if (idx !== -1) allPosts[idx] = updated;
              // Refresh dropdowns with new history
              updateHistoryDropdowns(updated);
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

          // Fetch current history array and append new draft to front
          const threadsHistory = Array.isArray(currentPost.threadsHistory) ? [...currentPost.threadsHistory] : [];
          threadsHistory.unshift({
            main: result.main,
            reply: result.reply,
            style: style,
            link: customLink,
            generatedAt: new Date().toLocaleString('ko-KR')
          });

          // Save generated content to database/Supabase
          if (window.CloudflareClient && typeof window.CloudflareClient.updateBoardPost === 'function') {
            const updated = await window.CloudflareClient.updateBoardPost(activeViewingPostId, {
              generatedThreadsMain: result.main,
              generatedThreadsReply: result.reply,
              threadsHistory: threadsHistory,
              coupangPartnersLink: customLink
            });
            if (updated) {
              const idx = allPosts.findIndex(p => String(p.id) === String(activeViewingPostId));
              if (idx !== -1) allPosts[idx] = updated;
              // Refresh dropdowns with new history
              updateHistoryDropdowns(updated);
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

    if (latestPost.category === 'shopping_remote') {
      const modalBlog = document.getElementById('modal-blog-generation');
      if (modalBlog) {
        modalBlog.style.display = 'flex';
        
        // Pre-populate custom link
        const inputPartnersLink = document.getElementById('coupang-partners-link-input');
        if (inputPartnersLink) {
          inputPartnersLink.value = latestPost.coupangPartnersLink || latestPost.link || '';
        }
        
        // Pre-populate Blog fields
        const resultTitle = document.getElementById('blog-result-title');
        const resultBody = document.getElementById('blog-result-body');
        if (resultTitle) resultTitle.value = latestPost.generatedBlogTitle || '';
        if (resultBody) resultBody.value = latestPost.generatedBlogBody || '';
        
        // Pre-populate Threads fields
        const resultThreadsMain = document.getElementById('threads-result-main');
        const resultThreadsReply = document.getElementById('threads-result-reply');
        if (resultThreadsMain) resultThreadsMain.value = latestPost.generatedThreadsMain || '';
        if (resultThreadsReply) resultThreadsReply.value = latestPost.generatedThreadsReply || '';

        // Show/Hide copy buttons based on existing content
        const btnCopyTitle = document.getElementById('btn-copy-blog-title');
        const btnCopyHTML = document.getElementById('btn-copy-blog-html');
        const btnCopyThreadsMain = document.getElementById('btn-copy-threads-main');
        const btnCopyThreadsReply = document.getElementById('btn-copy-threads-reply');

        if (btnCopyTitle) btnCopyTitle.style.display = latestPost.generatedBlogTitle ? 'inline-flex' : 'none';
        if (btnCopyHTML) btnCopyHTML.style.display = latestPost.generatedBlogBody ? 'inline-flex' : 'none';
        if (btnCopyThreadsMain) btnCopyThreadsMain.style.display = latestPost.generatedThreadsMain ? 'inline-flex' : 'none';
        if (btnCopyThreadsReply) btnCopyThreadsReply.style.display = latestPost.generatedThreadsReply ? 'inline-flex' : 'none';

        // Show Save changes button inside modal
        const btnSaveModalChanges = document.getElementById('btn-save-modal-changes');
        if (btnSaveModalChanges) btnSaveModalChanges.style.display = 'inline-flex';

        // Render Images in modal gallery
        const modalImgContainer = document.getElementById('modal-images-container');
        const modalImgGallery = document.getElementById('modal-images-gallery');
        if (modalImgContainer && modalImgGallery) {
          modalImgGallery.innerHTML = '';
          if (latestPost.images && latestPost.images.length > 0) {
            modalImgContainer.style.display = 'block';
            latestPost.images.forEach(imgUrl => {
              const imgEl = document.createElement('img');
              imgEl.src = imgUrl;
              imgEl.style.width = '80px';
              imgEl.style.height = '80px';
              imgEl.style.objectFit = 'cover';
              imgEl.style.borderRadius = '6px';
              imgEl.style.cursor = 'pointer';
              imgEl.style.border = '2px solid #313244';
              imgEl.style.transition = 'transform 0.2s';
              imgEl.addEventListener('mouseenter', () => imgEl.style.transform = 'scale(1.05)');
              imgEl.addEventListener('mouseleave', () => imgEl.style.transform = 'scale(1)');
              
              imgEl.addEventListener('click', () => {
                const lightbox = document.getElementById('image-lightbox');
                const lightboxImg = document.getElementById('lightbox-img');
                if (lightbox && lightboxImg) {
                  lightboxImg.src = imgUrl;
                  lightbox.style.display = 'flex';
                  lightbox.dataset.currentUrl = imgUrl;
                }
              });
              modalImgGallery.appendChild(imgEl);
            });
          } else {
            modalImgContainer.style.display = 'none';
          }
        }

        // Update History dropdowns
        updateHistoryDropdowns(latestPost);
        return;
      }
    }
    
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
            const lightbox = document.getElementById('image-lightbox');
            const lightboxImg = document.getElementById('lightbox-img');
            if (lightbox && lightboxImg) {
              lightboxImg.src = src;
              lightbox.style.display = 'flex';
              lightbox.dataset.currentUrl = src;
            }
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
            <td onclick="event.stopPropagation();" style="text-align: center;">
              <input type="checkbox" class="landing-toggle-checkbox" data-post-id="${post.id}" ${post.showOnLanding !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #7c3aed;">
            </td>
            <td style="color: #94a3b8; font-size: 12px;">${escapeHtml(post.createdAt)}</td>
            <td style="text-align: right;" onclick="event.stopPropagation();">
              <button class="row-action-btn" style="color: #818cf8; background: none; border: none; font-weight: 700; cursor: pointer;">보기 ➔</button>
            </td>
          `;
          tbody.appendChild(tr);
        });

        // Add change event listener for landing page toggles
        document.querySelectorAll('.landing-toggle-checkbox').forEach(cb => {
          cb.addEventListener('change', async (e) => {
            const postId = e.target.dataset.postId;
            const isChecked = e.target.checked;
            
            // Update in local memory
            const postIndex = allPosts.findIndex(p => String(p.id) === String(postId));
            if (postIndex !== -1) {
              allPosts[postIndex].showOnLanding = isChecked;
            }
            
            // Save update remotely & locally
            try {
              await window.CloudflareClient.updateBoardPost(postId, { showOnLanding: isChecked });
              console.log(`Updated post ${postId} showOnLanding state to ${isChecked}`);
            } catch (err) {
              console.error('Failed to update showOnLanding status:', err);
            }
          });
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

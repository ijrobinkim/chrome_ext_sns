/**
 * Cloudflare Pages & Workers / Supabase Hybrid Data Store Client
 * Manages bulletin board posts with local storage caching and Cloudflare REST API sync.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'cf_pages_board_posts';

  // Cloudflare Workers REST API endpoint (optional custom worker URL)
  let cloudflareEndpoint = 'https://api.cloudflare-worker-board.workers.dev/posts';

  // Initial sample board posts
  const defaultPosts = [
    {
      id: 'cf_post_1',
      category: 'shopping',
      categoryLabel: '🛒 쿠팡',
      title: '[쿠팡] 로켓배송 게이밍 무선 마우스 10000DPI',
      author: '쿠팡쇼핑봇',
      content: '쿠팡에서 인기 급상승 중인 게이밍 마우스입니다. 할인율 38% 특가 판매 중.',
      price: '29,900원',
      link: 'https://www.coupang.com/vp/products/8761299525',
      images: [
        'https://thumbnail10.coupangcdn.com/thumbnails/remote/492x492ex/image/vendor_inventory/images/2023/10/01/12/3/sample.jpg'
      ],
      views: 1420,
      likes: 128,
      comments: 34,
      status: 'published',
      createdAt: '2026-08-12 16:30'
    },
    {
      id: 'cf_post_2',
      category: 'sns',
      categoryLabel: '📢 스레드',
      title: '코스트코 인기 상품 리뷰 & 성과 지표 4.8배 폭발',
      author: '1lumi_log',
      content: '와... 이거 진짜 신세계다ㄷㄷ 길이 조절로 설치할 수 있는 커튼 발견함;; 이사갈 땐 떼가야징 ㅋㅋㅋㅋ',
      price: '-',
      link: 'https://www.threads.com/@1lumi_log/post/costco_sample',
      images: [],
      views: 4481,
      likes: 232,
      comments: 18,
      status: 'published',
      createdAt: '2026-08-11 19:15'
    },
    {
      id: 'cf_post_3',
      category: 'general',
      categoryLabel: '💬 자유게시판',
      title: 'Cloudflare Pages 호스팅으로 구축한 무료 게시판 사용 가이드',
      author: '관리자',
      content: 'Cloudflare Pages 호스팅과 Workers/Supabase DB를 연동하여 완전 무료로 운영되는 게시판입니다. 우측 상단의 [✏️ 새 글 작성] 버튼을 눌러 자유롭게 글을 작성해보세요.',
      price: '-',
      link: 'https://pages.cloudflare.com',
      images: [],
      views: 950,
      likes: 85,
      comments: 12,
      status: 'published',
      createdAt: '2026-08-10 10:00'
    }
  ];

  function getLocalPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[CloudflareClient] LocalStorage read failed:', e);
    }
    saveLocalPosts(defaultPosts);
    return defaultPosts;
  }

  function saveLocalPosts(posts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch (e) {
      console.warn('[CloudflareClient] LocalStorage write failed:', e);
    }
  }

  async function fetchBoardPosts() {
    let posts = getLocalPosts();

    // Try fetching remote posts from Supabase or Cloudflare REST API if configured
    if (global.supabaseClient) {
      try {
        const { data, error } = await global.supabaseClient
          .from('sns_metrics')
          .select('*')
          .order('saved_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const filteredData = data.filter(item => item.author !== 'admin_config');
          const remotePosts = filteredData.map((item, idx) => {
            let category = 'sns';
            let categoryLabel = '📢 스레드';
            let title = '수집된 콘텐츠';
            let content = item.text || '';
            let price = '-';
            let images = [];
            let options = [];
            let link = item.link || '#';
            
            // Persisted AI texts
            let generatedBlogTitle = '';
            let generatedBlogBody = '';
            let generatedThreadsMain = '';
            let generatedThreadsReply = '';
            let coupangPartnersLink = '';
            let showOnLanding = true;

            // Detect if item.text is JSON-serialized shopping metadata
            if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
              try {
                const parsed = JSON.parse(content);
                if (parsed.isShopping) {
                  if (parsed.platform === 'shopping_remote') {
                    category = 'shopping_remote';
                    categoryLabel = '📦 원격 발행 보관함';
                  } else {
                    category = 'shopping';
                    categoryLabel = parsed.platform === 'naver' ? '🛒 네이버 쇼핑' : '🛒 쿠팡';
                  }
                  title = parsed.title || title;
                  price = parsed.price || '-';
                  images = parsed.images || [];
                  options = parsed.options || [];
                  content = parsed.content || `[${title}] 가격: ${price} / 판매자: ${parsed.seller || '-'}`;
                  
                  // Extract AI texts if exist
                  generatedBlogTitle = parsed.generatedBlogTitle || '';
                  generatedBlogBody = parsed.generatedBlogBody || '';
                  generatedThreadsMain = parsed.generatedThreadsMain || '';
                  generatedThreadsReply = parsed.generatedThreadsReply || '';
                  coupangPartnersLink = parsed.coupangPartnersLink || '';
                  link = parsed.coupangPartnersLink || parsed.link || link;
                  showOnLanding = parsed.showOnLanding !== false;
                }
              } catch (e) {
                console.warn('JSON parse error on post text:', e);
              }
            } else {
              // Fallback text parsing
              if (content.includes('쿠팡') || content.includes('Coupang')) {
                category = 'shopping';
                categoryLabel = '🛒 쿠팡';
              } else if (content.includes('네이버') || content.includes('Naver') || content.includes('스마트스토어')) {
                category = 'shopping';
                categoryLabel = '🛒 네이버 쇼핑';
              }
              title = content.substring(0, 50);
            }

            // Direct columns check (if they exist)
            if (item.price) price = item.price;
            if (item.images) {
              if (Array.isArray(item.images)) images = item.images;
              else if (typeof item.images === 'string') {
                try { images = JSON.parse(item.images); } catch(e) { images = [item.images]; }
              }
            }

            return {
              id: item.id || `sp_${idx}`,
              category,
              categoryLabel,
              title,
              author: item.author || '익명',
              content,
              price,
              link,
              images,
              options,
              views: item.views || 0,
              likes: item.likes || 0,
              comments: item.comments || 0,
              status: 'published',
              createdAt: item.saved_at ? new Date(item.saved_at).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR'),
              timestamp: item.saved_at ? new Date(item.saved_at).getTime() : Date.now(),
              
              // Persisted AI fields
              generatedBlogTitle,
              generatedBlogBody,
              generatedThreadsMain,
              generatedThreadsReply,
              coupangPartnersLink,
              showOnLanding
            };
          });

          // Merge local posts with remote posts (avoid duplicates by id)
          const postMap = new Map();
          remotePosts.forEach(p => postMap.set(p.id, p));
          posts.forEach(p => {
            if (!postMap.has(p.id)) postMap.set(p.id, p);
          });

          posts = Array.from(postMap.values());
          posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          saveLocalPosts(posts);
        }
      } catch (err) {
        console.warn('[CloudflareClient] Supabase sync note:', err);
      }
    }

    return posts;
  }

  async function saveBoardPost(newPostData) {
    const posts = getLocalPosts();
    const newPost = {
      id: `cf_post_${Date.now()}`,
      category: newPostData.category || 'general',
      categoryLabel: getCategoryLabel(newPostData.category),
      title: newPostData.title || '제목 없음',
      author: newPostData.author || '익명',
      content: newPostData.content || '',
      price: newPostData.price || '-',
      link: newPostData.link || '#',
      images: newPostData.images || [],
      views: 0,
      likes: 0,
      comments: 0,
      status: 'published',
      createdAt: new Date().toLocaleString('ko-KR'),
      timestamp: Date.now(),
      generatedBlogTitle: newPostData.generatedBlogTitle || '',
      generatedBlogBody: newPostData.generatedBlogBody || '',
      generatedThreadsMain: newPostData.generatedThreadsMain || '',
      generatedThreadsReply: newPostData.generatedThreadsReply || '',
      showOnLanding: newPostData.showOnLanding !== false
    };

    posts.unshift(newPost);
    saveLocalPosts(posts);

    // Also push to Supabase if connected
    if (global.supabaseClient) {
      try {
        let textValue = `[${newPost.title}] ${newPost.content}`;
        if (newPost.category === 'shopping' || newPost.category === 'shopping_remote') {
          textValue = JSON.stringify({
            isShopping: true,
            platform: newPost.category === 'shopping' ? 'coupang' : 'shopping_remote',
            title: newPost.title,
            price: newPost.price || '-',
            seller: newPost.author,
            link: newPost.link,
            images: newPost.images || [],
            options: [],
            content: newPost.content,
            generatedBlogTitle: newPostData.generatedBlogTitle || '',
            generatedBlogBody: newPostData.generatedBlogBody || '',
            generatedThreadsMain: newPostData.generatedThreadsMain || '',
            generatedThreadsReply: newPostData.generatedThreadsReply || '',
            coupangPartnersLink: newPostData.coupangPartnersLink || '',
            showOnLanding: newPostData.showOnLanding !== false
          });
        }
        await global.supabaseClient.from('sns_metrics').insert([{
          author: newPost.author,
          text: textValue,
          link: newPost.link,
          views: 0,
          likes: 0,
          comments: 0,
          saved_at: new Date().toISOString()
        }]);
      } catch (e) {
        console.warn('[CloudflareClient] Supabase insert fallback:', e);
      }
    }

    return newPost;
  }

  async function deleteBoardPost(postId) {
    let posts = getLocalPosts();
    posts = posts.filter(p => p.id !== postId && String(p.id) !== String(postId));
    saveLocalPosts(posts);
    return true;
  }

  async function updateBoardPost(postId, updatedFields) {
    let posts = getLocalPosts();
    let updatedPost = null;

    posts = posts.map(p => {
      if (String(p.id) === String(postId)) {
        updatedPost = { ...p, ...updatedFields };
        return updatedPost;
      }
      return p;
    });

    if (!updatedPost) return null;

    saveLocalPosts(posts);

    // Also push to Supabase if connected
    if (global.supabaseClient) {
      try {
        let textValue = '';
        if (updatedPost.category === 'shopping' || updatedPost.category === 'shopping_remote') {
          textValue = JSON.stringify({
            isShopping: true,
            platform: updatedPost.category === 'shopping' ? (updatedPost.categoryLabel.includes('네이버') ? 'naver' : 'coupang') : 'shopping_remote',
            title: updatedPost.title,
            price: updatedPost.price,
            seller: updatedPost.author,
            link: updatedPost.link,
            images: updatedPost.images,
            options: updatedPost.options,
            content: updatedPost.content,
            
            // Persisted AI fields
            generatedBlogTitle: updatedPost.generatedBlogTitle || '',
            generatedBlogBody: updatedPost.generatedBlogBody || '',
            generatedThreadsMain: updatedPost.generatedThreadsMain || '',
            generatedThreadsReply: updatedPost.generatedThreadsReply || '',
            coupangPartnersLink: updatedPost.coupangPartnersLink || '',
            showOnLanding: updatedPost.showOnLanding !== false
          });
        } else {
          textValue = updatedPost.content;
        }

        await global.supabaseClient
          .from('sns_metrics')
          .update({ text: textValue })
          .eq('id', postId);
      } catch (e) {
        console.warn('[CloudflareClient] Supabase update failed:', e);
      }
    }

    return updatedPost;
  }

  function getCategoryLabel(cat) {
    switch (cat) {
      case 'shopping': return '🛒 쿠팡/쇼핑';
      case 'shopping_remote': return '📦 원격 발행 보관함';
      case 'sns': return '📢 스레드/SNS';
      case 'trend': return '🔥 트렌드';
      case 'general': default: return '💬 자유게시판';
    }
  }

  async function loadAdminConfig() {
    const defaultSettings = {
      username: "admin",
      password: "asdf1234",
      gemini_api_key: "",
      profiles: {
        kkoolkkool: {
          name: "kkoolkkool",
          avatar: "kkoolkkool_avatar.jpg",
          email: "koolkool@naver.com",
          desc: "이 포스팅은 쿠팡 파트너스 및 토스쇼핑 쉐어링크 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
        },
        salim_nam: {
          name: "salim_nam",
          avatar: "salim_nam_avatar.jpg",
          email: "hkthelife@gmail.com",
          desc: "이 포스팅은 쿠팡 파트너스 및 토스쇼핑 쉐어링크 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.\n\n찾으시는 제품명 or 제품번호를 검색해보세요!\n짧게 입력해도 모두 뜹니다!\n\n✉️ hkthelife@gmail.com"
        }
      },
      custom_links: [
        { title: "내 스레드 프로필 (샘플)", url: "https://www.threads.net/" },
        { title: "내 인스타그램 (샘플)", url: "https://www.instagram.com/" }
      ]
    };

    if (!global.supabaseClient) {
      console.warn('[CloudflareClient] Supabase client is not loaded. Using default settings.');
      return defaultSettings;
    }

    try {
      const { data, error } = await global.supabaseClient
        .from('sns_metrics')
        .select('*')
        .eq('author', 'admin_config')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        try {
          const parsed = JSON.parse(data[0].text);
          return {
            ...defaultSettings,
            ...parsed,
            profiles: {
              kkoolkkool: { ...defaultSettings.profiles.kkoolkkool, ...(parsed.profiles?.kkoolkkool || {}) },
              salim_nam: { ...defaultSettings.profiles.salim_nam, ...(parsed.profiles?.salim_nam || {}) }
            },
            custom_links: parsed.custom_links || defaultSettings.custom_links
          };
        } catch (e) {
          console.warn('[CloudflareClient] Failed to parse admin_config JSON. Using defaults.');
        }
      }
    } catch (err) {
      console.error('[CloudflareClient] Failed to load admin config:', err);
    }
    return defaultSettings;
  }

  async function saveAdminConfig(config) {
    if (!global.supabaseClient) {
      console.warn('[CloudflareClient] Supabase client is not loaded. Cannot save admin config to DB.');
      return false;
    }

    try {
      const { data, error: selectError } = await global.supabaseClient
        .from('sns_metrics')
        .select('id')
        .eq('author', 'admin_config')
        .limit(1);

      if (selectError) throw selectError;

      const textValue = JSON.stringify(config);

      if (data && data.length > 0) {
        const { error: updateError } = await global.supabaseClient
          .from('sns_metrics')
          .update({ text: textValue, saved_at: new Date().toISOString() })
          .eq('id', data[0].id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await global.supabaseClient
          .from('sns_metrics')
          .insert([{
            author: 'admin_config',
            text: textValue,
            link: '#',
            views: 0,
            likes: 0,
            comments: 0,
            saved_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }
      return true;
    } catch (err) {
      console.error('[CloudflareClient] Failed to save admin config:', err);
      return false;
    }
  }

  const CloudflareClient = {
    fetchBoardPosts,
    saveBoardPost,
    deleteBoardPost,
    updateBoardPost,
    getLocalPosts,
    getCategoryLabel,
    loadAdminConfig,
    saveAdminConfig
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = CloudflareClient;
  }
  global.CloudflareClient = CloudflareClient;
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

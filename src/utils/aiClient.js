/**
 * Antigravity AI Blog Copywriting Client (Gemini API Integration)
 */
(function (global) {
  'use strict';

  const GEMINI_KEY_STORAGE = 'sns_gemini_api_key';

  function getGeminiKey() {
    return localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  }

  function saveGeminiKey(key) {
    if (key) {
      localStorage.setItem(GEMINI_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
  }

  /**
   * Translate Markdown to plain HTML for clipboard rich text pasting
   */
  function mdToHtml(md) {
    if (!md) return '';
    let html = md;
    
    // Escape HTML characters
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*?)$/gm, '<h3 style="font-size: 16px; font-weight: 700; color: #1e1b4b; margin-top: 16px; margin-bottom: 8px;">$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2 style="font-size: 18px; font-weight: 800; color: #1e1b4b; margin-top: 20px; margin-bottom: 10px; border-left: 4px solid #7c3aed; padding-left: 8px;">$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1 style="font-size: 22px; font-weight: 800; color: #111827; margin-bottom: 12px;">$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700; color: #7c3aed;">$1</strong>');
    
    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0;">');

    // Bullet Lists
    html = html.replace(/^\* (.*?)$/gm, '<li style="margin-left: 20px; margin-bottom: 4px; list-style-type: disc;">$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li style="margin-left: 20px; margin-bottom: 4px; list-style-type: disc;">$1</li>');

    // Wrap single list items if any
    
    // Images formatting (alt to caption)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<div style="text-align: center; margin: 20px 0;"><img src="$2" alt="$1" style="max-width: 90%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"><p style="font-size: 12px; color: #6b7280; margin-top: 6px; font-style: italic;">▲ $1</p></div>');

    // Links (Affiliate Links formatting)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #2563eb; font-weight: 700; text-decoration: underline;">$1</a>');
    
    // Paragraphs / Breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /**
   * Call Google Gemini API to generate the post content
   */
  async function generatePost(productData, style = 'review', customLink = '') {
    const key = getGeminiKey();
    if (!key) {
      throw new Error('Gemini API Key가 설정되지 않았습니다. 상단 입력창에 등록해 주세요.');
    }

    const model = 'gemini-3.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const optionDescriptions = productData.options && productData.options.length > 0
      ? productData.options.join(', ')
      : '없음';

    const affiliateLink = customLink.trim() || productData.link || '#';
    const imageUrls = productData.images && productData.images.length > 0
      ? productData.images.slice(0, 5) // Use up to 5 main images
      : [];

    let imageInstruction = '';
    if (imageUrls.length > 0) {
      imageInstruction = `
[이미지 삽입 지침]
다음은 수집된 상품 이미지 URL 목록입니다:
${imageUrls.map((url, idx) => `- 이미지 ${idx + 1}: ${url}`).join('\n')}

원고 중간중간 (서론 공감대 형성 이후, 스펙 비교 분석 중간, 실사용 후기 소개 시점 등) 문맥이 끝나는 문단 사이에 총 2~3회에 걸쳐 이미지 마크다운 \`![이미지 설명](이미지 URL)\`을 골고루 분산시켜 삽입해 주세요. 
단, 이미지 설명(alt text)은 검색 노출에 도움되도록 해당 이미지에 어울리는 풍부한 한국어 설명으로 적어주세요. 반드시 제공된 실제 URL만 정확히 사용해야 하며 가짜 URL을 생성하지 마세요.
`;
    }

    const systemPrompt = `
당신은 10년 차 전업 제휴 마케팅 블로거이자 고전환 카피라이팅 전문가입니다.
주어진 상품 정보를 기반으로, 기계적인 말투(예: ~입니다, ~해보세요만 남발하는 톤)를 전면 배제하고, 실제 구매하여 써본 이웃이 쓴 것 같은 친근하고 자연스러운 구어체 한국어 블로그 포스팅을 작성해 주세요.

출력 형식은 반드시 아래 형식을 정확히 지켜주세요 (구분선과 [제목], [본문] 태그 포함):
[제목] 블로그 제목 작성 (키워드 최적화 및 궁금증 유발 조합)
---
[본문] 블로그 본문 내용 작성 (Markdown 형식)

[블로그 스타일 지정]
현재 선택된 작문 스타일은 [${style}] 입니다.
- review: 5단계 고전환율 포스팅 (공감대 유발 -> 선택 기준 설명 -> 장단점 솔직 요약 -> 삶의 시각적 변화 -> 추천 및 링크)
- comparison: 유사 스펙 제품군과의 핵심 비교 포인트 중심 리뷰
- story: 친근한 수다방 형식의 솔직 담백 사용기 스토리텔링

[필수 요구사항]
1. 공정위 문구 위치 규정: 본문 맨 하단에 다음 공정위 문구를 토씨 하나 틀리지 말고 정확하게 포함하세요:
"이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
2. 링크 삽입 지침: 
- **본문 중간 부분**: 본문 중간 흐름에 자연스럽게 1~2회 마크다운 링크 형식으로 제휴 링크(${affiliateLink})를 배치해 주세요. (예: "더 자세한 상품 정보나 후기들은 [이곳 상품 페이지 정보]에서 보실 수 있어요.")
- **본문 맨 마지막 부분**: 원고 맨 마지막 문단 바로 아래에 강조 형태로 제휴 링크(${affiliateLink})를 한 번 더 삽입해 마무리하세요. (예: "[▶ 상품 상세 정보 및 구매 링크 보러가기](링크)")
3. 단점 언급: 완벽한 제품은 없습니다. 실사용 시 겪을 수 있는 사소한 아쉬움 1가지를 언급하여 무한한 신뢰도를 이끌어내세요.
${imageInstruction}
`;

    const userPrompt = `
[상품 정보 데이터]
- 상품명: ${productData.title}
- 카테고리: ${productData.categoryLabel || productData.category}
- 판매 가격: ${productData.price || '가격정보 확인불가'}
- 판매자/배송: ${productData.author}
- 선택 옵션 정보: ${optionDescriptions}
- 제품 상세 설명 요약:
${productData.content}

위 상품 정보를 바탕으로 검색 포털 저품질 우회가 가능하도록 풍부하고 디테일한 포스팅을 작성해 주세요.
`;

    const payload = {
      contents: [{
        parts: [{
          text: systemPrompt + '\n\n' + userPrompt
        }]
      }]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini API 호출 실패: ${errMsg}`);
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('API 응답 형식이 올바르지 않거나 빈 원고가 반환되었습니다.');
    }

    // Parse Title & Body
    let title = '블로그 제목';
    let body = responseText;

    if (responseText.includes('[본문]')) {
      const parts = responseText.split('[본문]');
      title = parts[0].replace('[제목]', '').replace(/---/g, '').trim();
      body = parts[1] ? parts[1].trim() : responseText;
    } else if (responseText.includes('---')) {
      const parts = responseText.split('---');
      title = parts[0].replace('[제목]', '').trim();
      body = parts.slice(1).join('---').trim();
    }

    return {
      title,
      body,
      raw: responseText
    };
  }

  /**
   * Call Google Gemini API to generate Threads viral posts (separated into main post and comment thread)
   */
  async function generateThreadsPost(productData, style = 'hook', customLink = '') {
    const key = getGeminiKey();
    if (!key) {
      throw new Error('Gemini API Key가 설정되지 않았습니다. 상단 입력창에 등록해 주세요.');
    }

    const model = 'gemini-3.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const optionDescriptions = productData.options && productData.options.length > 0
      ? productData.options.join(', ')
      : '없음';

    const affiliateLink = customLink.trim() || productData.link || '#';

    const systemPrompt = `
당신은 스레드(Threads)에서 월 1,000만 원 이상의 수익을 창출하는 바이럴 마케터이자 제휴 마케팅 카피라이팅 전문가입니다.
스레드 플랫폼의 노출 알고리즘과 섀도우밴(정지) 정책을 철저하게 준수하면서, 독자의 호기심을 극대화해 스크롤을 멈추게(Hooking) 만드는 바이럴 포스팅을 작성해야 합니다.

반드시 아래 출력 형식을 정확하게 지켜주세요:
[본문]
여기에 스레드 본문 작성
===
[댓글]
여기에 댓글(타래) 내용 작성

[스레드 본문(노링크) 작성 규칙]
1. 본문 내 링크 절대 삽입 금지 (알고리즘 노출 제한 우회용).
2. 분량 제한: 한글 기준 공백 포함 150자 내외로 매우 짧고 컴팩트하게 작성하세요.
3. 4단 바이럴 구조 구현:
   - 1행(후킹): 질문이나 파격적인 갈등 유발 멘트로 스크롤 스톱 (예: "솔직히 이거 써보기 전엔 돈낭비인 줄 알았는데;;")
   - 2~3행(심화): 현실적인 일상 고민, 가격대 정보나 핵심 기능 강조로 과몰입 유도.
   - 4행(해결책 제시): 제품을 간접적으로 추천하며 궁금증 유발 (광고 티 배제).
   - 5행(댓글 유도): 독자가 댓글로 자기 생각을 적거나 참견할 수 있는 질문형 맺음말 (예: "혹시 이거 써보신 분 후기 좀요ㅋㅋ", "너라면 이거 삼?")
4. 말투: 100% 날것의 구어체, 인터넷 신조어, 급식체, 말줄임표(..) 및 적절한 이모지를 사용하여 매우 친근하고 자연스러운 소셜미디어 말투로 작성하세요. (~입니다, ~하세요 금지)

[스레드 댓글/타래 작성 규칙]
1. 최상단 공정위 문구 의무 결합: 반드시 첫 줄에 다음 공정위 문구를 토씨 하나 틀리지 말고 정확하게 배치하세요:
"이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다."
2. 한 줄 후킹 요약: 그 바로 아래에 제품에 대한 한 줄 후킹 요약을 작성하세요 (예: "가성비 끝판왕으로 난리 난 그 선풍기 정보👇")
3. 제휴 단축 링크: 맨 끝에 제휴 링크(${affiliateLink})를 배치하세요.
`;

    const userPrompt = `
[선택된 스타일] : ${style} (hook: 자극적 후킹, tip: 정보/꿀팁 요약, chat: 일상 썰 수다체)
[상품 정보 데이터]
- 상품명: ${productData.title}
- 판매 가격: ${productData.price || '가격정보 확인불가'}
- 판매자/배송: ${productData.author}
- 선택 옵션 정보: ${optionDescriptions}
- 제품 상세 설명 요약:
${productData.content}

위 정보를 바탕으로 스레드 알고리즘을 터트릴 수 있는 매력적인 바이럴 본문과 댓글 세트를 작성해 주세요.
`;

    const payload = {
      contents: [{
        parts: [{
          text: systemPrompt + '\n\n' + userPrompt
        }]
      }]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini API 호출 실패: ${errMsg}`);
    }

    const resJson = await response.json();
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error('API 응답 형식이 올바르지 않거나 빈 원고가 반환되었습니다.');
    }

    let mainPost = '스레드 본문';
    let replyPost = '스레드 댓글';

    if (responseText.includes('===')) {
      const parts = responseText.split('===');
      mainPost = parts[0].replace('[본문]', '').replace(/\[댓글\]/g, '').trim();
      replyPost = parts[1] ? parts[1].replace('[댓글]', '').trim() : responseText;
    } else if (responseText.includes('[댓글]')) {
      const parts = responseText.split('[댓글]');
      mainPost = parts[0].replace('[본문]', '').trim();
      replyPost = parts[1] ? parts[1].trim() : responseText;
    }

    return {
      main: mainPost,
      reply: replyPost,
      raw: responseText
    };
  }

  // Export to global context
  global.AIBlogClient = {
    getGeminiKey,
    saveGeminiKey,
    generatePost,
    generateThreadsPost,
    mdToHtml
  };
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));

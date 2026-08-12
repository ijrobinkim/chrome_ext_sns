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
  async function generatePost(productData, style = 'review') {
    const key = getGeminiKey();
    if (!key) {
      throw new Error('Gemini API Key가 설정되지 않았습니다. 상단 입력창에 등록해 주세요.');
    }

    const model = 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const optionDescriptions = productData.options && productData.options.length > 0
      ? productData.options.join(', ')
      : '없음';

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
2. 링크 유도: 상품 원본 링크(${productData.link || '#'})를 문맥에 맞게 매끄러운 텍스트 링크로 본문에 1~2회 삽입해 주세요. (예: "자세한 스펙이나 현재 특가 확인은 [여기 상품 정보 확인]을 통해 보실 수 있어요.")
3. 단점 언급: 완벽한 제품은 없습니다. 실사용 시 겪을 수 있는 사소한 아쉬움 1가지를 언급하여 무한한 신뢰도를 이끌어내세요.
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

  // Export to global context
  global.AIBlogClient = {
    getGeminiKey,
    saveGeminiKey,
    generatePost,
    mdToHtml
  };
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));

// src/utils/supabaseClient.js

// TODO: 발급받은 Supabase 프로젝트 URL과 Anon Key를 여기에 입력하세요.
const SUPABASE_URL = 'https://bjcigdhyiruqhrxysqmy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_J_4svbtRHdQf89tUWa873g_GKiASymL';

// supabase-js는 manifest.json을 통해 로드되어 전역 변수 `supabase`로 접근할 수 있습니다.
let supabaseClient = null;

try {
  if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase client initialized.');
  } else {
    console.warn('⚠️ Supabase library is not loaded. Please make sure supabase.min.js is included in manifest.json.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error);
}

// 필요시 외부 모듈처럼 사용하기 위해 window 객체에 할당 (Content Script / Extension 환경 모두 지원)
window.supabaseClient = supabaseClient;

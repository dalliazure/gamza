/**
 * 중고 거래 웹 서비스 ‘감자 (Gamza)’ 통합 스크립트 (app.js)
 * - [화면 1] 상품 목록 (실시간 검색, 7개 카테고리, 거래 가능만 보기 필터, 상태 배지 및 거래 완료 흐림 표시)
 * - [화면 2] 상세 팝업 (<dialog> 모달, 작성자 전용 판매상태 변경 및 수정/삭제, 관심 추가, 채팅/댓글 시뮬레이션)
 * - [화면 3] 글쓰기 및 수정 (프리셋 일러스트/이미지 업로드, 가격 포맷팅, 판매 상태 선택)
 * - [백엔드 연동] Supabase Auth (이메일 회원가입/로그인, 닉네임 필수) 및 PostgreSQL (profiles, products, wishes)
 */

(function () {
  'use strict';

  /* ==========================================================================
     1. 커스텀 SVG 일러스트 & 아바타 생성 헬퍼 (네트워크 무관 100% 즉시 렌더링)
     ========================================================================== */
  function createPotatoSvgDataUri({
    emoji = '🥔',
    subText = '감자 마켓',
    bgStart = '#FAF4EB',
    bgEnd = '#EBD9C3',
    accent = '#C69768'
  } = {}) {
    const safeSubText = String(subText)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .slice(0, 18);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgStart}" />
          <stop offset="100%" stop-color="${bgEnd}" />
        </linearGradient>
      </defs>
      <rect width="600" height="450" fill="url(#bgGrad)" />
      <circle cx="500" cy="80" r="105" fill="#FFD43B" opacity="0.28" />
      <circle cx="95" cy="375" r="130" fill="${accent}" opacity="0.16" />
      <rect x="155" y="65" width="290" height="225" rx="36" fill="#FFFFFF" opacity="0.92" stroke="#E4D7C5" stroke-width="3" />
      <text x="300" y="185" font-size="104" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
      <g transform="translate(395, 240)">
        <circle cx="28" cy="28" r="26" fill="#FFD43B" stroke="#6D4428" stroke-width="2.5" />
        <text x="28" y="31" font-size="26" text-anchor="middle" dominant-baseline="middle">🥔</text>
      </g>
      <rect x="175" y="330" width="250" height="48" rx="24" fill="#6D4428" stroke="#FFD43B" stroke-width="2" opacity="0.96" />
      <text x="300" y="355" font-family="Pretendard, sans-serif" font-size="20" font-weight="700" fill="#FFF9DB" text-anchor="middle" dominant-baseline="middle">${safeSubText}</text>
    </svg>`;

    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function createSellerAvatarSvg({ bg = '#FFF9DB', potatoColor = '#C69768', cheek = '#FFAD60' } = {}) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <circle cx="60" cy="60" r="60" fill="${bg}" />
      <circle cx="60" cy="60" r="52" fill="#FFD43B" opacity="0.22" />
      <ellipse cx="60" cy="64" rx="35" ry="29" fill="${potatoColor}" />
      <circle cx="48" cy="58" r="4.2" fill="#2B1E16" />
      <circle cx="72" cy="58" r="4.2" fill="#2B1E16" />
      <path d="M52 70 Q60 77 68 70" stroke="#2B1E16" stroke-width="3.5" fill="none" stroke-linecap="round" />
      <circle cx="41" cy="65" r="5.5" fill="${cheek}" opacity="0.75" />
      <circle cx="79" cy="65" r="5.5" fill="${cheek}" opacity="0.75" />
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* ==========================================================================
     2. 초기 가짜 상품 6개 데이터 (저장소 없이 메모리에서만 동작)
     ========================================================================== */
  const INITIAL_PRODUCTS = [
    {
      id: 'prod-1',
      title: '맥북 에어 M2 13인치 스타라이트 (배터리 효율 96%, 풀박스)',
      category: '디지털기기',
      price: 980000,
      location: '서울 강남구 역삼동',
      timeAgo: '10분 전',
      status: '판매중',
      description:
        '집에서 문서 작업용으로만 아껴 사용한 맥북 에어 M2 스타라이트 모델입니다.\n외관 찍힘이나 스크래치 전혀 없고 정품 충전기와 박스 모두 그대로 보관 중입니다.\n역삼역 인근에서 직거래 희망합니다!',
      image: createPotatoSvgDataUri({
        emoji: '💻',
        subText: 'MacBook Air M2',
        bgStart: '#FBF5EC',
        bgEnd: '#EAD8C3',
        accent: '#C89B6E'
      }),
      seller: {
        nickname: '포근한감자칩',
        region: '서울 강남구 역삼동',
        avatar: createSellerAvatarSvg({ bg: '#F7EFE6', potatoColor: '#D4A373' })
      }
    },
    {
      id: 'prod-2',
      title: '원목 감성 2인용 미니 식탁 세트 (의자 2개 포함)',
      category: '가구/인테리어',
      price: 85000,
      location: '서울 마포구 연남동',
      timeAgo: '35분 전',
      status: '판매중',
      description:
        '따뜻한 우드톤 인테리어에 잘 어울리는 원목 2인 식탁 세트입니다.\n자취방이나 신혼집에 두기 딱 좋은 아담한 사이즈예요.\n상판 코팅 상태 깨끗하며 의자 발 패드도 새것으로 교체해 두었습니다.',
      image: createPotatoSvgDataUri({
        emoji: '🪑',
        subText: '원목 미니 식탁 세트',
        bgStart: '#F6EFE6',
        bgEnd: '#E5D2B8',
        accent: '#B5835A'
      }),
      seller: {
        nickname: '연남동알감자',
        region: '서울 마포구 연남동',
        avatar: createSellerAvatarSvg({ bg: '#EFE4D4', potatoColor: '#C69264' })
      }
    },
    {
      id: 'prod-3',
      title: '드롱기 아이코나 빈티지 에스프레소 커피머신 (베이지)',
      category: '생활가전',
      price: 110000,
      location: '서울 성동구 성수동',
      timeAgo: '1시간 전',
      status: '예약중',
      description:
        '주방에 두기만 해도 감성 넘치는 드롱기 빈티지 커피머신 베이지 컬러입니다.\n스팀 노즐 작동 완벽하고 우유 스팀 피처와 원두 템퍼도 함께 드려요.\n현재 이웃분과 오늘 저녁 직거래 예약 중입니다.',
      image: createPotatoSvgDataUri({
        emoji: '☕',
        subText: '드롱기 빈티지 머신',
        bgStart: '#FAF3E8',
        bgEnd: '#E8D6C0',
        accent: '#D4A373'
      }),
      seller: {
        nickname: '버터구이감자',
        region: '서울 성동구 성수동',
        avatar: createSellerAvatarSvg({ bg: '#F4EFE6', potatoColor: '#B88658' })
      }
    },
    {
      id: 'prod-4',
      title: '코지 울 블렌드 핸드메이드 하프 코트 (오트밀 베이지)',
      category: '의류',
      price: 62000,
      location: '서울 송파구 잠실동',
      timeAgo: '2시간 전',
      status: '판매중',
      description:
        '포근한 오트밀 베이지 색상의 핸드메이드 울 코트입니다.\n작년 겨울 구매 후 드라이클리닝 완료해 옷장에 보관만 해둔 상태라 보풀 없이 아주 깨끗합니다.\n잠실역 부근에서 직거래 가능해요.',
      image: createPotatoSvgDataUri({
        emoji: '🧥',
        subText: '울 핸드메이드 코트',
        bgStart: '#F9F4EE',
        bgEnd: '#E4D8CA',
        accent: '#A97C50'
      }),
      seller: {
        nickname: '찐감자라떼',
        region: '서울 송파구 잠실동',
        avatar: createSellerAvatarSvg({ bg: '#F7EFE6', potatoColor: '#CFA072' })
      }
    },
    {
      id: 'prod-5',
      title: '모던 자바스크립트 Deep Dive + 리액트 프로그래밍 도서 일괄',
      category: '도서/티켓',
      price: 28000,
      location: '경기 성남시 분당구 정자동',
      timeAgo: '3시간 전',
      status: '판매중',
      description:
        '프론트엔드 공부할 때 정독했던 개발 도서 2권 일괄 판매합니다.\n밑줄이나 필기 전혀 없고 표지 상태도 서점 새 책 수준으로 깨끗합니다.\n정자역 직거래 환영합니다!',
      image: createPotatoSvgDataUri({
        emoji: '📚',
        subText: '개발 도서 2권 세트',
        bgStart: '#F5EFE6',
        bgEnd: '#DFD0BC',
        accent: '#8B5E3C'
      }),
      seller: {
        nickname: '코딩하는감자',
        region: '경기 성남시 분당구 정자동',
        avatar: createSellerAvatarSvg({ bg: '#EFE4D4', potatoColor: '#BA8759' })
      }
    },
    {
      id: 'prod-6',
      title: '감성 피크닉 라탄 바구니 & 방수 체크 피크닉 매트 세트',
      category: '기타',
      price: 30000,
      location: '서울 용산구 한강로동',
      timeAgo: '어제',
      status: '거래 완료',
      description:
        '한강 피크닉 갈 때 한 번 사용했던 수제 라탄 바구니와 방수 체크 매트 세트입니다.\n사진도 정말 예쁘게 나오고 수납력도 좋습니다.\n좋은 이웃분께 거래 완료되었습니다. 감사합니다!',
      image: createPotatoSvgDataUri({
        emoji: '🧺',
        subText: '라탄 피크닉 세트',
        bgStart: '#F3ECE2',
        bgEnd: '#DDD0C0',
        accent: '#9E8E84'
      }),
      seller: {
        nickname: '햇감자소풍',
        region: '서울 용산구 한강로동',
        avatar: createSellerAvatarSvg({ bg: '#F4EFE6', potatoColor: '#C9986A' })
      }
    }
  ];

  // 글쓰기 화면 이미지 프리셋 설정
  const WRITE_PRESETS = {
    digital: { emoji: '💻', subText: '디지털기기', bgStart: '#FBF5EC', bgEnd: '#EAD8C3', accent: '#C89B6E' },
    furniture: { emoji: '🪑', subText: '가구/인테리어', bgStart: '#F6EFE6', bgEnd: '#E5D2B8', accent: '#B5835A' },
    fashion: { emoji: '🧥', subText: '포근한 의류', bgStart: '#F9F4EE', bgEnd: '#E4D8CA', accent: '#A97C50' },
    appliance: { emoji: '☕', subText: '생활가전', bgStart: '#FAF3E8', bgEnd: '#E8D6C0', accent: '#D4A373' },
    book: { emoji: '📚', subText: '도서/티켓', bgStart: '#F5EFE6', bgEnd: '#DFD0BC', accent: '#8B5E3C' },
    pet: { emoji: '🐾', subText: '반려동물 용품', bgStart: '#FDF6EC', bgEnd: '#ECD9C4', accent: '#C48B5C' },
    potato: { emoji: '🧺', subText: '감자네 보물', bgStart: '#F7EFE6', bgEnd: '#EEDCC8', accent: '#8B5E3C' }
  };

  const CATEGORY_TO_PRESET = {
    '디지털기기': 'digital',
    '가구/인테리어': 'furniture',
    '의류': 'fashion',
    '생활가전': 'appliance',
    '도서/티켓': 'book',
    '반려동물 용품': 'pet',
    '기타': 'potato'
  };

  const AVATAR_PRESET_STYLES = {
    'preset:avatar:1': { bg: '#F7EFE6', potatoColor: '#D4A373' },
    'preset:avatar:2': { bg: '#EFE4D4', potatoColor: '#C69264' },
    'preset:avatar:3': { bg: '#F4EFE6', potatoColor: '#B88658' },
    'preset:avatar:4': { bg: '#F7EFE6', potatoColor: '#CFA072' },
    'preset:avatar:5': { bg: '#EFE4D4', potatoColor: '#BA8759' },
    'preset:avatar:6': { bg: '#F4EFE6', potatoColor: '#C9986A' }
  };

  /* ==========================================================================
     2-1. Supabase 연동 설정 (products, profiles, wishes 테이블)
     ========================================================================== */
  const SUPABASE_URL = 'https://obiladthdzaxwdvqboso.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iaWxhZHRoZHpheHdkdnFib3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjQ0MDksImV4cCI6MjEwNzkwMDQwOX0.uDotO9aE3pKi1R51RSSC6l9lbf9fsU5ziUgaN0g8k4w';

  const supabaseClient =
    window.supabase && typeof window.supabase.createClient === 'function'
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;

  async function supabaseRestFetch(path, options = {}) {
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Supabase API Error (${response.status}): ${errText}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /* ==========================================================================
     3. 애플리케이션 상태 (State)
     ========================================================================== */
  const state = {
    products: [...INITIAL_PRODUCTS],
    authUser: null,
    currentUserProfile: null,
    pendingWriteAfterAuth: false,
    editingProductId: null,
    wishedProductIds: new Set(),
    currentDetailProductId: null,
    selectedCategory: '전체',
    searchQuery: '',
    availableOnly: false,
    currentScreen: 'list', // 'list' | 'write'
    writeUploadedImage: null,
    writeSelectedPreset: 'digital',
    isLoading: false,
    isSubmitting: false
  };

  /* ==========================================================================
     4. 공통 포맷터 & 헬퍼 함수
     ========================================================================== */
  function formatPrice(price) {
    const num = Number(price);
    if (Number.isNaN(num) || num < 0) return '0원';
    return `${num.toLocaleString('ko-KR')}원`;
  }

  function formatTimeAgo(dateInput) {
    if (!dateInput) return '방금 전';
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return String(dateInput);

    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    if (diffSec < 60) return '방금 전';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return '어제';
    if (diffDay < 30) return `${diffDay}일 전`;
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  }

  function resolveProductImage(rawImage, title, category) {
    if (rawImage && typeof rawImage === 'string') {
      if (rawImage.startsWith('preset:')) {
        const presetKey = rawImage.replace('preset:', '').trim();
        return buildWritePresetUri(presetKey, title);
      }
      if (rawImage.startsWith('data:image/') || rawImage.startsWith('http')) {
        return rawImage;
      }
    }
    const fallbackPreset = CATEGORY_TO_PRESET[category] || 'potato';
    return buildWritePresetUri(fallbackPreset, title);
  }

  function resolveSellerAvatar(rawAvatar) {
    if (rawAvatar && typeof rawAvatar === 'string') {
      if (AVATAR_PRESET_STYLES[rawAvatar]) {
        return createSellerAvatarSvg(AVATAR_PRESET_STYLES[rawAvatar]);
      }
      if (rawAvatar.startsWith('data:image/') || rawAvatar.startsWith('http')) {
        return rawAvatar;
      }
    }
    return createSellerAvatarSvg({ bg: '#F7EFE6', potatoColor: '#D4A373' });
  }

  function mapDbRowToProduct(row) {
    const joinedSeller = row.seller || null;
    const nickname =
      (joinedSeller && joinedSeller.nickname) || row.seller_nickname || '포슬감자';
    const region =
      (joinedSeller && joinedSeller.region) || row.seller_region || row.location || '서울 강남구 역삼동';
    const rawAvatar =
      (joinedSeller && joinedSeller.avatar_url) || row.seller_avatar || 'preset:avatar:1';
    const mannerTemp =
      joinedSeller && joinedSeller.manner_temp != null ? Number(joinedSeller.manner_temp) : 37.5;
    const normalizedStatus = resolveStatusInfo(row.status).text;

    return {
      id: String(row.id),
      title: row.title || '이름 없는 감자 상품',
      category: row.category || '기타',
      price: Number(row.price) || 0,
      location: row.location || '서울 강남구 역삼동',
      timeAgo: row.created_at ? formatTimeAgo(row.created_at) : '방금 전',
      createdAt: row.created_at || new Date().toISOString(),
      status: normalizedStatus,
      description: row.description || '',
      rawImageUrl: row.image_url || `preset:${CATEGORY_TO_PRESET[row.category] || 'potato'}`,
      image: resolveProductImage(row.image_url, row.title, row.category),
      sellerId: row.seller_id || (joinedSeller ? joinedSeller.id : null),
      seller: {
        id: row.seller_id || (joinedSeller ? joinedSeller.id : null),
        nickname,
        region,
        avatar: resolveSellerAvatar(rawAvatar),
        mannerTemp: mannerTemp.toFixed(1)
      }
    };
  }

  function resolveStatusInfo(status) {
    const normalized = String(status || '판매중').trim();
    if (normalized === '예약중') {
      return { text: '예약중', className: 'status-reserved' };
    }
    if (normalized === '거래 완료' || normalized === '거래완료') {
      return { text: '거래 완료', className: 'status-sold' };
    }
    return { text: '판매중', className: 'status-sale' };
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let toastTimer = null;
  function showToast(message) {
    const toastEl = document.getElementById('gamzaToast');
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 2600);
  }

  function getActiveNickname() {
    if (state.currentUserProfile && state.currentUserProfile.nickname) {
      return state.currentUserProfile.nickname;
    }
    if (
      state.authUser &&
      state.authUser.user_metadata &&
      state.authUser.user_metadata.nickname
    ) {
      return state.authUser.user_metadata.nickname;
    }
    if (state.authUser && state.authUser.email) {
      return state.authUser.email.split('@')[0];
    }
    return '포슬감자';
  }

  function isProductOwner(product) {
    if (!state.authUser || !product) return false;
    const myId = String(state.authUser.id);
    if (product.sellerId && String(product.sellerId) === myId) {
      return true;
    }
    if (product.seller && product.seller.id && String(product.seller.id) === myId) {
      return true;
    }
    const myNick = getActiveNickname();
    if (myNick && product.seller && product.seller.nickname === myNick) {
      return true;
    }
    return false;
  }

  /* ==========================================================================
     4-1. 상단 우측 버튼 전환 (로그인 전: [로그인] / 로그인 후: [닉네임] + [로그아웃])
     ========================================================================== */
  function updateHeaderAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userNicknameBtn = document.getElementById('userNicknameBtn');
    const userNicknameText = document.getElementById('userNicknameText');
    const logoutBtn = document.getElementById('logoutBtn');

    const isLoggedIn = Boolean(state.authUser);

    if (loginBtn) {
      loginBtn.hidden = isLoggedIn;
    }
    if (userNicknameBtn) {
      userNicknameBtn.hidden = !isLoggedIn;
    }
    if (logoutBtn) {
      logoutBtn.hidden = !isLoggedIn;
    }
    if (isLoggedIn && userNicknameText) {
      userNicknameText.textContent = getActiveNickname();
    }
  }

  /* ==========================================================================
     4-2. Supabase 데이터 조회 / 프로필 보장 API 함수
     ========================================================================== */
  async function ensureUserProfile(user, preferredNickname) {
    if (!user || !user.id) return null;

    const metaNick =
      preferredNickname ||
      (user.user_metadata && user.user_metadata.nickname) ||
      (user.email ? user.email.split('@')[0] : '포슬감자');
    const cleanNick = String(metaNick).trim().slice(0, 20) || '포슬감자';

    try {
      let existingProfile = null;
      if (supabaseClient) {
        const { data } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        existingProfile = data;
      } else {
        const rows = await supabaseRestFetch(
          `profiles?select=*&id=eq.${encodeURIComponent(user.id)}`
        );
        existingProfile = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      }

      if (existingProfile && (!preferredNickname || existingProfile.nickname === cleanNick)) {
        state.currentUserProfile = existingProfile;
        updateHeaderAuthUI();
        await loadUserWishes(user.id);
        return existingProfile;
      }

      const upsertPayload = {
        id: user.id,
        nickname: cleanNick,
        avatar_url: (existingProfile && existingProfile.avatar_url) || 'preset:avatar:1',
        region: (existingProfile && existingProfile.region) || '서울 강남구 역삼동',
        manner_temp:
          existingProfile && existingProfile.manner_temp != null
            ? existingProfile.manner_temp
            : 37.5
      };

      let savedProfile = upsertPayload;
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('profiles')
          .upsert(upsertPayload, { onConflict: 'id' })
          .select('*')
          .single();
        if (!error && data) savedProfile = data;
      } else {
        const rows = await supabaseRestFetch('profiles', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(upsertPayload)
        });
        if (Array.isArray(rows) && rows[0]) savedProfile = rows[0];
      }

      state.currentUserProfile = savedProfile;
      updateHeaderAuthUI();
      await loadUserWishes(user.id);
      return savedProfile;
    } catch (err) {
      console.error('프로필 동기화 실패:', err);
      state.currentUserProfile = {
        id: user.id,
        nickname: cleanNick,
        avatar_url: 'preset:avatar:1',
        region: '서울 강남구 역삼동',
        manner_temp: 37.5
      };
      updateHeaderAuthUI();
      return state.currentUserProfile;
    }
  }

  async function loadDatabaseData() {
    state.isLoading = true;
    try {
      let productsRows = [];

      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('products')
          .select('*, seller:profiles(id, nickname, avatar_url, region, manner_temp)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        productsRows = data || [];
      } else {
        productsRows =
          (await supabaseRestFetch(
            'products?select=*,seller:profiles(id,nickname,avatar_url,region,manner_temp)&order=created_at.desc'
          )) || [];
      }

      if (productsRows.length > 0) {
        state.products = productsRows.map(mapDbRowToProduct);
      }
      renderProductList();
    } catch (err) {
      console.error('Supabase 데이터 로드 실패 (기본 로컬 데이터로 표시):', err);
      renderProductList();
    } finally {
      state.isLoading = false;
    }
  }

  async function loadUserWishes(userId) {
    if (!userId) {
      state.wishedProductIds.clear();
      return;
    }
    try {
      let wishRows = [];
      if (supabaseClient) {
        const { data, error } = await supabaseClient
          .from('wishes')
          .select('product_id')
          .eq('user_id', userId);
        if (error) throw error;
        wishRows = data || [];
      } else {
        wishRows =
          (await supabaseRestFetch(`wishes?select=product_id&user_id=eq.${encodeURIComponent(userId)}`)) || [];
      }
      state.wishedProductIds = new Set(wishRows.map((w) => String(w.product_id)));
    } catch (err) {
      console.error('관심 상품 목록 로드 실패:', err);
    }
  }

  /* ==========================================================================
     5. [화면 1] 상품 목록 렌더링 및 필터링
     ========================================================================== */
  function getFilteredProducts() {
    const query = state.searchQuery.trim().toLowerCase();

    return state.products.filter((item) => {
      const normalizedStatus = resolveStatusInfo(item.status).text;
      const matchCategory =
        state.selectedCategory === '전체' || item.category === state.selectedCategory;
      // '거래 가능만 보기' 활성화 시 거래 완료 및 예약중 글을 제외하고 '판매중' 상태만 표시
      const matchAvailable = !state.availableOnly || normalizedStatus === '판매중';
      const sellerNick = item.seller && item.seller.nickname ? item.seller.nickname.toLowerCase() : '';
      const matchSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        sellerNick.includes(query);

      return matchCategory && matchAvailable && matchSearch;
    });
  }

  function renderProductList() {
    const gridEl = document.getElementById('productGrid');
    const emptyEl = document.getElementById('emptyState');
    const countEl = document.getElementById('productCount');
    const summaryEl = document.getElementById('activeFilterSummary');

    if (!gridEl) return;

    const filtered = getFilteredProducts();

    if (countEl) {
      countEl.textContent = String(filtered.length);
    }

    if (summaryEl) {
      const activeTags = [];
      if (state.selectedCategory !== '전체') activeTags.push(`[${state.selectedCategory}]`);
      if (state.availableOnly) activeTags.push('[거래 가능만]');
      if (state.searchQuery.trim()) activeTags.push(`"${state.searchQuery.trim()}" 검색`);
      summaryEl.textContent = activeTags.length > 0 ? `· ${activeTags.join(' ')}` : '';
    }

    if (filtered.length === 0) {
      gridEl.innerHTML = '';
      gridEl.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    gridEl.hidden = false;
    if (emptyEl) emptyEl.hidden = true;

    // 카드 구성 요소: 대표 이미지, 상품명, 판매 위치, 업로드 시간, 작성자 닉네임, 가격, 판매 상태 배지
    gridEl.innerHTML = filtered
      .map((product) => {
        const statusInfo = resolveStatusInfo(product.status);
        const isSold = statusInfo.text === '거래 완료';
        const priceText = formatPrice(product.price);
        const safeTitle = escapeHtml(product.title);
        const safeLocation = escapeHtml(product.location);
        const safeTime = escapeHtml(
          product.createdAt ? formatTimeAgo(product.createdAt) : product.timeAgo
        );
        const safeCategory = escapeHtml(product.category);
        const safeSellerNickname = escapeHtml(
          product.seller && product.seller.nickname ? product.seller.nickname : '포슬감자'
        );

        return `
          <article
            class="product-card${isSold ? ' is-sold' : ''}"
            role="listitem"
            tabindex="0"
            data-product-id="${escapeHtml(product.id)}"
            data-status="${escapeHtml(statusInfo.text)}"
            aria-label="${safeTitle}, ${priceText}, 작성자 ${safeSellerNickname}, ${escapeHtml(statusInfo.text)}, ${safeLocation}"
          >
            <div class="card-image-wrap">
              <img
                src="${product.image}"
                alt="${safeTitle}"
                class="card-image"
                loading="lazy"
              />
              <span class="card-category-tag">${safeCategory}</span>
              <span class="status-badge ${statusInfo.className} card-status-top-badge">${escapeHtml(statusInfo.text)}</span>
            </div>
            <div class="card-body">
              <h2 class="card-title">${safeTitle}</h2>
              <div class="card-meta">
                <span class="card-location">📍 ${safeLocation}</span>
                <span class="meta-divider" aria-hidden="true">·</span>
                <time class="card-time">${safeTime}</time>
              </div>
              <div class="card-seller-row">
                <span class="card-seller-badge" title="글쓴이 닉네임">🥔 ${safeSellerNickname}</span>
              </div>
              <div class="card-footer">
                <span class="card-price">${priceText}</span>
                <span class="status-badge ${statusInfo.className}">${escapeHtml(statusInfo.text)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function resetAllFilters() {
    state.selectedCategory = '전체';
    state.searchQuery = '';
    state.availableOnly = false;

    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const availableBtn = document.getElementById('availableOnlyBtn');
    const categoryBtns = document.querySelectorAll('.category-btn');

    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.hidden = true;
    if (availableBtn) availableBtn.setAttribute('aria-pressed', 'false');

    categoryBtns.forEach((btn) => {
      const isAll = btn.getAttribute('data-category') === '전체';
      btn.classList.toggle('active', isAll);
      btn.setAttribute('aria-selected', isAll ? 'true' : 'false');
    });

    renderProductList();
  }

  /* ==========================================================================
     6. [화면 2] 상세 팝업 모달 제어 (작성자 상태 변경 · 수정 · 삭제 연동)
     ========================================================================== */
  function syncOwnerStatusButtons(activeStatusText) {
    const groupEl = document.getElementById('ownerStatusGroup');
    if (!groupEl) return;
    const normalized = resolveStatusInfo(activeStatusText).text;
    groupEl.querySelectorAll('.owner-status-btn').forEach((btn) => {
      const btnVal = btn.getAttribute('data-status-value');
      const isMatch = btnVal === normalized;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
    });
  }

  async function updateProductStatusInDb(productId, nextStatus) {
    const product = state.products.find((p) => String(p.id) === String(productId));
    if (!product) return;

    const normalizedNext = resolveStatusInfo(nextStatus).text;
    const statusEl = document.getElementById('detailStatus');

    try {
      if (supabaseClient) {
        const { error } = await supabaseClient
          .from('products')
          .update({ status: normalizedNext })
          .eq('id', productId);
        if (error) throw error;
      } else {
        await supabaseRestFetch(`products?id=eq.${encodeURIComponent(productId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: normalizedNext })
        });
      }

      product.status = normalizedNext;
      const nextInfo = resolveStatusInfo(normalizedNext);
      if (statusEl) {
        statusEl.textContent = nextInfo.text;
        statusEl.className = `status-badge ${nextInfo.className}`;
      }
      syncOwnerStatusButtons(normalizedNext);
      renderProductList();
      showToast(`🥔 판매 상태가 '${normalizedNext}'(으)로 저장되었어요!`);
    } catch (err) {
      console.error('판매 상태 업데이트 실패:', err);
      showToast('⚠️ 판매 상태 변경 중 오류가 발생했어요.');
    }
  }

  function openProductDetail(productId) {
    const product = state.products.find((p) => String(p.id) === String(productId));
    if (!product) return;

    state.currentDetailProductId = String(product.id);

    const dialog = document.getElementById('detailModal');
    if (!dialog) return;

    const imageEl = document.getElementById('detailImage');
    const statusEl = document.getElementById('detailStatus');
    const categoryEl = document.getElementById('detailCategory');
    const titleEl = document.getElementById('detailTitle');
    const locationEl = document.getElementById('detailLocation');
    const timeEl = document.getElementById('detailTime');
    const priceEl = document.getElementById('detailPrice');
    const descEl = document.getElementById('detailDescription');
    const sellerAvatarEl = document.getElementById('sellerAvatar');
    const sellerNicknameEl = document.getElementById('sellerNickname');
    const sellerRegionEl = document.getElementById('sellerRegion');
    const sellerMannerTempEl = document.getElementById('sellerMannerTemp');
    const ownerControlBox = document.getElementById('ownerControlBox');
    const wishBtn = document.getElementById('wishBtn');
    const wishIcon = document.getElementById('wishIcon');

    // 위쪽 절반: 상품 이미지
    if (imageEl) {
      imageEl.src = product.image;
      imageEl.alt = `${product.title} 상품 이미지`;
    }

    // 아래 순서: 1) 판매 상태 -> 2) 카테고리 -> 3) 상품명 -> 4) 판매 위치 -> 5) 업로드 시간 -> 6) 가격 -> 7) 상품 설명
    const statusInfo = resolveStatusInfo(product.status);
    const isOwner = isProductOwner(product);

    if (statusEl) {
      statusEl.textContent = statusInfo.text;
      statusEl.className = `status-badge ${statusInfo.className}`;
      statusEl.title = isOwner
        ? '클릭하여 판매 상태 변경 (판매중 → 예약중 → 거래 완료)'
        : `현재 상태: ${statusInfo.text}`;
      statusEl.style.cursor = isOwner ? 'pointer' : 'default';
    }

    if (categoryEl) {
      categoryEl.textContent = product.category;
    }

    if (titleEl) {
      titleEl.textContent = product.title;
    }

    if (locationEl) {
      locationEl.textContent = product.location;
    }

    if (timeEl) {
      timeEl.textContent = product.createdAt
        ? formatTimeAgo(product.createdAt)
        : product.timeAgo;
    }

    if (priceEl) {
      priceEl.textContent = formatPrice(product.price);
    }

    if (descEl) {
      descEl.textContent = product.description;
    }

    // 판매자 정보: 닉네임, 프로필 이미지, 판매 지역, 포슬온도
    const seller = product.seller || {};
    const sellerNickname = seller.nickname || '포슬감자';
    const sellerRegion = seller.region || product.location;
    const sellerAvatar = seller.avatar || createSellerAvatarSvg();
    const sellerTemp = seller.mannerTemp || '37.5';

    if (sellerAvatarEl) {
      sellerAvatarEl.src = sellerAvatar;
      sellerAvatarEl.alt = `${sellerNickname} 프로필 이미지`;
    }
    if (sellerNicknameEl) {
      sellerNicknameEl.textContent = sellerNickname;
    }
    if (sellerRegionEl) {
      sellerRegionEl.textContent = sellerRegion;
    }
    if (sellerMannerTempEl) {
      sellerMannerTempEl.textContent = `포슬온도 ${sellerTemp}°C 🥔`;
    }

    // 자신이 쓴 게시글일 때만 [판매중/예약중/거래 완료] 선택 버튼과 [수정/삭제] 버튼 표시
    if (ownerControlBox) {
      ownerControlBox.hidden = !isOwner;
    }
    syncOwnerStatusButtons(statusInfo.text);

    // 관심 추가 버튼 상태 (wishes 테이블 연동 반영)
    const isWished = state.wishedProductIds.has(String(product.id));
    if (wishBtn) {
      wishBtn.classList.toggle('is-active', isWished);
      wishBtn.setAttribute('aria-pressed', String(isWished));
    }
    if (wishIcon) {
      wishIcon.textContent = isWished ? '🤎' : '🤍';
    }

    const scrollArea = dialog.querySelector('.detail-modal__scroll-area');
    if (scrollArea) {
      scrollArea.scrollTop = 0;
    }

    if (!dialog.open) {
      dialog.showModal();
    }
  }

  function openEditProductScreen(product) {
    if (!product) return;
    state.editingProductId = String(product.id);

    const writeTitleEl = document.getElementById('writeScreenTitle');
    const submitBtn = document.getElementById('submitWriteBtn');
    const titleInput = document.getElementById('writeTitle');
    const titleCount = document.getElementById('writeTitleCount');
    const categorySelect = document.getElementById('writeCategory');
    const priceInput = document.getElementById('writePrice');
    const priceFormatted = document.getElementById('writePriceFormatted');
    const descInput = document.getElementById('writeDescription');
    const descCount = document.getElementById('writeDescCount');
    const locationInput = document.getElementById('writeLocation');
    const writeForm = document.getElementById('writeForm');
    const presetChips = document.querySelectorAll('#writePresetList .preset-chip');

    if (writeTitleEl) writeTitleEl.textContent = '내 물건 수정하기';
    if (submitBtn) {
      submitBtn.innerHTML = '<span aria-hidden="true">✏️</span><span>수정 완료</span>';
    }

    if (titleInput) {
      titleInput.value = product.title || '';
      if (titleCount) titleCount.textContent = `${titleInput.value.length} / 40자`;
    }
    if (categorySelect) {
      categorySelect.value = product.category || '디지털기기';
    }
    if (priceInput) {
      priceInput.value = String(product.price ?? 0);
      if (priceFormatted) priceFormatted.textContent = formatPrice(product.price ?? 0);
    }
    if (descInput) {
      descInput.value = product.description || '';
      if (descCount) {
        descCount.textContent = `${descInput.value.length.toLocaleString('ko-KR')} / 500자`;
      }
    }
    if (locationInput) {
      locationInput.value = product.location || '서울 강남구 역삼동';
    }
    if (writeForm) {
      const normalizedStatus = resolveStatusInfo(product.status).text;
      const radio = writeForm.querySelector(
        `input[name="writeStatus"][value="${normalizedStatus}"]`
      );
      if (radio) radio.checked = true;
    }

    const rawImg = product.rawImageUrl || '';
    if (rawImg.startsWith('preset:')) {
      state.writeUploadedImage = null;
      const presetKey = rawImg.replace('preset:', '').trim() || 'digital';
      state.writeSelectedPreset = presetKey;
      presetChips.forEach((chip) => {
        const isMatch = chip.getAttribute('data-preset') === presetKey;
        chip.classList.toggle('active', isMatch);
        chip.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      });
    } else if (rawImg.startsWith('data:image/') || rawImg.startsWith('http')) {
      state.writeUploadedImage = rawImg;
    } else {
      state.writeUploadedImage = null;
      state.writeSelectedPreset = CATEGORY_TO_PRESET[product.category] || 'digital';
    }

    showScreen('write');
  }

  function initDetailModal() {
    const dialog = document.getElementById('detailModal');
    if (!dialog) return;

    const closeBtn = document.getElementById('closeDetailBtn');
    const statusEl = document.getElementById('detailStatus');
    const ownerStatusGroup = document.getElementById('ownerStatusGroup');
    const editProductBtn = document.getElementById('editProductBtn');
    const deleteProductBtn = document.getElementById('deleteProductBtn');
    const wishBtn = document.getElementById('wishBtn');
    const wishIcon = document.getElementById('wishIcon');
    const chatBtn = document.getElementById('chatBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        dialog.close();
      });
    }

    // Light Dismiss Fallback: closedby="any" 미지원 브라우저에서 모달 바깥(backdrop) 클릭 시 닫기
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;

        if (!isDialogContent) {
          dialog.close();
        }
      });
    }

    // 작성자 전용 [판매중 / 예약중 / 거래 완료] 선택 버튼 클릭 시 Supabase 업데이트
    if (ownerStatusGroup) {
      ownerStatusGroup.addEventListener('click', async (e) => {
        const btn = e.target.closest('.owner-status-btn');
        if (!btn) return;
        const productId = state.currentDetailProductId;
        if (!productId) return;
        const product = state.products.find((p) => String(p.id) === String(productId));
        if (!product || !isProductOwner(product)) return;

        const nextStatus = btn.getAttribute('data-status-value');
        if (!nextStatus || nextStatus === product.status) return;

        await updateProductStatusInDb(productId, nextStatus);
      });
    }

    // 상세 팝업 상단 판매 상태 배지 클릭 시 (작성자인 경우 순환 변경)
    if (statusEl) {
      statusEl.addEventListener('click', async () => {
        const productId = state.currentDetailProductId;
        if (!productId) return;
        const product = state.products.find((p) => String(p.id) === String(productId));
        if (!product || !isProductOwner(product)) return;

        const statusOrder = ['판매중', '예약중', '거래 완료'];
        const currentIdx = statusOrder.indexOf(resolveStatusInfo(product.status).text);
        const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length];

        await updateProductStatusInDb(productId, nextStatus);
      });
    }

    // 작성자 전용 [수정] 버튼 클릭
    if (editProductBtn) {
      editProductBtn.addEventListener('click', () => {
        const productId = state.currentDetailProductId;
        if (!productId) return;
        const product = state.products.find((p) => String(p.id) === String(productId));
        if (!product || !isProductOwner(product)) return;

        dialog.close();
        openEditProductScreen(product);
      });
    }

    // 작성자 전용 [삭제] 버튼 클릭 -> Supabase DB에서 삭제 및 목록 반영
    if (deleteProductBtn) {
      deleteProductBtn.addEventListener('click', async () => {
        const productId = state.currentDetailProductId;
        if (!productId) return;
        const product = state.products.find((p) => String(p.id) === String(productId));
        if (!product || !isProductOwner(product)) return;

        const origHtml = deleteProductBtn.innerHTML;
        deleteProductBtn.disabled = true;
        deleteProductBtn.innerHTML = '<span>삭제 중...</span>';

        try {
          if (supabaseClient) {
            const { error } = await supabaseClient
              .from('products')
              .delete()
              .eq('id', productId);
            if (error) throw error;
          } else {
            await supabaseRestFetch(`products?id=eq.${encodeURIComponent(productId)}`, {
              method: 'DELETE'
            });
          }

          state.products = state.products.filter((p) => String(p.id) !== String(productId));
          state.wishedProductIds.delete(String(productId));
          state.currentDetailProductId = null;
          dialog.close();
          renderProductList();
          showToast('🗑️ 게시글이 삭제되었어요.');
        } catch (err) {
          console.error('게시글 삭제 실패:', err);
          showToast('⚠️ 게시글 삭제 중 오류가 발생했어요.');
        } finally {
          deleteProductBtn.disabled = false;
          deleteProductBtn.innerHTML = origHtml;
        }
      });
    }

    // 관심 추가 버튼 클릭 시 Supabase wishes 테이블에 INSERT / DELETE
    if (wishBtn) {
      wishBtn.addEventListener('click', async () => {
        const productId = state.currentDetailProductId;
        if (!productId) return;

        const userProfile = state.currentUserProfile;
        const wasActive = wishBtn.classList.contains('is-active');
        const nextActive = !wasActive;

        // 낙관적 UI 반영
        wishBtn.classList.toggle('is-active', nextActive);
        wishBtn.setAttribute('aria-pressed', String(nextActive));
        if (wishIcon) {
          wishIcon.textContent = nextActive ? '🤎' : '🤍';
        }

        if (!userProfile || !userProfile.id) {
          if (nextActive) state.wishedProductIds.add(String(productId));
          else state.wishedProductIds.delete(String(productId));
          showToast(nextActive ? '🥔 관심 상품에 추가했어요!' : '🥔 관심 상품에서 해제했어요.');
          return;
        }

        try {
          if (nextActive) {
            if (supabaseClient) {
              const { error } = await supabaseClient
                .from('wishes')
                .upsert(
                  { user_id: userProfile.id, product_id: productId },
                  { onConflict: 'user_id,product_id' }
                );
              if (error) throw error;
            } else {
              await supabaseRestFetch('wishes', {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates' },
                body: JSON.stringify({ user_id: userProfile.id, product_id: productId })
              });
            }
            state.wishedProductIds.add(String(productId));
            showToast('🥔 관심 상품에 추가했어요!');
          } else {
            if (supabaseClient) {
              const { error } = await supabaseClient
                .from('wishes')
                .delete()
                .eq('user_id', userProfile.id)
                .eq('product_id', productId);
              if (error) throw error;
            } else {
              await supabaseRestFetch(
                `wishes?user_id=eq.${encodeURIComponent(userProfile.id)}&product_id=eq.${encodeURIComponent(productId)}`,
                { method: 'DELETE' }
              );
            }
            state.wishedProductIds.delete(String(productId));
            showToast('🥔 관심 상품에서 해제했어요.');
          }
        } catch (err) {
          console.error('관심 상품 DB 반영 실패:', err);
          wishBtn.classList.toggle('is-active', wasActive);
          wishBtn.setAttribute('aria-pressed', String(wasActive));
          if (wishIcon) {
            wishIcon.textContent = wasActive ? '🤎' : '🤍';
          }
          showToast('⚠️ 관심 상품 저장 중 오류가 발생했어요.');
        }
      });
    }

    if (chatBtn) {
      chatBtn.addEventListener('click', () => {
        const product = state.products.find(
          (p) => String(p.id) === String(state.currentDetailProductId)
        );
        const targetNick = product && product.seller ? product.seller.nickname : '판매자';
        showToast(`💬 '${targetNick}' 이웃님과의 채팅 기능은 다음 단계에서 연결될 예정이에요!`);
      });
    }
  }

  /* ==========================================================================
     7. 화면 전환 (목록 화면 <-> 글쓰기 화면)
     ========================================================================== */
  function showScreen(screenName) {
    const listScreen = document.getElementById('listScreen');
    const writeScreen = document.getElementById('writeScreen');
    const openWriteBtn = document.getElementById('openWriteBtn');

    state.currentScreen = screenName;

    if (screenName === 'write') {
      if (listScreen) listScreen.hidden = true;
      if (writeScreen) writeScreen.hidden = false;
      if (openWriteBtn) openWriteBtn.setAttribute('aria-expanded', 'true');
      updateWriteImagePreview();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (writeScreen) writeScreen.hidden = true;
      if (listScreen) listScreen.hidden = false;
      if (openWriteBtn) openWriteBtn.setAttribute('aria-expanded', 'false');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ==========================================================================
     8. [화면 3] 글쓰기/수정 폼 제어 및 Supabase INSERT/UPDATE 연동
     ========================================================================== */
  function buildWritePresetUri(presetKey, titleHint) {
    const preset = WRITE_PRESETS[presetKey] || WRITE_PRESETS.potato;
    const label = titleHint && titleHint.trim() ? titleHint.trim() : preset.subText;
    return createPotatoSvgDataUri({
      emoji: preset.emoji,
      subText: label,
      bgStart: preset.bgStart,
      bgEnd: preset.bgEnd,
      accent: preset.accent
    });
  }

  function updateWriteImagePreview() {
    const previewImg = document.getElementById('writeImagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const titleInput = document.getElementById('writeTitle');
    if (!previewImg) return;

    if (state.writeUploadedImage) {
      previewImg.src = state.writeUploadedImage;
      if (removeBtn) removeBtn.hidden = false;
    } else {
      const hint = titleInput ? titleInput.value : '';
      previewImg.src = buildWritePresetUri(state.writeSelectedPreset, hint);
      if (removeBtn) removeBtn.hidden = true;
    }
  }

  function initWriteScreen() {
    const writeForm = document.getElementById('writeForm');
    if (!writeForm) return;

    const cancelWriteBtn = document.getElementById('cancelWriteBtn');
    const imageDropZone = document.getElementById('imageDropZone');
    const writeImageInput = document.getElementById('writeImageInput');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const triggerFileSelectBtn = document.getElementById('triggerFileSelectBtn');
    const presetChips = document.querySelectorAll('#writePresetList .preset-chip');

    const writeTitle = document.getElementById('writeTitle');
    const writeTitleCount = document.getElementById('writeTitleCount');
    const writeCategory = document.getElementById('writeCategory');
    const writePrice = document.getElementById('writePrice');
    const writePriceFormatted = document.getElementById('writePriceFormatted');
    const writeDescription = document.getElementById('writeDescription');
    const writeDescCount = document.getElementById('writeDescCount');
    const writeLocation = document.getElementById('writeLocation');
    const locationChips = document.querySelectorAll('.location-chip');
    const errorBanner = document.getElementById('writeErrorBanner');
    const errorMessage = document.getElementById('writeErrorMessage');

    function setActivePreset(presetKey) {
      state.writeSelectedPreset = presetKey;
      presetChips.forEach((chip) => {
        const isMatch = chip.getAttribute('data-preset') === presetKey;
        chip.classList.toggle('active', isMatch);
        chip.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
      });
      if (!state.writeUploadedImage) {
        updateWriteImagePreview();
      }
    }

    function setFieldError(inputEl, errorId, isInvalid) {
      const errEl = document.getElementById(errorId);
      if (inputEl) inputEl.classList.toggle('input-invalid', isInvalid);
      if (errEl) errEl.hidden = !isInvalid;
    }

    function handleFileUpload(file) {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('⚠️ 이미지 파일만 업로드할 수 있어요.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        state.writeUploadedImage = e.target.result;
        updateWriteImagePreview();
      };
      reader.readAsDataURL(file);
    }

    function resetWriteForm() {
      writeForm.reset();
      state.editingProductId = null;
      state.writeUploadedImage = null;
      const writeTitleEl = document.getElementById('writeScreenTitle');
      const submitBtn = document.getElementById('submitWriteBtn');
      if (writeTitleEl) writeTitleEl.textContent = '내 물건 팔기';
      if (submitBtn) {
        submitBtn.innerHTML = '<span aria-hidden="true">🥔</span><span>작성 완료</span>';
      }
      if (writeImageInput) writeImageInput.value = '';
      if (writeLocation) {
        writeLocation.value =
          (state.currentUserProfile && state.currentUserProfile.region) || '서울 강남구 역삼동';
      }
      if (writeTitleCount) writeTitleCount.textContent = '0 / 40자';
      if (writeDescCount) writeDescCount.textContent = '0 / 500자';
      if (writePriceFormatted) writePriceFormatted.textContent = '0원';
      if (errorBanner) errorBanner.hidden = true;

      setFieldError(writeTitle, 'writeTitleError', false);
      setFieldError(writeCategory, 'writeCategoryError', false);
      setFieldError(writePrice, 'writePriceError', false);
      setFieldError(writeDescription, 'writeDescriptionError', false);
      setFieldError(writeLocation, 'writeLocationError', false);

      setActivePreset('digital');
      updateWriteImagePreview();
    }

    window.resetGamzaWriteForm = resetWriteForm;

    if (cancelWriteBtn) {
      cancelWriteBtn.addEventListener('click', () => {
        resetWriteForm();
        showScreen('list');
      });
    }

    if (imageDropZone && writeImageInput) {
      imageDropZone.addEventListener('click', (e) => {
        if (e.target === removeImageBtn) return;
        writeImageInput.click();
      });

      imageDropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          writeImageInput.click();
        }
      });

      imageDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageDropZone.classList.add('drag-over');
      });

      imageDropZone.addEventListener('dragleave', () => {
        imageDropZone.classList.remove('drag-over');
      });

      imageDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageDropZone.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileUpload(e.dataTransfer.files[0]);
        }
      });

      writeImageInput.addEventListener('change', () => {
        if (writeImageInput.files && writeImageInput.files[0]) {
          handleFileUpload(writeImageInput.files[0]);
        }
      });
    }

    if (triggerFileSelectBtn && writeImageInput) {
      triggerFileSelectBtn.addEventListener('click', () => {
        writeImageInput.click();
      });
    }

    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.writeUploadedImage = null;
        if (writeImageInput) writeImageInput.value = '';
        updateWriteImagePreview();
      });
    }

    presetChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const presetKey = chip.getAttribute('data-preset') || 'potato';
        state.writeUploadedImage = null;
        if (writeImageInput) writeImageInput.value = '';
        setActivePreset(presetKey);
      });
    });

    if (writeCategory) {
      writeCategory.addEventListener('change', () => {
        setFieldError(writeCategory, 'writeCategoryError', false);
        const mappedPreset = CATEGORY_TO_PRESET[writeCategory.value];
        if (mappedPreset && !state.writeUploadedImage) {
          setActivePreset(mappedPreset);
        }
      });
    }

    if (writeTitle) {
      writeTitle.addEventListener('input', () => {
        if (writeTitleCount) {
          writeTitleCount.textContent = `${writeTitle.value.length} / 40자`;
        }
        if (writeTitle.value.trim().length >= 2) {
          setFieldError(writeTitle, 'writeTitleError', false);
        }
        if (!state.writeUploadedImage) {
          updateWriteImagePreview();
        }
      });
    }

    if (writePrice) {
      writePrice.addEventListener('input', () => {
        const raw = writePrice.value.trim();
        const num = Number(raw);
        if (raw !== '' && !Number.isNaN(num) && num >= 0) {
          setFieldError(writePrice, 'writePriceError', false);
          if (writePriceFormatted) {
            writePriceFormatted.textContent = formatPrice(num);
          }
        } else if (writePriceFormatted) {
          writePriceFormatted.textContent = '0원';
        }
      });
    }

    if (writeDescription) {
      writeDescription.addEventListener('input', () => {
        if (writeDescription.value.length > 500) {
          writeDescription.value = writeDescription.value.slice(0, 500);
        }
        if (writeDescCount) {
          writeDescCount.textContent = `${writeDescription.value.length.toLocaleString('ko-KR')} / 500자`;
        }
        if (writeDescription.value.trim().length >= 5) {
          setFieldError(writeDescription, 'writeDescriptionError', false);
        }
      });
    }

    locationChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const loc = chip.getAttribute('data-location');
        if (writeLocation && loc) {
          writeLocation.value = loc;
          setFieldError(writeLocation, 'writeLocationError', false);
        }
      });
    });

    if (writeLocation) {
      writeLocation.addEventListener('input', () => {
        if (writeLocation.value.trim().length >= 2) {
          setFieldError(writeLocation, 'writeLocationError', false);
        }
      });
    }

    writeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (state.isSubmitting) return;

      // 로그인하지 않은 상태라면 로그인 모달을 먼저 띄우고 로그인 후 이어서 작성하도록 유도
      if (!state.authUser) {
        state.pendingWriteAfterAuth = true;
        openAuthModal('login', { fromWrite: true });
        return;
      }

      const titleVal = writeTitle ? writeTitle.value.trim() : '';
      const categoryVal = writeCategory ? writeCategory.value : '';
      const priceRaw = writePrice ? writePrice.value.trim() : '';
      const priceVal = Number(priceRaw);
      const descVal = writeDescription ? writeDescription.value.trim() : '';
      const locationVal = writeLocation ? writeLocation.value.trim() : '';
      const checkedStatus = writeForm.querySelector('input[name="writeStatus"]:checked');
      const statusVal = checkedStatus ? checkedStatus.value : '판매중';

      let hasError = false;
      let firstInvalid = null;

      if (titleVal.length < 2) {
        setFieldError(writeTitle, 'writeTitleError', true);
        hasError = true;
        firstInvalid = firstInvalid || writeTitle;
      } else {
        setFieldError(writeTitle, 'writeTitleError', false);
      }

      if (!categoryVal) {
        setFieldError(writeCategory, 'writeCategoryError', true);
        hasError = true;
        firstInvalid = firstInvalid || writeCategory;
      } else {
        setFieldError(writeCategory, 'writeCategoryError', false);
      }

      if (priceRaw === '' || Number.isNaN(priceVal) || priceVal < 0) {
        setFieldError(writePrice, 'writePriceError', true);
        hasError = true;
        firstInvalid = firstInvalid || writePrice;
      } else {
        setFieldError(writePrice, 'writePriceError', false);
      }

      if (descVal.length < 5 || descVal.length > 500) {
        setFieldError(writeDescription, 'writeDescriptionError', true);
        hasError = true;
        firstInvalid = firstInvalid || writeDescription;
      } else {
        setFieldError(writeDescription, 'writeDescriptionError', false);
      }

      if (locationVal.length < 2) {
        setFieldError(writeLocation, 'writeLocationError', true);
        hasError = true;
        firstInvalid = firstInvalid || writeLocation;
      } else {
        setFieldError(writeLocation, 'writeLocationError', false);
      }

      if (hasError) {
        if (errorBanner && errorMessage) {
          errorMessage.textContent = '필수 입력 항목을 모두 올바르게 입력해 주세요.';
          errorBanner.hidden = false;
        }
        if (firstInvalid && typeof firstInvalid.focus === 'function') {
          firstInvalid.focus();
        }
        return;
      }

      if (errorBanner) errorBanner.hidden = true;

      const submitBtn = document.getElementById('submitWriteBtn');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      state.isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span aria-hidden="true">🥔</span><span>저장 중...</span>';
      }

      try {
        const activeProfile =
          state.currentUserProfile || (await ensureUserProfile(state.authUser));
        const sellerId = state.authUser ? state.authUser.id : null;
        const sellerNickname = getActiveNickname();
        const sellerAvatar =
          (activeProfile && activeProfile.avatar_url) || 'preset:avatar:1';
        const sellerRegion =
          locationVal || (activeProfile && activeProfile.region) || '서울 강남구 역삼동';

        const rawImageForDb =
          state.writeUploadedImage || `preset:${state.writeSelectedPreset || 'potato'}`;

        // 1) 수정 모드인 경우 (기존 게시글 UPDATE)
        if (state.editingProductId) {
          const targetId = state.editingProductId;
          const updatePayload = {
            image_url: rawImageForDb,
            title: titleVal,
            category: categoryVal,
            price: Math.round(priceVal),
            description: descVal,
            location: locationVal,
            status: statusVal,
            seller_region: sellerRegion
          };

          let updatedRow = null;
          if (supabaseClient) {
            const { data, error } = await supabaseClient
              .from('products')
              .update(updatePayload)
              .eq('id', targetId)
              .select('*, seller:profiles(id, nickname, avatar_url, region, manner_temp)')
              .single();
            if (error) throw error;
            updatedRow = data;
          } else {
            const rows = await supabaseRestFetch(
              `products?id=eq.${encodeURIComponent(targetId)}&select=*,seller:profiles(id,nickname,avatar_url,region,manner_temp)`,
              {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify(updatePayload)
              }
            );
            updatedRow = Array.isArray(rows) ? rows[0] : rows;
          }

          const idx = state.products.findIndex((p) => String(p.id) === String(targetId));
          if (idx !== -1) {
            state.products[idx] = updatedRow
              ? mapDbRowToProduct(updatedRow)
              : {
                  ...state.products[idx],
                  title: titleVal,
                  category: categoryVal,
                  price: Math.round(priceVal),
                  description: descVal,
                  location: locationVal,
                  status: resolveStatusInfo(statusVal).text,
                  rawImageUrl: rawImageForDb,
                  image: resolveProductImage(rawImageForDb, titleVal, categoryVal)
                };
          }

          resetWriteForm();
          renderProductList();
          showScreen('list');
          showToast('✏️ 게시글이 수정되었어요!');
          return;
        }

        // 2) 새 글 등록 모드인 경우 (INSERT)
        const insertPayload = {
          image_url: rawImageForDb,
          title: titleVal,
          category: categoryVal,
          price: Math.round(priceVal),
          description: descVal,
          location: locationVal,
          status: statusVal,
          seller_id: sellerId,
          seller_nickname: sellerNickname,
          seller_avatar: sellerAvatar,
          seller_region: sellerRegion
        };

        let insertedRow = null;
        if (supabaseClient) {
          const { data, error } = await supabaseClient
            .from('products')
            .insert([insertPayload])
            .select('*, seller:profiles(id, nickname, avatar_url, region, manner_temp)')
            .single();
          if (error) throw error;
          insertedRow = data;
        } else {
          const rows = await supabaseRestFetch(
            'products?select=*,seller:profiles(id,nickname,avatar_url,region,manner_temp)',
            {
              method: 'POST',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify(insertPayload)
            }
          );
          insertedRow = Array.isArray(rows) ? rows[0] : rows;
        }

        const createdProduct = insertedRow
          ? mapDbRowToProduct(insertedRow)
          : mapDbRowToProduct({
              ...insertPayload,
              id: 'prod-' + Date.now(),
              created_at: new Date().toISOString()
            });

        state.products.unshift(createdProduct);

        resetWriteForm();
        resetAllFilters();
        showScreen('list');
        showToast(`🥔 '${sellerNickname}'님의 새 감자 상품이 등록되었어요!`);
      } catch (err) {
        console.error('Supabase 상품 저장 실패:', err);
        showToast('⚠️ 상품 저장 중 오류가 발생했어요. 다시 시도해 주세요.');
      } finally {
        state.isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    });

    updateWriteImagePreview();
  }

  /* ==========================================================================
     8-1. 로그인 / 회원가입 모달 (#authModal) & Supabase Auth 연동
     ========================================================================== */
  function translateAuthError(err) {
    const msg = String((err && (err.message || err.error_description)) || err || '').toLowerCase();
    if (msg.includes('invalid login credentials')) {
      return '이메일 또는 비밀번호가 올바르지 않아요.';
    }
    if (msg.includes('user already registered') || msg.includes('already been registered')) {
      return '이미 가입된 이메일이에요. 로그인 탭에서 로그인해 주세요.';
    }
    if (msg.includes('password should be at least')) {
      return '비밀번호는 6자 이상으로 입력해 주세요.';
    }
    if (msg.includes('unable to validate email') || msg.includes('invalid email')) {
      return '올바른 이메일 주소 형식을 입력해 주세요.';
    }
    return '인증 처리 중 오류가 발생했어요. 입력 정보를 확인해 주세요.';
  }

  function setAuthModalMode(mode) {
    const tabLogin = document.getElementById('authTabLogin');
    const tabSignup = document.getElementById('authTabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authTitle = document.getElementById('authModalTitle');
    const authSubtitle = document.getElementById('authModalSubtitle');
    const errorBanner = document.getElementById('authErrorBanner');

    const isSignup = mode === 'signup';

    if (tabLogin) {
      tabLogin.classList.toggle('active', !isSignup);
      tabLogin.setAttribute('aria-selected', String(!isSignup));
    }
    if (tabSignup) {
      tabSignup.classList.toggle('active', isSignup);
      tabSignup.setAttribute('aria-selected', String(isSignup));
    }
    if (loginForm) loginForm.hidden = isSignup;
    if (signupForm) signupForm.hidden = !isSignup;
    if (errorBanner) errorBanner.hidden = true;

    if (authTitle) {
      authTitle.textContent = isSignup ? '감자 이웃 회원가입' : '감자 마켓 로그인';
    }
    if (authSubtitle) {
      authSubtitle.textContent = isSignup
        ? '사용하실 닉네임과 이메일·비밀번호를 입력해 주세요.'
        : '가입하신 이메일과 비밀번호로 로그인해 주세요.';
    }
  }

  function openAuthModal(mode = 'login', { fromWrite = false } = {}) {
    const dialog = document.getElementById('authModal');
    if (!dialog) return;

    const writeNotice = document.getElementById('authWriteNotice');
    if (writeNotice) {
      writeNotice.hidden = !fromWrite;
    }

    setAuthModalMode(mode);

    if (!dialog.open) {
      dialog.showModal();
    }

    setTimeout(() => {
      const targetInput =
        mode === 'signup'
          ? document.getElementById('signupNickname')
          : document.getElementById('loginEmail');
      if (targetInput && typeof targetInput.focus === 'function') {
        targetInput.focus();
      }
    }, 50);
  }

  function closeAuthModal() {
    const dialog = document.getElementById('authModal');
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  function initAuthModal() {
    const dialog = document.getElementById('authModal');
    if (!dialog) return;

    const closeBtn = document.getElementById('closeAuthBtn');
    const tabLogin = document.getElementById('authTabLogin');
    const tabSignup = document.getElementById('authTabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const errorBanner = document.getElementById('authErrorBanner');
    const errorMessage = document.getElementById('authErrorMessage');

    const loginEmail = document.getElementById('loginEmail');
    const loginPw = document.getElementById('current-password');
    const toggleLoginPwBtn = document.getElementById('toggleLoginPwBtn');
    const submitLoginBtn = document.getElementById('submitLoginBtn');

    const signupNickname = document.getElementById('signupNickname');
    const signupEmail = document.getElementById('signupEmail');
    const signupPw = document.getElementById('new-password');
    const toggleSignupPwBtn = document.getElementById('toggleSignupPwBtn');
    const submitSignupBtn = document.getElementById('submitSignupBtn');

    function showAuthError(msg) {
      if (errorBanner && errorMessage) {
        errorMessage.textContent = msg;
        errorBanner.hidden = false;
      }
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        dialog.close();
      });
    }

    dialog.addEventListener('close', () => {
      if (!state.authUser) {
        state.pendingWriteAfterAuth = false;
      }
    });

    // Light Dismiss 폴백
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isInside =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isInside) {
          dialog.close();
        }
      });
    }

    if (tabLogin) {
      tabLogin.addEventListener('click', () => setAuthModalMode('login'));
    }
    if (tabSignup) {
      tabSignup.addEventListener('click', () => setAuthModalMode('signup'));
    }

    function bindPasswordToggle(inputEl, btnEl) {
      if (!inputEl || !btnEl) return;
      btnEl.addEventListener('click', () => {
        const isPw = inputEl.type === 'password';
        inputEl.type = isPw ? 'text' : 'password';
        btnEl.textContent = isPw ? '숨김' : '보기';
      });
    }

    bindPasswordToggle(loginPw, toggleLoginPwBtn);
    bindPasswordToggle(signupPw, toggleSignupPwBtn);

    async function completeAuthFlow(user, preferredNickname, isNewSignup) {
      state.authUser = user;
      await ensureUserProfile(user, preferredNickname);
      updateHeaderAuthUI();

      if (loginForm) loginForm.reset();
      if (signupForm) signupForm.reset();
      if (errorBanner) errorBanner.hidden = true;

      const shouldOpenWrite = state.pendingWriteAfterAuth;
      state.pendingWriteAfterAuth = false;
      closeAuthModal();

      const nick = getActiveNickname();
      if (shouldOpenWrite) {
        if (state.currentUserProfile && state.currentUserProfile.region) {
          const writeLocation = document.getElementById('writeLocation');
          if (writeLocation) writeLocation.value = state.currentUserProfile.region;
        }
        showScreen('write');
        showToast(`🥔 반갑습니다, ${nick}님! 이제 물건을 등록해 보세요.`);
      } else {
        showToast(
          isNewSignup
            ? `🌱 회원가입 완료! 환영합니다, ${nick}님!`
            : `🥔 반갑습니다, ${nick}님!`
        );
      }
    }

    // 1. 로그인 폼 제출
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginEmail ? loginEmail.value.trim() : '';
        const password = loginPw ? loginPw.value : '';

        if (!email || ! email.includes('@')) {
          showAuthError('이메일 주소를 올바르게 입력해 주세요.');
          if (loginEmail) loginEmail.focus();
          return;
        }
        if (!password) {
          showAuthError('비밀번호를 입력해 주세요.');
          if (loginPw) loginPw.focus();
          return;
        }

        const origHtml = submitLoginBtn ? submitLoginBtn.innerHTML : '';
        if (submitLoginBtn) {
          submitLoginBtn.disabled = true;
          submitLoginBtn.innerHTML = '<span>로그인 중...</span>';
        }

        try {
          if (!supabaseClient) {
            throw new Error('Supabase Auth 클라이언트를 불러오지 못했습니다.');
          }
          const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
          });
          if (error) throw error;
          if (!data || !data.user) {
            throw new Error('로그인 사용자 정보를 확인할 수 없습니다.');
          }
          await completeAuthFlow(data.user, null, false);
        } catch (err) {
          console.error('로그인 실패:', err);
          showAuthError(translateAuthError(err));
        } finally {
          if (submitLoginBtn) {
            submitLoginBtn.disabled = false;
            submitLoginBtn.innerHTML = origHtml;
          }
        }
      });
    }

    // 2. 회원가입 폼 제출 (닉네임 필수)
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nickname = signupNickname ? signupNickname.value.trim() : '';
        const email = signupEmail ? signupEmail.value.trim() : '';
        const password = signupPw ? signupPw.value : '';

        if (nickname.length < 2 || nickname.length > 20) {
          showAuthError('닉네임을 2글자 이상 20글자 이하로 입력해 주세요.');
          if (signupNickname) signupNickname.focus();
          return;
        }
        if (!email || !email.includes('@')) {
          showAuthError('올바른 이메일 주소를 입력해 주세요.');
          if (signupEmail) signupEmail.focus();
          return;
        }
        if (!password || password.length < 6) {
          showAuthError('비밀번호를 6자 이상 입력해 주세요.');
          if (signupPw) signupPw.focus();
          return;
        }

        const origHtml = submitSignupBtn ? submitSignupBtn.innerHTML : '';
        if (submitSignupBtn) {
          submitSignupBtn.disabled = true;
          submitSignupBtn.innerHTML = '<span>가입 처리 중...</span>';
        }

        try {
          if (!supabaseClient) {
            throw new Error('Supabase Auth 클라이언트를 불러오지 못했습니다.');
          }
          const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: {
                nickname
              }
            }
          });
          if (error) throw error;

          let activeUser = data ? data.user : null;
          let activeSession = data ? data.session : null;

          // 세션이 즉시 반환되지 않은 경우 자동 확인 트리거 기반으로 바로 로그인 수행
          if (!activeSession) {
            const signInRes = await supabaseClient.auth.signInWithPassword({
              email,
              password
            });
            if (!signInRes.error && signInRes.data && signInRes.data.user) {
              activeUser = signInRes.data.user;
            }
          }

          if (!activeUser) {
            throw new Error('회원가입 처리 중 사용자 정보를 가져오지 못했습니다.');
          }

          await completeAuthFlow(activeUser, nickname, true);
        } catch (err) {
          console.error('회원가입 실패:', err);
          showAuthError(translateAuthError(err));
        } finally {
          if (submitSignupBtn) {
            submitSignupBtn.disabled = false;
            submitSignupBtn.innerHTML = origHtml;
          }
        }
      });
    }
  }

  async function initSupabaseAuth() {
    updateHeaderAuthUI();
    if (!supabaseClient || !supabaseClient.auth) return;

    try {
      const { data } = await supabaseClient.auth.getSession();
      if (data && data.session && data.session.user) {
        state.authUser = data.session.user;
        await ensureUserProfile(data.session.user);
      } else {
        state.authUser = null;
        state.currentUserProfile = null;
      }
      updateHeaderAuthUI();
    } catch (err) {
      console.error('초기 Auth 세션 확인 실패:', err);
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        state.authUser = session.user;
        if (!state.currentUserProfile || state.currentUserProfile.id !== session.user.id) {
          await ensureUserProfile(session.user);
        }
        updateHeaderAuthUI();
      } else if (event === 'SIGNED_OUT') {
        state.authUser = null;
        state.currentUserProfile = null;
        state.wishedProductIds.clear();
        updateHeaderAuthUI();
      }
    });
  }

  /* ==========================================================================
     9. 상단 헤더 및 상품 목록 이벤트 바인딩
     ========================================================================== */
  function initListEvents() {
    const logoBtn = document.getElementById('logoBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const openWriteBtn = document.getElementById('openWriteBtn');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const categoryList = document.getElementById('categoryList');
    const availableOnlyBtn = document.getElementById('availableOnlyBtn');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const productGrid = document.getElementById('productGrid');

    if (logoBtn) {
      logoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetAllFilters();
        showScreen('list');
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (clearSearchBtn) {
          clearSearchBtn.hidden = state.searchQuery.length === 0;
        }
        if (state.currentScreen !== 'list') {
          showScreen('list');
        }
        renderProductList();
      });
    }

    if (clearSearchBtn && searchInput) {
      clearSearchBtn.addEventListener('click', () => {
        state.searchQuery = '';
        searchInput.value = '';
        clearSearchBtn.hidden = true;
        searchInput.focus();
        renderProductList();
      });
    }

    // [글쓰기] 버튼 클릭: 비로그인 시 로그인 모달 먼저 표시 -> 로그인 성공 시 글쓰기 화면 오픈
    if (openWriteBtn) {
      openWriteBtn.addEventListener('click', () => {
        if (typeof window.resetGamzaWriteForm === 'function') {
          window.resetGamzaWriteForm();
        }
        if (!state.authUser) {
          state.pendingWriteAfterAuth = true;
          openAuthModal('login', { fromWrite: true });
          return;
        }
        if (state.currentUserProfile && state.currentUserProfile.region) {
          const writeLocation = document.getElementById('writeLocation');
          if (writeLocation) {
            writeLocation.value = state.currentUserProfile.region;
          }
        }
        showScreen('write');
      });
    }

    // [로그인] 버튼 클릭: 로그인/회원가입 모달 오픈
    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        state.pendingWriteAfterAuth = false;
        openAuthModal('login', { fromWrite: false });
      });
    }

    // [로그아웃] 버튼 클릭: Supabase Auth 로그아웃 및 상단 버튼 전환
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          if (supabaseClient && supabaseClient.auth) {
            await supabaseClient.auth.signOut();
          }
        } catch (err) {
          console.error('로그아웃 처리 중 오류:', err);
        }
        state.authUser = null;
        state.currentUserProfile = null;
        state.wishedProductIds.clear();
        state.pendingWriteAfterAuth = false;
        updateHeaderAuthUI();

        if (state.currentScreen === 'write') {
          showScreen('list');
        }
        showToast('🥔 로그아웃되었습니다.');
      });
    }

    if (categoryList) {
      categoryList.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (!btn) return;

        state.selectedCategory = btn.getAttribute('data-category') || '전체';
        categoryList.querySelectorAll('.category-btn').forEach((item) => {
          const isActive = item === btn;
          item.classList.toggle('active', isActive);
          item.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        renderProductList();
      });
    }

    if (availableOnlyBtn) {
      availableOnlyBtn.addEventListener('click', () => {
        state.availableOnly = !state.availableOnly;
        availableOnlyBtn.setAttribute('aria-pressed', state.availableOnly ? 'true' : 'false');
        renderProductList();
      });
    }

    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        resetAllFilters();
      });
    }

    if (productGrid) {
      const handleCardOpen = (cardEl) => {
        if (!cardEl) return;
        const productId = cardEl.getAttribute('data-product-id');
        if (productId) {
          openProductDetail(productId);
        }
      };

      productGrid.addEventListener('click', (e) => {
        const cardEl = e.target.closest('.product-card');
        handleCardOpen(cardEl);
      });

      productGrid.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const cardEl = e.target.closest('.product-card');
          if (cardEl) {
            e.preventDefault();
            handleCardOpen(cardEl);
          }
        }
      });
    }
  }

  /* ==========================================================================
     10. 앱 초기화
     ========================================================================== */
  function initApp() {
    updateHeaderAuthUI();
    renderProductList();
    initListEvents();
    initDetailModal();
    initWriteScreen();
    initAuthModal();
    initSupabaseAuth();
    loadDatabaseData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

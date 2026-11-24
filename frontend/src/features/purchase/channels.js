// 🛒 발주 채널 — 공급처마다 주문을 "어디로, 어떻게" 보내는지 정한다 (UF-13)
//
//   api  : 앱(서버)이 공급처 시스템에 바로 전송한다 (UF-13 2A)
//          로컬에서는 외부 연동 목업 서버(8089)가 공급처 역할을 한다
//   link : 앱이 대신 주문할 수 없는 곳 (쿠팡 · 네이버 쇼핑 등)
//          → 검색 화면을 열어 사장님이 직접 결제하고, 돌아와서 주문 내역만 등록한다 (UF-13 2B · 3B)
//
// 🚨 쿠팡 · 네이버는 "구매자 대신 주문" API 를 열어 주지 않는다 (쿠팡 Open API 는 판매자용)
//    그래서 link 채널은 자동 주문 · 결제를 하지 않는다. 결제는 항상 사장님이 그 서비스에서 직접 한다
// TODO 검색 주소 형식은 서비스가 바꿀 수 있으니 출시 전에 한 번 더 확인한다

export const CHANNELS = {
  partner: { kind: 'api', label: '앱에서 바로 전송', source: '등록 거래처', pill: 'blue' },
  coupang: {
    kind: 'link',
    label: '쿠팡',
    source: '쿠팡',
    pill: 'amber',
    // 쿠팡 파트너스 링크를 보여줄 때 꼭 함께 넣어야 하는 고지 문구
    disclosure: '쿠팡 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 받을 수 있어요.',
    searchUrl: (q) => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`,
  },
  naver: {
    kind: 'link',
    label: '네이버 쇼핑',
    source: '네이버',
    pill: 'ok',
    searchUrl: (q) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`,
  },
}

export const channelOf = (item) => CHANNELS[item.channel] ?? CHANNELS.partner

/** 열어 줄 외부 주소 — 가격 비교에서 고른 상품이면 그 상품 페이지, 아니면 검색 화면 */
export const externalUrl = (item) => item.url ?? channelOf(item).searchUrl(item.searchQuery ?? item.product)

/** 가격 비교 결과(offer)를 발주 품목 모양으로 바꾼다 → ExternalOrderSheet · 직접 주문 등록에 그대로 쓴다 */
export const offerToItem = (itemId, offer) => ({
  id: `${itemId}-${offer.source}`,
  product: offer.title, // 상품명에 묶음 수량이 들어 있어서 (예: '…1,000개') 수량은 1묶음으로 둔다
  qty: 1,
  unit: '묶음',
  supplier: offer.seller,
  channel: offer.source,
  searchQuery: offer.title,
  url: offer.url,
  arrive: offer.arrive,
  price: offer.total,
})

/** 복사해서 붙여 넣을 주문 조건 한 줄 */
export const orderText = (item) =>
  `${item.product} ${item.qty.toLocaleString('ko-KR')}${item.unit} · 예상 ${item.price.toLocaleString('ko-KR')}원 · ${item.arrive} 도착 희망`

/** 26-1 직접 주문 등록 화면으로 넘길 주소 (주문 조건을 미리 채워 둔다) */
export const directOrderPath = (orderId, item) =>
  `/orders/${orderId}/direct?${new URLSearchParams({
    supplier: channelOf(item).label,
    product: item.product,
    qty: String(item.qty),
    unit: item.unit,
    price: String(item.price),
    arrive: item.arrive,
  })}`

// 외부 서비스로 넘어간 주문을 기억해 둔다 → 돌아왔을 때 "주문 마쳤나요?" 를 물어본다
// 새로고침해도 이어지도록 sessionStorage 사용 (민감 정보가 아닌 품목 · 수량만 저장)
const KEY = 'nansogong-pending-external-order'
export const pendingOrder = {
  save: (orderId, item) => sessionStorage.setItem(KEY, JSON.stringify({ orderId, itemId: item.id, at: Date.now() })),
  read: () => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY))
    } catch {
      return null
    }
  },
  clear: () => sessionStorage.removeItem(KEY),
}

/** 받침에 맞는 '이에요/예요' — ieyo('쿠팡') → '쿠팡이에요', ieyo('네이버') → '네이버예요' */
export const ieyo = (word) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0
  return `${word}${hasBatchim ? '이에요' : '예요'}`
}

/** 받침에 맞는 조사 — eunNeun('쿠팡') → '쿠팡은', eunNeun('11번가') → '11번가는' */
export const eunNeun = (word) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0
  return `${word}${hasBatchim ? '은' : '는'}`
}

// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

export const weekForecast = [
  { d: '오늘', w: 'sun', t: '8°' },
  { d: '금', w: 'rain', t: '6°' },
  { d: '토', w: 'cloud', t: '5°' },
  { d: '일', w: 'sun', t: '7°' },
  { d: '월', w: 'rain', t: '4°' },
  { d: '화', w: 'cloud', t: '6°' },
  { d: '수', w: 'sun', t: '9°' },
]

// 12 날씨별 예상 주문 — 비율(%) 대신 사장님이 바로 감 잡는 '잔' 수로 보여 준다 (하루 평균, 화면 확인용 예시 값)
export const demandByWeather = {
  sunny: 68, // 맑은 날 평균 주문(건)
  rainy: 61, // 비 오는 날 평균 주문(건)
  warmMore: 14, // 비 오는 날 따뜻한 음료 더 팔리는 잔 수
  icedLess: 11, // 비 오는 날 아이스 음료 덜 팔리는 잔 수
}

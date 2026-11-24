// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

export const store = {
  name: 'WON썸플레이스',
  owner: '최민성',
  today: '11.19 목',
  // 홈 '영업 중' 표시용 오늘 영업시간 (가정: 서버가 오늘 기준으로 내려준다. 휴무일이면 null)
  hours: { open: '09:00', close: '21:00' },
  weather: { type: 'sun', label: '맑음 8°C' },
}

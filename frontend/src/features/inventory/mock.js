// 화면 확인용 목업 데이터 — Figma 'v1 디자인 (우리은행)' 예시 값
// 백엔드 API가 생기면 queries.js 에서 api.js 호출로 바꾸고 이 파일은 지운다

// tags : 21 재고 상단 탭 분류 (low = 부족, expiring = 소비기한 임박, check = 실사 필요) — 한 품목이 여러 탭에 들어갈 수 있다
// (가정: 서버가 분류해서 내려준다. 응답 모양은 준표님과 맞출 것)
export const inventory = [
  { id: 'milk', name: '우유 1L', value: '추정 4개', tags: ['low'] },
  { id: 'bean', name: '원두 1kg', value: '추정 2.1kg', tags: ['low'] },
  { id: 'vanilla', name: '바닐라 시럽', value: 'D-3 임박', tags: ['expiring'] },
  { id: 'cup', name: '컵 16oz', value: '추정 320개', tags: ['check'] },
  { id: 'lid', name: '뚜껑', value: '추정 290개', tags: [] },
  { id: 'financier', name: '휘낭시에', value: '추정 18개', tags: [] },
]

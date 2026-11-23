/** 원 단위 금액 표기 — won(451000) → '451,000', won(-50000, true) → '−50,000' */
export const won = (n, sign = false) =>
  `${sign && n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('ko-KR')}`

/** 매장 설정의 HTTP 계약. 회원·사업자 식별 정보는 수정 요청에 포함하지 않는다. */
export function createStoreApi(request) {
  const path = (storeId) => `/stores/${encodeURIComponent(storeId)}`
  return {
    getStore: (storeId, { signal } = {}) => request(path(storeId), { signal }),
    updateStoreBasics: (storeId, { name, category, address, openTime, closeTime, closedDays }) => request(path(storeId), {
      method: 'PUT', body: JSON.stringify({ name, category, address, openTime, closeTime, closedDays }),
    }),
  }
}

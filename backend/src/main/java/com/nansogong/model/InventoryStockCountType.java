package com.nansogong.model;

/** 실사 기록 종류 (stock_count.count_type) */
public enum InventoryStockCountType {
    INITIAL,   // 초기 재고: 재고 계산의 시작점. 품목당 한 번
    COUNT      // 실사: 운영 중 실제로 센 수량
}

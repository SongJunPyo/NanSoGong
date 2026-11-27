-- 다른 계정에도 같은 사업자번호를 등록하지 못하게 한다. 기존 중복 데이터는 자동 수정하지 않는다.
ALTER TABLE store ADD CONSTRAINT uq_store_biz_reg_no UNIQUE (biz_reg_no);
COMMENT ON COLUMN store.biz_reg_no IS '사업자등록번호 숫자 10자리. 모든 계정에서 UQ. 사업자등록 1건 = 매장 1개';
COMMENT ON COLUMN store.verify_status IS 'UNVERIFIED 미확인 / VERIFIED 진위 일치·계속사업자 / CLOSED 휴·폐업 / FAILED 확인실패';

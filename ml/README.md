# ml — 메뉴별 수요 예측 실험 환경 (구현-6-1)

요구사항: 판매 · 요일 · 시간대 · 날씨 · 특일 정보로 메뉴별 수요를 예측한다. **이동평균 baseline 으로 시작해 LightGBM 으로 고도화**하고,
**학습에 쓰지 않은 기간의 데이터**로 baseline 대비 오차를 검증한다.

## 실행

```bash
docker compose --profile ml up -d --build     # 처음 한 번은 --build (이미지 만들기)
```

- http://localhost:8888 (토큰: `.env` 의 `JUPYTER_TOKEN`, 기본 `nansogong`)
- 로컬 PostgreSQL 에 바로 붙는다: `from nansogong_ml.db import read_sql`
- 노트북은 `ml/notebooks/` 에 저장한다 (팀원과 공유됨). 원본 데이터 파일은 `ml/data/` 에 두고 커밋하지 않는다

## 규칙

- 학습 · 검증 데이터는 **시간 순서로** 나눈다 (무작위 분할 금지: 미래 데이터로 과거를 맞히는 셈이 된다)
- baseline(이동평균)과 LightGBM 을 같은 검증 기간 · 같은 지표로 비교한다. 지표와 목표치는 팀이 정한다 (예: MAE, MAPE)
- 라이브러리를 추가하면 `requirements.txt` 를 고치고 `--build` 로 다시 만든다

## 아직 정하지 않은 것 (팀 결정 필요)

학습한 모델을 **서비스에서 어떻게 돌릴지**는 요구사항에 없습니다. 둘 중 하나를 고른 뒤 이 README 에 적어 주세요.

| 방식 | 내용 | 장단점 |
|---|---|---|
| A. Python 배치 | 이 폴더의 코드를 스케줄로 돌려(예: 매일 새벽) 예측 결과를 DB 표에 저장 → Spring 은 표만 읽는다 | 구현이 단순하고 Python 생태계를 그대로 씀 / 배치 실행 환경(ECS 예약 작업 등)이 하나 더 필요 |
| B. Java 추론 | Python 으로 학습한 모델 파일을 Spring 에서 `lightgbm4j` 로 불러 예측 | 서버 하나로 끝남 / 네이티브 라이브러리 · 버전 맞추기가 까다로움 |

요구사항의 "스케줄러로 주기 실행 후 결과 저장" 에는 A 가 더 자연스럽습니다.

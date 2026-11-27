"""AI 작업 실행: 접수 API · 작업 등록부 · 워커 (#36).

    Spring ─POST /jobs→ routes.py ─접수→ registry.py (ai.job)
                                           ↑ 선점 · 기한 연장 · 끝내기
                                   worker.py ─그래프 실행(체크포인트 thread_id = jobId)→ handlers.py
                                           └ 보고 편지함(ai.job_report) → Spring /internal/ai-jobs/{jobId}/reports
"""

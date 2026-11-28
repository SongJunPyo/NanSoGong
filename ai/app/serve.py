"""API 서버 실행 명령 (이미지 기본 명령).

    python -m app.serve

uvicorn 을 띄우기 전에 로그를 표준 출력 JSON 으로 맞춘다 (app/logs.py).
uvicorn 이 자기 로그 설정을 덮어쓰지 않게 log_config=None 으로 띄운다.
"""

import uvicorn

from app.logs import configure_logging

HOST = "0.0.0.0"
PORT = 8000


def main() -> None:
    configure_logging()
    uvicorn.run("app.main:app", host=HOST, port=PORT, log_config=None)


if __name__ == "__main__":
    main()

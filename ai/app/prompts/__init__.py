"""프롬프트 파일 읽기.

프롬프트는 코드에 긴 문자열로 넣지 않고 이 폴더의 .md 파일로 둔다 (docs/rules/ai.md 프롬프트 · 추적 · 비용).
파일 안의 $이름 자리에 값을 채운다 (string.Template). 값이 빠지면 KeyError 로 바로 알 수 있다.
"""

from pathlib import Path
from string import Template

_DIR = Path(__file__).parent


def render(name: str, **values: str) -> str:
    template = Template((_DIR / f"{name}.md").read_text(encoding="utf-8"))
    return template.substitute(**values)

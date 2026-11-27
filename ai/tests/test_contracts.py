"""Spring 과 같은 예시 JSON 으로 레시피 초안 계약을 확인한다 (#35, docs/rules/ai.md 계약 테스트).

예시는 저장소 맨 위 contracts/recipe-draft/ 에 있고, Java JUnit 도 같은 파일을 읽는다.
- context.response.json          GET  .../recipe-context 응답
- validate.request.json          POST .../recipe-drafts/validate 요청 (Python 이 보내는 초안)
- validate*.response.json        같은 API 응답 (통과 · 실패 예시)

Java 담당이 예시를 추가하기 전에는 건너뛴다. 폴더가 생긴 뒤에 파일이 빠지면 실패한다.
"""

import json
from pathlib import Path

import pytest

from app.models.recipe import RecipeContext, RecipeDraft, RecipeLineCheck, RecipeReason, RecipeValidation

CONTRACTS = Path(__file__).resolve().parents[2] / "contracts" / "recipe-draft"

pytestmark = pytest.mark.skipif(
    not CONTRACTS.is_dir(), reason="contracts/recipe-draft/ 예시가 아직 없음 (Java 담당이 추가 예정)"
)


def load(name: str) -> dict:
    return json.loads((CONTRACTS / name).read_text(encoding="utf-8"))


def json_names(model) -> set[str]:
    """모델 칸의 JSON 이름(camelCase) 목록."""
    return {field.alias or name for name, field in model.model_fields.items()}


def response_examples() -> list[str]:
    if not CONTRACTS.is_dir():
        return []
    return sorted(p.name for p in CONTRACTS.glob("validate*.response.json"))


def test_context_response_is_readable():
    # Java 가 더 주는 칸(costSource, category, price, recipe)은 무시하고 읽는다
    RecipeContext.model_validate(load("context.response.json"))


def test_validate_request_has_same_fields_as_python_draft():
    example = load("validate.request.json")
    draft = RecipeDraft.model_validate(example)
    sent = draft.model_dump(mode="json")                     # Python 이 실제로 보내는 모양

    # 칸 이름이 하나라도 다르면 한쪽이 조용히 무시하므로, 이름 목록이 같아야 한다
    assert set(example) == set(sent)
    for example_line, sent_line in zip(example["lines"], sent["lines"], strict=True):
        assert set(example_line) == set(sent_line)


def test_there_are_passing_and_failing_response_examples():
    examples = [load(name) for name in response_examples()]

    assert {e["valid"] for e in examples} == {True, False}    # 통과 · 실패 예시가 둘 다 있어야 모든 칸을 확인한다


@pytest.mark.parametrize("name", response_examples())
def test_validate_response_fields_are_all_known_to_python(name):
    example = load(name)
    validation = RecipeValidation.model_validate(example)

    # Python 이 모르는 칸 이름은 조용히 버려지므로, 예시의 칸은 모두 Python 모델에 있어야 한다
    assert set(example) <= json_names(RecipeValidation)
    for line in example["lines"]:
        assert set(line) <= json_names(RecipeLineCheck)
    # 코드가 늘면 Python 의 안내 문장(graphs/recipe.py REASON_MESSAGES)도 함께 늘린다
    for check in validation.lines:
        assert check.reason is None or check.reason in {code.value for code in RecipeReason}

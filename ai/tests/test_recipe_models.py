"""모델이 Java 와 같은 camelCase JSON 으로 오가는지, 잘못된 초안을 거르는지 확인한다."""

import pytest
from pydantic import ValidationError

from app.models.recipe import RecipeDraft, RecipeValidation


def test_draft_is_read_from_and_written_as_camel_case():
    draft = RecipeDraft.model_validate(
        {"menuName": "딸기라떼", "lines": [{"itemId": 1, "itemName": "딸기청", "qty": "40", "unit": "g"}]}
    )

    dumped = draft.model_dump(mode="json")

    assert dumped["menuName"] == "딸기라떼"
    assert dumped["lines"][0]["itemId"] == 1
    assert "menu_name" not in dumped


def test_validation_result_is_read_from_camel_case():
    validation = RecipeValidation.model_validate(
        {"valid": False, "lines": [{"ok": False, "reason": "단위 불일치"}], "missingCosts": ["바닐라시럽"]}
    )

    assert validation.missing_costs == ["바닐라시럽"]


@pytest.mark.parametrize(
    "lines",
    [
        [],                                                                  # 재료가 하나도 없음
        [{"itemName": "우유", "qty": "0", "unit": "ml"}],                     # 사용량 0
        [{"itemName": "우유", "qty": "-5", "unit": "ml"}],                    # 사용량 음수
        [{"itemName": "", "qty": "200", "unit": "ml"}],                      # 재료 이름 없음
    ],
)
def test_invalid_llm_output_is_rejected(lines):
    with pytest.raises(ValidationError):
        RecipeDraft.model_validate({"menuName": "딸기라떼", "lines": lines})

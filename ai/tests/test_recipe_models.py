"""모델이 Java 와 같은 camelCase JSON 으로 오가는지, 잘못된 초안을 거르는지 확인한다."""

import pytest
from pydantic import ValidationError

from app.models.recipe import RecipeContext, RecipeDraft, RecipeReason, RecipeValidation


def test_draft_is_read_from_and_written_as_camel_case():
    draft = RecipeDraft.model_validate(
        {"menuName": "딸기라떼", "lines": [{"itemId": 1, "itemName": "딸기청", "quantity": "40", "unit": "G"}]}
    )

    dumped = draft.model_dump(mode="json")

    assert dumped["menuName"] == "딸기라떼"
    assert dumped["lines"][0]["itemId"] == 1
    assert "menu_name" not in dumped


def test_validation_result_is_read_from_camel_case():
    validation = RecipeValidation.model_validate(
        {"valid": False, "lines": [{"ok": False, "reason": "UNIT_MISMATCH", "unit": "G"}], "missingCosts": [7]}
    )

    assert validation.lines[0].reason == RecipeReason.UNIT_MISMATCH
    assert validation.missing_costs == [7]                  # 단가 없는 품목은 이름이 아니라 itemId 로 온다


def test_context_ignores_extra_fields_from_spring():
    context = RecipeContext.model_validate(
        {
            "items": [{"itemId": 1, "name": "우유", "unit": "ML", "unitCost": None, "costSource": None}],
            "menus": [
                {
                    "menuId": 10,
                    "name": "카페라떼",
                    "category": "커피",
                    "price": 4500,
                    "recipe": [{"itemId": 1, "itemName": "우유", "unit": "ML", "quantity": 200, "appliesTo": "ALL"}],
                }
            ],
        }
    )

    assert context.items[0].unit_cost is None
    assert context.menus[0].name == "카페라떼"


@pytest.mark.parametrize(
    "lines",
    [
        [],                                                                  # 재료가 하나도 없음
        [{"itemName": "우유", "quantity": "0", "unit": "ML"}],                # 사용량 0
        [{"itemName": "우유", "quantity": "-5", "unit": "ML"}],               # 사용량 음수
        [{"itemName": "", "quantity": "200", "unit": "ML"}],                 # 재료 이름 없음
    ],
)
def test_invalid_llm_output_is_rejected(lines):
    with pytest.raises(ValidationError):
        RecipeDraft.model_validate({"menuName": "딸기라떼", "lines": lines})


@pytest.mark.parametrize("unit", ["g", "스푼", "샷", ""])                  # 관리 단위는 G · ML · EA 뿐
def test_unit_outside_management_units_is_rejected(unit):
    with pytest.raises(ValidationError):
        RecipeDraft.model_validate(
            {"menuName": "딸기라떼", "lines": [{"itemName": "우유", "quantity": "200", "unit": unit}]}
        )


@pytest.mark.parametrize(
    ("field", "value"),
    [("menuName", "가" * 101), ("description", "가" * 501)],              # DB 칸 길이(100 · 500)를 넘음
)
def test_text_longer_than_db_column_is_rejected(field, value):
    data = {"menuName": "딸기라떼", "lines": [{"itemName": "우유", "quantity": "200", "unit": "ML"}], field: value}

    with pytest.raises(ValidationError):
        RecipeDraft.model_validate(data)


def test_llm_schema_tells_allowed_units_and_lengths():
    schema = RecipeDraft.model_json_schema()                              # Claude 에게 전달되는 양식 설명

    line_schema = schema["$defs"]["RecipeLineDraft"]["properties"]["unit"]
    assert line_schema["enum"] == ["G", "ML", "EA"]
    assert schema["properties"]["description"]["anyOf"][0]["maxLength"] == 500

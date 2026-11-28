"""레시피 초안 흐름에서 주고받는 데이터 모양 (#35 초안 계약).

Spring 담당과 맞춘 것 (예시 JSON: contracts/recipe-draft/, 양쪽 계약 테스트가 같은 파일을 읽는다)
- 사용량 칸 이름은 Java 레시피(recipe_item.quantity · RecipeSaveRequest)와 같은 quantity
- 검증 결과 reason · reasons 는 사람이 읽는 문장이 아니라 코드값(RecipeReason). 프롬프트 문장은 Python 이 만든다
- missingCosts 는 단가가 확인되지 않은 등록 품목의 itemId 목록
- 매장 품목에 없는 새 재료(itemId 없음 + 이름으로도 못 찾음)는 ok=true, reason=NEW_ITEM 으로 통과한다
  (valid 는 막지 않고 totalCost 만 비운다. 실제 저장은 품목을 등록한 뒤에만 된다)
- Java 가 더 주는 칸(items.costSource, menus.category · price · recipe)은 받지 않고 무시한다
금액 · 수량은 Decimal (부동소수 오차 방지).
"""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Literal

from pydantic import Field

from app.models.base import CamelModel

# 품목 관리 단위는 이 셋뿐이다 (docs/rules/db.md 품목 · 연동: item.unit)
Unit = Literal["G", "ML", "EA"]

# ---------- Spring → Python: 작업 입력 (POST /jobs 의 input = ai_job.request_params) ----------


class RecipeJobInput(CamelModel):
    menu_name: str = Field(min_length=1, max_length=100)       # 사장님이 요청한 메뉴 이름 (초안의 메뉴 이름으로 고정)


# ---------- Spring → Python: 레시피를 만들 때 참고할 매장 정보 ----------


class ContextItem(CamelModel):
    item_id: int
    name: str
    unit: Unit                                  # 관리 단위
    unit_cost: Decimal | None = None            # 확인된 단가. 모르면 비어 있다 (LLM 에는 보내지 않는다)


class ContextMenu(CamelModel):
    menu_id: int
    name: str


class RecipeContext(CamelModel):
    items: list[ContextItem]
    menus: list[ContextMenu] = []


# ---------- LLM 이 만드는 초안 (구조화 출력 스키마) ----------
# Field(description=...) 은 LLM 에게 그대로 전달되는 칸 설명이다


class RecipeLineDraft(CamelModel):
    item_id: int | None = Field(
        default=None, description="매장 품목 목록에서 고른 품목의 itemId. 목록에 없는 재료면 null"
    )
    item_name: str = Field(min_length=1, description="재료 이름")
    quantity: Decimal = Field(gt=0, description="메뉴 1잔(1개) 기준 사용량")
    unit: Unit = Field(
        description="사용량 단위. G(그램) · ML(밀리리터) · EA(개) 중 하나. 매장 품목이면 그 품목의 단위를 그대로 쓴다"
    )


class RecipeDraft(CamelModel):
    """레시피 초안. 단가 · 원가 칸은 일부러 없다 (계산은 Spring 이 한다).

    길이 제한은 저장될 DB 칸에 맞춘다: menu.name VARCHAR(100), suggestion.summary VARCHAR(500).
    """

    menu_name: str = Field(min_length=1, max_length=100, description="메뉴 이름")
    lines: list[RecipeLineDraft] = Field(min_length=1, description="재료 목록")
    description: str | None = Field(
        default=None, max_length=500, description="사장님께 보여줄 한두 문장 설명 (500자 이내)"
    )


# ---------- Spring → Python: 초안 검증 결과 ----------


class RecipeReason(StrEnum):
    """Spring 검증이 돌려주는 줄 단위 코드. 코드가 늘면 graphs/recipe.py 의 안내 문장도 함께 추가한다."""

    ITEM_NOT_FOUND = "ITEM_NOT_FOUND"           # itemId 가 없거나 다른 매장 품목
    ITEM_INACTIVE = "ITEM_INACTIVE"             # 사용 중지된 품목
    ITEM_AMBIGUOUS = "ITEM_AMBIGUOUS"           # itemId 없이 적은 이름과 같은 품목이 여러 개
    DUPLICATE_ITEM = "DUPLICATE_ITEM"           # 같은 품목이 앞줄에 이미 있음 (두 번째 줄에 붙는다)
    UNKNOWN_UNIT = "UNKNOWN_UNIT"               # 모르는 단위
    UNIT_MISMATCH = "UNIT_MISMATCH"             # 품목 관리 단위로 바꿀 수 없음. 이때 unit 에 품목 단위가 온다
    INVALID_QTY = "INVALID_QTY"                 # 소수 3자리 반올림 후 0 이하
    NEW_ITEM = "NEW_ITEM"                       # 매장에 없는 새 재료. ok=true 로 온다 (문제가 아니라 표시)


class RecipeLineCheck(CamelModel):
    ok: bool
    # RecipeReason 코드. 모르는 코드가 와도 검증 결과 전체를 버리지 않도록 str 로 받는다
    reason: str | None = None
    item_id: int | None = None
    normalized_qty: Decimal | None = None       # 관리 단위로 바꾼 수량
    unit: str | None = None
    unit_cost: Decimal | None = None


class RecipeValidation(CamelModel):
    """lines 는 초안의 lines 와 같은 순서 · 같은 개수로 온다 (#35 계약)."""

    valid: bool
    lines: list[RecipeLineCheck]
    reasons: list[str] = []                     # 재료 하나가 아니라 초안 전체의 문제 코드 (지금 정한 규칙은 없음)
    total_cost: Decimal | None = None
    # 단가가 확인되지 않은 등록 품목의 itemId (AI 가 채우지 않는다). 새 재료(NEW_ITEM)는 itemId 가 없어 들어가지 않는다
    missing_costs: list[int] = []


# ---------- Python → Spring: 제안을 만든 과정 (suggestion.generation_context) ----------


class RecipeGenerationContext(CamelModel):
    job_id: int                                 # Spring ai_job.ai_job_id
    graph_version: str
    revisions: int                              # 검증 실패로 고쳐 쓴 횟수
    generated_at: datetime                      # 기준 시각 (offset 이 붙은 ISO 8601 로 나간다)

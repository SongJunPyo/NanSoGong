"""레시피 초안 흐름에서 주고받는 데이터 모양 (#35 초안 계약).

Spring 쪽 API 가 아직 없으므로 칸 이름 · 모양은 #35 협의 결과에 따라 바뀔 수 있다.
금액 · 수량은 Decimal (부동소수 오차 방지).
"""

from datetime import datetime
from decimal import Decimal

from pydantic import Field

from app.models.base import CamelModel

# ---------- Spring → Python: 레시피를 만들 때 참고할 매장 정보 ----------


class ContextItem(CamelModel):
    item_id: int
    name: str
    unit: str                                   # 관리 단위 (g, ml, 개 …)
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
    qty: Decimal = Field(gt=0, description="메뉴 1잔(1개) 기준 사용량")
    unit: str = Field(min_length=1, description="사용량 단위. 매장 품목이면 그 품목의 단위를 그대로 쓴다")


class RecipeDraft(CamelModel):
    """레시피 초안. 단가 · 원가 칸은 일부러 없다 (계산은 Spring 이 한다)."""

    menu_name: str = Field(min_length=1, description="메뉴 이름")
    lines: list[RecipeLineDraft] = Field(min_length=1, description="재료 목록")
    description: str | None = Field(default=None, description="사장님께 보여줄 한두 문장 설명")


# ---------- Spring → Python: 초안 검증 결과 ----------


class RecipeLineCheck(CamelModel):
    ok: bool
    reason: str | None = None                   # 문제가 있으면 그 이유 (예: 단위가 품목 관리 단위와 다름)
    item_id: int | None = None
    normalized_qty: Decimal | None = None       # 관리 단위로 바꾼 수량
    unit: str | None = None
    unit_cost: Decimal | None = None


class RecipeValidation(CamelModel):
    """lines 는 초안의 lines 와 같은 순서 · 같은 개수로 온다 (#35 계약에 명시할 것)."""

    valid: bool
    lines: list[RecipeLineCheck]
    reasons: list[str] = []                     # 재료 하나가 아니라 초안 전체의 문제 (예: 재료가 너무 많음)
    total_cost: Decimal | None = None
    missing_costs: list[str] = []               # 단가가 확인되지 않은 재료 이름 (AI 가 채우지 않는다)


# ---------- Python → Spring: 제안을 만든 과정 (suggestion.generation_context) ----------


class RecipeGenerationContext(CamelModel):
    job_id: str
    graph_version: str
    revisions: int                              # 검증 실패로 고쳐 쓴 횟수
    generated_at: datetime                      # 기준 시각 (offset 이 붙은 ISO 8601 로 나간다)

"""테스트용 가짜 Spring · 가짜 LLM. 네트워크 · 과금 없이 그래프를 돌린다."""

from decimal import Decimal

from app.models.job import JobReport
from app.models.recipe import (
    ContextItem,
    ContextMenu,
    RecipeContext,
    RecipeDraft,
    RecipeLineCheck,
    RecipeLineDraft,
    RecipeValidation,
)
from app.models.suggestion import SavedSuggestion, SuggestionSave

CONTEXT = RecipeContext(
    items=[
        ContextItem(item_id=1, name="딸기청", unit="G", unit_cost=Decimal("12.5")),
        ContextItem(item_id=2, name="우유", unit="ML", unit_cost=Decimal("2.1")),
    ],
    menus=[ContextMenu(menu_id=10, name="카페라떼")],
)

GOOD_DRAFT = RecipeDraft(
    menu_name="딸기라떼",
    lines=[
        RecipeLineDraft(item_id=1, item_name="딸기청", quantity=Decimal("40"), unit="G"),
        RecipeLineDraft(item_id=2, item_name="우유", quantity=Decimal("200"), unit="ML"),
    ],
    description="딸기청과 우유로 만드는 기본 딸기라떼",
)

BAD_DRAFT = RecipeDraft(
    menu_name="딸기라떼",
    lines=[
        RecipeLineDraft(item_id=1, item_name="딸기청", quantity=Decimal("40"), unit="ML"),
        RecipeLineDraft(item_id=2, item_name="우유", quantity=Decimal("200"), unit="ML"),
    ],
)

VALID = RecipeValidation(
    valid=True,
    lines=[RecipeLineCheck(ok=True, item_id=1), RecipeLineCheck(ok=True, item_id=2)],
    total_cost=Decimal("920"),
)

INVALID = RecipeValidation(
    valid=False,
    lines=[RecipeLineCheck(ok=False, reason="UNIT_MISMATCH", item_id=1, unit="G"), RecipeLineCheck(ok=True)],
)


class FakeSpring:
    """validations 에 넣은 검증 결과를 차례로 돌려준다. 예외를 넣어 두면 그 차례에 예외를 던진다.

    받은 호출(검증 · 저장 · 보고)을 기록한다. report_errors 에 예외를 넣으면 보고를 받을 때 차례로 던진다.
    """

    def __init__(self, validations: list[RecipeValidation | BaseException]):
        self._validations = list(validations)
        self.validated: list[RecipeDraft] = []
        self.saved: list[SuggestionSave] = []
        self.reports: list[tuple[int, JobReport]] = []
        self.report_errors: list[Exception] = []

    def get_recipe_context(self, job_id: int) -> RecipeContext:
        return CONTEXT

    def validate_recipe(self, job_id: int, draft: RecipeDraft) -> RecipeValidation:
        self.validated.append(draft)
        result = self._validations.pop(0)
        if isinstance(result, BaseException):
            raise result
        return result

    def save_suggestion(self, job_id: int, suggestion: SuggestionSave) -> SavedSuggestion:
        self.saved.append(suggestion)
        return SavedSuggestion(suggestion_id=500, version=1)

    def report(self, job_id: int, report: JobReport) -> None:
        if self.report_errors:
            raise self.report_errors.pop(0)
        self.reports.append((job_id, report))


class FakeWriter:
    """drafts 에 넣은 초안을 차례로 돌려준다. 예외를 넣어 두면 그 차례에 예외를 던진다.

    받은 수정 요청(검증 결과)을 기록한다.
    """

    def __init__(self, drafts: list[RecipeDraft | Exception]):
        self._drafts = list(drafts)
        self.feedbacks: list[RecipeValidation | None] = []

    def write(self, menu_name, context, previous=None, validation=None) -> RecipeDraft:
        self.feedbacks.append(validation)
        next_draft = self._drafts.pop(0)
        if isinstance(next_draft, Exception):
            raise next_draft
        return next_draft

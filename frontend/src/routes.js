// 화면 경로 목록 — [Figma 프레임 이름, 경로, 화면 컴포넌트, 유저 플로우]
// 새 화면을 만들면 여기 한 줄 추가한다
import LoginPage from '@/features/auth/pages/LoginPage'
import SignupPage from '@/features/auth/pages/SignupPage'
import SignupBusinessPage from '@/features/auth/pages/SignupBusinessPage'
import FindPasswordPage from '@/features/auth/pages/FindPasswordPage'
import ConnectPage from '@/features/integration/pages/ConnectPage'
import ConnectAuthPage from '@/features/integration/pages/ConnectAuthPage'
import InitialStockPage from '@/features/integration/pages/InitialStockPage'
import RecipeConnectPage from '@/features/integration/pages/RecipeConnectPage'
import HomePage from '@/features/home/pages/HomePage'
import ScheduleNewPage from '@/features/home/pages/ScheduleNewPage'
import HomeCalmPage from '@/features/home/pages/HomeCalmPage'
import WeatherPage from '@/features/weather/pages/WeatherPage'
import SuggestionsPage from '@/features/home/pages/SuggestionsPage'
import PromotionDetailPage from '@/features/coupon/pages/PromotionDetailPage'
import PromotionEditPage from '@/features/coupon/pages/PromotionEditPage'
import PromotionApprovePage from '@/features/coupon/pages/PromotionApprovePage'
import PromotionResultPage from '@/features/coupon/pages/PromotionResultPage'
import PromotionResultFailedPage from '@/features/coupon/pages/PromotionResultFailedPage'
import ResultsPage from '@/features/agent/pages/ResultsPage'
import ReapprovalPage from '@/features/agent/pages/ReapprovalPage'
import RejectPage from '@/features/agent/pages/RejectPage'
import OnHoldPage from '@/features/agent/pages/OnHoldPage'
import InventoryPage from '@/features/inventory/pages/InventoryPage'
import ItemEditPage from '@/features/inventory/pages/ItemEditPage'
import ItemDetailPage from '@/features/inventory/pages/ItemDetailPage'
import WeeklyCheckPushPage from '@/features/inventory/pages/WeeklyCheckPushPage'
import AdjustPage from '@/features/inventory/pages/AdjustPage'
import DiscardPage from '@/features/inventory/pages/DiscardPage'
import OrderRecommendationPage from '@/features/purchase/pages/OrderRecommendationPage'
import OrderEditPage from '@/features/purchase/pages/OrderEditPage'
import OrderListPage from '@/features/purchase/pages/OrderListPage'
import OrderStatusPage from '@/features/purchase/pages/OrderStatusPage'
import DirectOrderPage from '@/features/purchase/pages/DirectOrderPage'
import ReceivingPage from '@/features/purchase/pages/ReceivingPage'
import CorrectionNewPage from '@/features/purchase/pages/CorrectionNewPage'
import CorrectionProgressPage from '@/features/purchase/pages/CorrectionProgressPage'
import MenuPage from '@/features/menu/pages/MenuPage'
import MenuEditPage from '@/features/menu/pages/MenuEditPage'
import MenuAnalysisPage from '@/features/menu/pages/MenuAnalysisPage'
import MenuRecommendPage from '@/features/menu/pages/MenuRecommendPage'
import MenuAddedPage from '@/features/menu/pages/MenuAddedPage'
import SalesPage from '@/features/sales/pages/SalesPage'
import CashflowPage from '@/features/sales/pages/CashflowPage'
import CashflowDisconnectedPage from '@/features/sales/pages/CashflowDisconnectedPage'
import SalesCalendarPage from '@/features/sales/pages/SalesCalendarPage'
import CostsPage from '@/features/sales/pages/CostsPage'
import CostNewPage from '@/features/sales/pages/CostNewPage'
import CostClassifyPage from '@/features/sales/pages/CostClassifyPage'
import PromotionPerformancePage from '@/features/coupon/pages/PromotionPerformancePage'
import SettingsPage from '@/features/store/pages/SettingsPage'
import StoreInfoPage from '@/features/store/pages/StoreInfoPage'
import MemberInfoPage from '@/features/auth/pages/MemberInfoPage'
import IntegrationsPage from '@/features/integration/pages/IntegrationsPage'
import PromotionSettingsPage from '@/features/coupon/pages/PromotionSettingsPage'
import NotificationSettingsPage from '@/features/store/pages/NotificationSettingsPage'
import LockSettingsPage from '@/features/store/pages/LockSettingsPage'
import LockScreenPage from '@/features/store/pages/LockScreenPage'

export const ROUTES = [
  ['01 로그인', '/login', LoginPage, 'UF-01'],
  ['02 회원가입', '/signup', SignupPage, 'UF-01'],
  ['02-1 사업자등록번호 등록', '/signup/business', SignupBusinessPage, 'UF-01'],
  ['03 비밀번호 찾기', '/find-password', FindPasswordPage, 'UF-01'],
  ['04 서비스 연동', '/onboarding/connect', ConnectPage, 'UF-03'],
  ['04-1 연동 인증', '/onboarding/connect/auth', ConnectAuthPage, 'UF-03'],
  ['05 초기 재고 입력', '/onboarding/stock', InitialStockPage, 'UF-04'],
  ['06 레시피·POS 메뉴 연결', '/onboarding/recipe', RecipeConnectPage, 'UF-04'],
  ['11 홈', '/', HomePage, 'UF-05'],
  ['11-1 운영 일정 등록', '/schedule/new', ScheduleNewPage, 'UF-05'],
  ['11-2 홈 (긴급한 일 없음)', '/home/calm', HomeCalmPage, 'UF-05'],
  ['12 날씨·수요 예측', '/weather', WeatherPage, 'UF-05'],
  ['13 AI 운영 제안', '/suggestions', SuggestionsPage, 'UF-06'],
  ['14 프로모션 추천', '/promotions/:id', PromotionDetailPage, 'UF-07'],
  ['15 프로모션 조건 수정', '/promotions/:id/edit', PromotionEditPage, 'UF-07'],
  ['16 프로모션 발행 결정', '/promotions/:id/approve', PromotionApprovePage, 'UF-07'],
  ['16-1 POS 반영 결과', '/promotions/:id/result', PromotionResultPage, 'UF-07'],
  ['16-2 POS 반영 실패', '/promotions/:id/result-failed', PromotionResultFailedPage, 'UF-07'],
  ['17 실행 결과', '/results', ResultsPage, 'UF-20'],
  ['18 재승인 요청', '/reapproval/:id', ReapprovalPage, 'UF-19'],
  ['18-1 반려 사유', '/reject', RejectPage, 'UF-19'],
  ['18-2 보류한 일', '/on-hold', OnHoldPage, 'UF-19'],
  ['21 재고', '/inventory', InventoryPage, 'UF-10'],
  ['21-1 품목 등록·수정', '/inventory/items/:id/edit', ItemEditPage, 'UF-09'],
  ['22 품목 상세', '/inventory/items/:id', ItemDetailPage, 'UF-10'],
  ['23-0 주간 재고 정비 알림', '/notifications/weekly-check', WeeklyCheckPushPage, 'UF-11'],
  ['23 실사 등록', '/inventory/adjust', AdjustPage, 'UF-11'],
  ['23-1 폐기·손실 등록', '/inventory/adjust/discard', DiscardPage, 'UF-11'],
  ['24 발주 추천', '/orders/recommendation', OrderRecommendationPage, 'UF-12'],
  ['25 발주 조건 수정', '/orders/recommendation/edit', OrderEditPage, 'UF-12'],
  ['26-0 발주 목록', '/orders', OrderListPage, 'UF-13'],
  ['26 발주 상태', '/orders/:id', OrderStatusPage, 'UF-13'],
  ['26-1 직접 주문 등록', '/orders/:id/direct', DirectOrderPage, 'UF-13'],
  ['27 입고 확인', '/receiving', ReceivingPage, 'UF-14'],
  ['28 정정 요청', '/corrections/new', CorrectionNewPage, 'UF-14'],
  ['28-1 정정 요청 진행', '/corrections/:id', CorrectionProgressPage, 'UF-14'],
  ['31 메뉴', '/menu', MenuPage, 'UF-15'],
  ['32 메뉴·레시피 편집', '/menu/:id/edit', MenuEditPage, 'UF-15'],
  ['33 메뉴 판매 분석', '/menu/analysis', MenuAnalysisPage, 'UF-16'],
  ['34 AI 메뉴 추천', '/menu/recommendations', MenuRecommendPage, 'UF-16'],
  ['35 메뉴 추가 완료', '/menu/recommendations/added', MenuAddedPage, 'UF-16'],
  ['41 매출', '/sales', SalesPage, 'UF-17'],
  ['41-1 입출금', '/sales/cashflow', CashflowPage, 'UF-17'],
  ['41-2 입출금 (연동 실패)', '/sales/cashflow/disconnected', CashflowDisconnectedPage, 'UF-17'],
  ['42 매출 캘린더', '/sales/calendar', SalesCalendarPage, 'UF-17'],
  ['43 비용·예상 이익', '/sales/costs', CostsPage, 'UF-18'],
  ['43-1 비용 추가', '/sales/costs/new', CostNewPage, 'UF-18'],
  ['43-2 거래 분류 확인', '/sales/costs/classify', CostClassifyPage, 'UF-18'],
  ['44 프로모션 성과', '/sales/promotions', PromotionPerformancePage, 'UF-08'],
  ['51 설정', '/settings', SettingsPage, 'UF-02'],
  ['52 매장 정보', '/settings/store', StoreInfoPage, 'UF-02'],
  ['52-1 회원 정보', '/settings/member', MemberInfoPage, 'UF-02'],
  ['53 연동 관리', '/settings/integrations', IntegrationsPage, 'UF-03'],
  ['54 프로모션 운영 설정', '/settings/promotion', PromotionSettingsPage, 'UF-07'],
  ['55 알림 설정', '/settings/notifications', NotificationSettingsPage, 'UF-11'],
  ['56 민감 정보 잠금', '/settings/lock', LockSettingsPage, 'UF-02'],
  ['57 잠금 화면', '/lock', LockScreenPage, 'UF-02'],
]

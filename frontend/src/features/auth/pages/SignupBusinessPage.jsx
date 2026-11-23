import { Screen } from '@/components/common/layout'
import { Button, Card, Eyebrow, Field, H1, HeadRow, KV, P, Pill } from '@/components/common/ui'

/** 02-1 사업자등록번호 등록 (가입 직후) */
export default function SignupBusinessPage() {
  return (
    <Screen title="사업자 등록">
      <Eyebrow>가입 완료 · 마지막 단계</Eyebrow>
      <H1>{'사업자등록번호를\n등록해 주세요'}</H1>
      <P>매장 데이터를 연결하려면 사업자 확인이 필요해요. 매장이 여러 곳이면 함께 등록할 수 있어요.</P>
      <Field
        label="사업자등록번호"
        placeholder="000-00-00000"
        right={
          <Button variant="secondary" full={false} className="w-[110px] shrink-0">
            조회
          </Button>
        }
      />
      <Card>
        <HeadRow title="성수 라떼하우스" size="text-base">
          <Pill tone="ok">확인됨</Pill>
        </HeadRow>
        <KV label="사업자등록번호" value="123-45-67890" />
        <KV label="대표자" value="최민성" />
        <KV label="업태 · 종목" value="음식점업 · 카페" />
      </Card>
      <Button variant="outline">+ 사업자등록번호 추가</Button>
      <div className="flex-1" />
      <Button to="/onboarding/connect">등록하고 계속</Button>
      <div className="flex justify-center">
        <Button variant="text" to="/onboarding/connect">
          나중에 등록하기
        </Button>
      </div>
    </Screen>
  )
}

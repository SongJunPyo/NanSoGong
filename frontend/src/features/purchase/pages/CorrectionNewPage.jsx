import { Camera } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Button, ButtonRow, Card, Chips, Eyebrow, Field, H1, H2, KV, P } from '@/components/common/ui'

/** 28 정정 요청 (UF-14 4~5) */
export default function CorrectionNewPage() {
  return (
    <Screen title="정정 요청">
      <Eyebrow>우유 1L · ○○유통</Eyebrow>
      <H1>{'파손된 1개를\n요청할게요'}</H1>
      <Card>
        <KV label="파손 (보류 중)" value="1개" tone="warn" />
        <KV label="관련 주문" value="11.19 · 10개" />
      </Card>
      <p className="text-base font-bold text-ink">요청 내용</p>
      <Chips items={['재배송', '교환', '환불']} />
      <Field label="메모" defaultValue="팩 1개가 터진 채 도착했어요" />
      <Card tone="line">
        <H2>증빙</H2>
        <button
          type="button"
          className="flex h-24 items-center justify-center gap-2 rounded-input bg-surface-muted text-label font-medium text-ink-sub"
        >
          <Camera size={18} /> 사진 추가
        </button>
      </Card>
      <Card>
        <KV label="전달 방식" value="앱에서 바로 전송" tone="ok" />
        <P small>연동이 안 되는 거래처면 요청 내용을 복사해 직접 전달하게 안내해요.</P>
      </Card>
      <Button to="/corrections/c1">승인하고 전달</Button>
      <ButtonRow>
        <Button variant="secondary" to="/on-hold">
          보류
        </Button>
        <Button variant="secondary" to="/reject">
          반려
        </Button>
      </ButtonRow>
    </Screen>
  )
}

import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Eyebrow, Field, H1, HeadRow, Label, Pill, Toggle } from '@/components/common/ui'

/** 11-1 운영 일정 등록 (UF-05 6) */
export default function ScheduleNewPage() {
  return (
    <Screen title="일정 등록">
      <Eyebrow>운영 캘린더</Eyebrow>
      <H1>{'매장에 영향을 줄\n일정을 알려주세요'}</H1>
      <Field label="일정 이름" placeholder="예: 성수 거리 축제" />
      <Field label="날짜" defaultValue="2026.11.22 (토) – 11.23 (일)" />
      <Label>종류</Label>
      <Chips items={['주변 행사', '시험·방학', '매장 휴무', '단체 주문', '기타']} />
      <Label>예상 영향</Label>
      <Chips items={['손님 많아짐', '손님 줄어듦', '잘 모르겠음']} />
      <Button to="/">저장</Button>
      <Card tone="line">
        <HeadRow title="자동으로 모은 주변 일정" size="text-base">
          <Pill>수요 분석에 반영</Pill>
        </HeadRow>
        <Toggle label="성수 거리 축제" desc="11.22–11.23 · 성동구청" />
        <Toggle label="○○대 기말고사" desc="12.8–12.12 · 학사일정" />
        <Toggle label="성수역 공사" desc="11.25–11.28 · 서울교통공사" defaultChecked={false} />
      </Card>
    </Screen>
  )
}

import { Screen } from '@/components/common/layout'
import { Button, Card, Chips, Field, ListRow, P } from '@/components/common/ui'

const ACCOUNT_TABS = ['/settings/member', '/settings/store']

/** 52-1 회원 정보 (UF-02) */
export default function MemberInfoPage() {
  return (
    <Screen title="회원 정보">
      <Chips items={['회원 정보', '매장 정보']} links={[null, ACCOUNT_TABS[1]]} />
      <Field label="아이디" defaultValue="minsung_cafe" />
      <Field label="이름" defaultValue="최민성" />
      <Field
        label="휴대폰 번호"
        defaultValue="010-1234-5678"
        right={
          <Button variant="secondary" full={false} className="w-24 shrink-0">
            변경
          </Button>
        }
      />
      <P tone="mute" small>
        번호를 바꾸면 새 번호로 인증해요.
      </P>
      <Card tone="line" gap="gap-0" pad="px-4 py-1">
        <ListRow title="비밀번호 변경" />
        <ListRow title="로그인 기록" />
      </Card>
      <Button>저장</Button>
      <div>
        <Button variant="text">회원 탈퇴</Button>
      </div>
    </Screen>
  )
}

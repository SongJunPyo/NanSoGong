import { Screen } from '@/components/common/layout'
import { Button, Field, H1 } from '@/components/common/ui'

/** 03 비밀번호 찾기 (UF-01 5A~5C) */
export default function FindPasswordPage() {
  return (
    <Screen title="비밀번호 찾기">
      <H1>{'가입한 전화번호로\n본인 확인을 할게요'}</H1>
      <Field label="아이디" placeholder="아이디" />
      <Field label="전화번호" placeholder="010-0000-0000" />
      <Button variant="secondary">인증번호 받기</Button>
      <Field label="인증번호" placeholder="6자리 숫자" />
      <Field label="새 비밀번호" placeholder="8자 이상" />
      <Button to="/login">비밀번호 변경</Button>
    </Screen>
  )
}

import { Screen } from '@/components/common/layout'
import { Button, Eyebrow, Field, H1, P } from '@/components/common/ui'

/** 02 회원가입 — 휴대폰 인증 (UF-01) */
export default function SignupPage() {
  const smallBtn = (label) => (
    <Button variant="secondary" full={false} className="w-[110px] shrink-0">
      {label}
    </Button>
  )
  return (
    <Screen title="회원가입">
      <Eyebrow>가입 정보</Eyebrow>
      <H1>사장님 정보를 입력해 주세요</H1>
      <Field label="아이디" placeholder="영문·숫자 6자 이상" />
      <Field label="비밀번호" placeholder="8자 이상" />
      <Field label="이름" placeholder="이름" />
      <Field label="휴대폰 번호" placeholder="010-0000-0000" right={smallBtn('인증 요청')} />
      <Field label="인증번호" placeholder="6자리 숫자" right={smallBtn('확인')} />
      <P tone="mute" small>
        남은 시간 02:59 · 인증번호가 안 오나요?
      </P>
      <Button to="/signup/business">가입하기</Button>
    </Screen>
  )
}

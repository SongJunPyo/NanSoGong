import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/common/layout'
import { Button, Field, H1, P } from '@/components/common/ui'

/** 01 로그인 (UF-01) */
export default function LoginPage() {
  const navigate = useNavigate()
  return (
    <Screen title=" " back={false}>
      <div className="mt-6 size-14 rounded-2xl bg-gradient-to-br from-woori-sky to-woori-deep" />
      <H1>{'재고·발주·매출 관리,\n이제 AI와 함께해요'}</H1>
      <P>AI 매장 운영 에이전트</P>
      <Field label="아이디" placeholder="아이디를 입력하세요" />
      <Field label="비밀번호" placeholder="비밀번호를 입력하세요" />
      <Button onClick={() => navigate('/')}>로그인</Button>
      <div className="flex justify-center gap-4">
        <Button variant="text" to="/signup">
          회원가입
        </Button>
        <Button variant="text" to="/find-password">
          비밀번호 찾기
        </Button>
      </div>
    </Screen>
  )
}

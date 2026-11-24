import { Link } from 'react-router-dom'
import { Coffee, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/common/ui'
import SignupProgress from './SignupProgress'

export default function AuthLayout({ title, description, step, children }) {
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-6 sm:p-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-10 lg:py-12">
      <aside className="min-w-0 lg:sticky lg:top-12 lg:self-start">
        <Link to="/login" className="inline-flex items-center gap-3 text-woori-deep">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-woori-deep text-white"><Coffee size={26} aria-hidden="true" /></span>
          <span><strong className="block text-[28px]">난소공</strong><span className="text-caption text-ink-sub">AI 매장 운영 에이전트</span></span>
        </Link>
        <div className="mt-8 hidden space-y-4 lg:block">
          <h2 className="text-[28px] leading-snug font-bold text-ink">사장님의 하루를<br />가볍게 만드는 시작</h2>
          <p className="text-label leading-relaxed text-ink-sub">내 계정과 매장을 연결하고,<br />재고·메뉴·매출을 한곳에서 관리하세요.</p>
          <div className="flex items-center gap-2 text-caption text-woori-deep"><ShieldCheck size={18} aria-hidden="true" />사업자 1개당 매장 1개를 등록해요.</div>
        </div>
      </aside>
      <Card tone="line" pad="p-5 sm:p-7" gap="gap-4">
        {step && <SignupProgress step={step} />}
        <div><h1 className="text-h1 font-bold text-ink">{title}</h1>{description && <p className="mt-2 text-label text-ink-sub">{description}</p>}</div>
        <div role="note" className="rounded-input bg-warning-bg px-3 py-2 text-caption leading-relaxed text-amber-800">
          <strong>개발용 Mock</strong> · 실제 문자 발송·본인확인·국세청 조회를 수행하지 않아요. 입력과 가입 정보는 현재 탭의 메모리에만 유지되며 새로고침하면 초기화돼요.
        </div>
        {children}
      </Card>
    </main>
  )
}

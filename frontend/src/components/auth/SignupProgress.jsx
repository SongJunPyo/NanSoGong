const STEPS = ['회원정보', '사업자등록', '가입 완료']

export default function SignupProgress({ step }) {
  return (
    <ol aria-label="회원가입 진행 단계" className="mb-5 grid grid-cols-3 gap-2">
      {STEPS.map((label, index) => (
        <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={`border-t-2 pt-2 text-caption ${step === index + 1 ? 'border-woori-blue font-bold text-woori-deep' : step > index + 1 ? 'border-woori-blue text-ink-sub' : 'border-line text-ink-mute'}`}>
          <span className="block text-[10px]">STEP {index + 1}</span>{label}
        </li>
      ))}
    </ol>
  )
}

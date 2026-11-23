import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Check, Copy, ExternalLink, X } from 'lucide-react'
import { Button, ButtonRow, Card, H2, KV, P, Pill } from '@/components/common/ui'
import { won } from '@/lib/format'
import { channelOf, directOrderPath, eunNeun, externalUrl, orderText, pendingOrder } from '@/features/purchase/channels'

/**
 * 앱 연동이 안 되는 곳(쿠팡 등)으로 넘어가 주문하는 시트 (UF-13 2B · 3B)
 *
 * 1) 주문 조건 복사  2) 쿠팡 검색 화면 열기 (새 창 / 쿠팡 앱)
 * 3) 사장님이 그곳에서 직접 결제
 * 4) 이 앱으로 돌아오면 "주문 마쳤나요?" → 26-1 직접 주문 등록 화면으로 (조건 미리 채움)
 */
export default function ExternalOrderSheet({ open, onClose, orderId, item }) {
  const navigate = useNavigate()
  const channel = channelOf(item)
  const place = item.url ? '상품 페이지를' : '검색 화면을' // 가격 비교에서 고른 상품이면 상품 페이지로 바로 간다
  const [copied, setCopied] = useState(false)
  // 외부로 넘어갔다가 돌아온 상태인지 (새로고침해도 이어지게 sessionStorage 에서 시작값을 읽는다)
  const [returned, setReturned] = useState(() => pendingOrder.read()?.itemId === item.id)

  // 쿠팡 창에서 이 탭으로 다시 돌아오면 visibilitychange 가 일어난다
  useEffect(() => {
    const onBack = () => {
      if (document.visibilityState === 'visible' && pendingOrder.read()?.itemId === item.id) setReturned(true)
    }
    document.addEventListener('visibilitychange', onBack)
    return () => document.removeEventListener('visibilitychange', onBack)
  }, [item.id])

  if (!open) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderText(item))
      setCopied(true)
    } catch {
      setCopied(false) // 브라우저가 복사를 막으면 버튼만 그대로 둔다
    }
  }

  const goExternal = () => {
    pendingOrder.save(orderId, item)
    // 휴대폰에서는 쿠팡 앱이 깔려 있으면 앱으로 열린다 (유니버설 링크 · 앱 링크)
    window.open(externalUrl(item), '_blank', 'noopener,noreferrer')
  }

  const registerOrder = () => {
    pendingOrder.clear()
    navigate(directOrderPath(orderId, item))
  }

  const notYet = () => {
    pendingOrder.clear()
    setReturned(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${channel.label}에서 주문`}
        className="flex w-full max-w-[430px] flex-col gap-4 rounded-t-[24px] bg-white px-screen pt-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <H2>{returned ? `${channel.label}에서 주문을 마쳤나요?` : `${channel.label}에서 주문해요`}</H2>
          <button type="button" aria-label="닫기" onClick={onClose} className="ml-auto p-1 text-ink-mute">
            <X size={22} />
          </button>
        </div>

        <Card>
          <KV label="품목 · 수량" value={`${item.product} × ${item.qty.toLocaleString('ko-KR')}`} />
          <KV label="예상 금액 (AI 추천 기준)" value={`${won(item.price)}원`} />
          <KV label="도착 희망" value={item.arrive} />
        </Card>

        {returned ? (
          <>
            <P tone="ink">
              주문을 마쳤으면 실제 결제 금액과 도착 예정일만 등록해 주세요. 등록해야 입고 확인과 재고 계산에 반영돼요.
            </P>
            <Button onClick={registerOrder}>주문했어요 · 내역 등록</Button>
            <ButtonRow>
              <Button variant="outline" onClick={goExternal}>
                {channel.label} 다시 열기
              </Button>
              <Button variant="secondary" onClick={notYet}>
                아직이에요
              </Button>
            </ButtonRow>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <Pill tone="amber">앱 연동 안 됨</Pill>
              <P small>결제는 {channel.label}에서 직접 해요</P>
            </div>
            <P tone="ink">
              {eunNeun(channel.label)} 앱 연동(API)이 안 돼요. AI가 사장님 계정으로 주문서까지 채워 드리거나, {place} 열어 직접 주문할 수
              있어요.
            </P>
            {/* UF-13 2C — AI가 사장님 대신 쇼핑몰에서 주문서까지 채운다 (결제는 사장님) */}
            <Button to="/orders/agent">
              <Bot size={18} className="mr-1.5" />
              AI가 {channel.source ?? channel.label}에서 대신 주문
            </Button>
            <Button variant="outline" onClick={copy}>
              {copied ? <Check size={18} className="mr-1.5" /> : <Copy size={18} className="mr-1.5" />}
              {copied ? '복사했어요' : '주문 조건 복사'}
            </Button>
            <Button variant="outline" onClick={goExternal}>
              {channel.label}에서 {item.url ? '열기' : '검색하기'} <ExternalLink size={18} className="ml-1.5" />
            </Button>
            <div className="flex justify-center">
              <Button variant="text" onClick={registerOrder}>
                이미 주문했어요 · 내역 등록
              </Button>
            </div>
            {channel.disclosure && <P small>{channel.disclosure}</P>}
          </>
        )}
      </div>
    </div>
  )
}

import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthButton({ busy = false, disabled = false, asChild = false, children, className = '', ...props }) {
  return (
    <Button {...props} asChild={asChild} disabled={disabled || busy} aria-busy={busy} className={`w-full rounded-button px-4 font-bold ${className}`} style={{ minHeight: 44 }}>
      {asChild ? children : <>{busy && <LoaderCircle aria-hidden="true" className="animate-spin" size={16} />}{children}</>}
    </Button>
  )
}

import { useRef, useState } from 'react'

export function useAsyncAction() {
  const running = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  async function run(action) {
    if (running.current) return
    running.current = true
    setPending(true)
    setError(null)
    try { return await action() }
    catch (error) { setError(error); return undefined }
    finally { running.current = false; setPending(false) }
  }
  return { run, pending, error, clearError: () => setError(null) }
}

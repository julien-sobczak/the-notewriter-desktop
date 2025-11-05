import { useEffect } from 'react'

// https://medium.com/@paulohfev/problem-solving-custom-react-hook-for-keydown-events-e68c8b0a371
function useKeyDown(callback: any, keys: any) {
  useEffect(() => {
    const onKeyDown = (event: any) => {
      const wasAnyKeyPressed = keys.some((key: string) => event.key === key)
      if (wasAnyKeyPressed) {
        event.preventDefault()
        callback()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [callback, keys])
}

export default useKeyDown

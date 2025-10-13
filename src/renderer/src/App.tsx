import { useMemo } from 'react'
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom'
import { IconContext, IconProps } from '@phosphor-icons/react'
import Home from './components/Home'
import { ConfigContextProvider } from './ConfigContext'
import './assets/Reset.css'
import './assets/App.css'

export default function App(): React.JSX.Element {
  const iconStyle = useMemo<IconProps>(() => {
    return {
      color: 'black',
      size: 16,
      weight: 'thin',
      mirrored: false
    }
  }, [])
  return (
    <IconContext.Provider value={iconStyle}>
      <ConfigContextProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </Router>
      </ConfigContextProvider>
    </IconContext.Provider>
  )
}

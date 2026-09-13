import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import PlayerDashboard from './pages/PlayerDashboard'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <Router>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <nav className="top-nav" aria-label="Primary">
        <Link to="/" className="top-nav__brand">
          🏏 Cricket Jersey Orders
        </Link>
      </nav>
      <main id="main-content">
        <Routes>
          <Route path="/" element={<PlayerDashboard />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </Router>
  )
}

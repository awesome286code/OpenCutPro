import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight, Play } from 'lucide-react'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return <main className="home-shell"><div className="home-card"><div className="brand-lockup"><div className="brand-mark">O</div><span>OpenCut</span></div><p className="home-kicker">A simple editor for big ideas</p><h1>Make something<br /><em>worth watching.</em></h1><p className="home-description">A calm, capable video editor for creators who want to move from first cut to final frame without the clutter.</p><Link to="/editor" className="home-cta"><Play size={16} fill="currentColor" /> Open editor <ArrowRight size={16} /></Link></div><div className="home-orbit orbit-one" /><div className="home-orbit orbit-two" /></main>
}

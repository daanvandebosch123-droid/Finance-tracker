'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.replace('/login')
  }

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-indigo-600 text-sm">
            FinanceTracker
          </Link>
          <div className="flex gap-1">
            <Link
              href="/dashboard"
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                pathname === '/dashboard'
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/transactions"
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                pathname === '/transactions'
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Transactions
            </Link>
            <Link
              href="/settings"
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                pathname === '/settings'
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Settings
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:block">{profile?.name}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-slate-400 hover:text-slate-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}

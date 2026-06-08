'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export default function SetupPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdCode, setCreatedCode] = useState('')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && profile?.household_id) router.replace('/dashboard')
  }, [user, profile, loading, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const code = generateInviteCode()
    const { data: household, error: hErr } = await supabase
      .from('households')
      .insert({ name: householdName, invite_code: code })
      .select()
      .single()

    if (hErr || !household) {
      setError(hErr?.message ?? 'Failed to create household')
      setSubmitting(false)
      return
    }

    const { error: pErr } = await supabase
      .from('profiles')
      .update({ household_id: household.id })
      .eq('id', user!.id)

    if (pErr) {
      setError(pErr.message)
      setSubmitting(false)
      return
    }

    setCreatedCode(code)
    await refreshProfile()
    setSubmitting(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { data: household, error: hErr } = await supabase
      .from('households')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (hErr || !household) {
      setError('Household not found. Double-check the invite code.')
      setSubmitting(false)
      return
    }

    const { error: pErr } = await supabase
      .from('profiles')
      .update({ household_id: household.id })
      .eq('id', user!.id)

    if (pErr) {
      setError(pErr.message)
      setSubmitting(false)
      return
    }

    await refreshProfile()
    router.replace('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (createdCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-md text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Household created!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Share this invite code with your partner so they can join:
          </p>
          <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-100">
            <p className="text-3xl font-mono font-bold text-indigo-600 tracking-widest">{createdCode}</p>
          </div>
          <button
            onClick={() => router.replace('/dashboard')}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Continue to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-md">
        <div className="mb-6">
          <p className="text-indigo-600 font-bold text-sm mb-4">FinanceTracker</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Set up your household</h1>
          <p className="text-slate-500 text-sm">Create a new one or join your partner&apos;s</p>
        </div>

        <div className="flex border border-slate-200 rounded-lg p-1 mb-6">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'create' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Create
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'join' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Join
          </button>
        </div>

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Household name</label>
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g. Our Home"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                autoFocus
              />
            </div>
            {error && <p className="text-rose-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create household'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Invite code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter 8-character code"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={8}
                required
                autoFocus
              />
            </div>
            {error && <p className="text-rose-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Joining...' : 'Join household'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

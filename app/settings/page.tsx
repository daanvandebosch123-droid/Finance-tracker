'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants'
import { Profile } from '@/lib/types'

interface CustomCategory {
  id: string
  name: string
  type: 'expense' | 'income'
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-50">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const router = useRouter()

  // Profile
  const [name, setName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  // Household
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [members, setMembers] = useState<Profile[]>([])
  const [copied, setCopied] = useState(false)

  // Categories
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [hiddenDefaults, setHiddenDefaults] = useState<Set<string>>(new Set())
  const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && user && !profile?.household_id) router.replace('/setup')
  }, [user, profile, loading, router])

  useEffect(() => {
    if (profile) {
      setName(profile.name)
      fetchHousehold()
      fetchCategories()
    }
  }, [profile])

  async function fetchHousehold() {
    if (!profile?.household_id) return
    const [householdRes, membersRes] = await Promise.all([
      supabase.from('households').select('*').eq('id', profile.household_id).single(),
      supabase.from('profiles').select('*').eq('household_id', profile.household_id),
    ])
    if (householdRes.data) {
      setHouseholdName(householdRes.data.name)
      setInviteCode(householdRes.data.invite_code)
    }
    if (membersRes.data) setMembers(membersRes.data as Profile[])
  }

  const fetchCategories = useCallback(async () => {
    if (!profile?.household_id) return
    const [customRes, hiddenRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, type')
        .eq('household_id', profile.household_id)
        .order('type')
        .order('name'),
      supabase
        .from('hidden_categories')
        .select('name, type')
        .eq('household_id', profile.household_id),
    ])
    if (customRes.data) setCustomCategories(customRes.data as CustomCategory[])
    if (hiddenRes.data) {
      setHiddenDefaults(new Set(hiddenRes.data.map((h) => `${h.type}:${h.name}`)))
    }
  }, [profile])

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name === profile?.name) return
    setSavingName(true)
    await supabase.from('profiles').update({ name: name.trim() }).eq('id', user!.id)
    await refreshProfile()
    setSavingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function hideDefault(catName: string) {
    if (!profile?.household_id) return
    await supabase.from('hidden_categories').upsert(
      { household_id: profile.household_id, name: catName, type: categoryTab },
      { onConflict: 'household_id,name,type' }
    )
    setHiddenDefaults((prev) => new Set([...prev, `${categoryTab}:${catName}`]))
  }

  async function restoreDefault(catName: string) {
    if (!profile?.household_id) return
    await supabase
      .from('hidden_categories')
      .delete()
      .eq('household_id', profile.household_id)
      .eq('name', catName)
      .eq('type', categoryTab)
    setHiddenDefaults((prev) => {
      const next = new Set(prev)
      next.delete(`${categoryTab}:${catName}`)
      return next
    })
  }

  async function addCategory() {
    const trimmed = newCategoryName.trim()
    if (!trimmed || !profile?.household_id) return
    setAddingCategory(true)
    const { data, error } = await supabase
      .from('categories')
      .upsert(
        { household_id: profile.household_id, name: trimmed, type: categoryTab },
        { onConflict: 'household_id,name,type' }
      )
      .select()
    if (!error) {
      await fetchCategories()
      setNewCategoryName('')
    }
    setAddingCategory(false)
  }

  async function deleteCustomCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCustomCategories((prev) => prev.filter((c) => c.id !== id))
  }

  const defaultCategories = categoryTab === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const customForTab = customCategories.filter(
    (c) => c.type === categoryTab && !defaultCategories.includes(c.name)
  )
  const hiddenForTab = defaultCategories.filter((c) =>
    hiddenDefaults.has(`${categoryTab}:${c}`)
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-300">
      <Navbar />
      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-5 sm:py-8 pb-24 sm:pb-8 space-y-6">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>

        {/* Profile */}
        <Section title="Profile" description="Update your display name">
          <form onSubmit={saveName} className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your name"
              required
            />
            <button
              type="submit"
              disabled={savingName || name === profile?.name}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors min-w-[80px]"
            >
              {nameSaved ? '✓ Saved' : savingName ? 'Saving...' : 'Save'}
            </button>
          </form>
          <p className="text-xs text-slate-400 mt-2">Email: {user?.email}</p>
        </Section>

        {/* Household */}
        <Section title="Household" description="Share the invite code so your partner can join">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Name</p>
              <p className="text-sm text-slate-800 font-medium">{householdName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Invite code</p>
              <div className="flex items-center gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 flex-1">
                  <span className="text-xl font-mono font-bold text-indigo-600 tracking-widest">
                    {inviteCode}
                  </span>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors min-w-[80px]"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Your partner enters this code on the setup page to join your household.
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Members</p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-700">{m.name}</span>
                    {m.id === user?.id && <span className="text-xs text-slate-400">(you)</span>}
                  </div>
                ))}
                {members.length < 2 && (
                  <p className="text-xs text-slate-400 italic">Waiting for partner to join…</p>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Categories */}
        <Section
          title="Categories"
          description="Add custom categories, hide defaults you don't use, or restore them"
        >
          {/* Tab */}
          <div className="flex border border-slate-200 rounded-lg p-1 mb-6 w-fit">
            <button
              onClick={() => setCategoryTab('expense')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                categoryTab === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expense
            </button>
            <button
              onClick={() => setCategoryTab('income')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                categoryTab === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income
            </button>
          </div>

          {/* Default categories */}
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Default</p>
            <div className="flex flex-wrap gap-2">
              {defaultCategories
                .filter((c) => !hiddenDefaults.has(`${categoryTab}:${c}`))
                .map((c) => (
                  <div
                    key={c}
                    className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium"
                  >
                    {c}
                    <button
                      onClick={() => hideDefault(c)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-300 transition-colors text-slate-400 hover:text-slate-700"
                      title="Hide this category"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Custom categories */}
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Custom</p>
            {customForTab.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No custom categories yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {customForTab.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
                  >
                    {c.name}
                    <button
                      onClick={() => deleteCustomCategory(c.id)}
                      className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-indigo-200 transition-colors text-indigo-400 hover:text-indigo-700"
                      title="Delete"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hidden defaults (restore) */}
          {hiddenForTab.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Hidden</p>
              <div className="flex flex-wrap gap-2">
                {hiddenForTab.map((c) => (
                  <button
                    key={c}
                    onClick={() => restoreDefault(c)}
                    className="flex items-center gap-1.5 px-3 py-1 border border-dashed border-slate-300 text-slate-400 rounded-full text-xs hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    title="Click to restore"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {c}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Click a hidden category to restore it.</p>
            </div>
          )}

          {/* Add new */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
              placeholder={`New ${categoryTab} category`}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addCategory}
              disabled={!newCategoryName.trim() || addingCategory}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>
        </Section>
      </main>
    </div>
  )
}

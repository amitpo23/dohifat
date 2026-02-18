'use client'

export function SectionHeader({ title, name, active, toggle }: {
  title: string
  name: string
  active: string | null
  toggle: (name: string) => void
}) {
  const isOpen = active === name
  return (
    <button
      type="button"
      onClick={() => toggle(name)}
      className="w-full flex items-center justify-between py-3 px-4 bg-white rounded-xl shadow-sm"
    >
      <h2 className="text-base font-bold text-desert-brown">{title}</h2>
      <span className={`text-desert-brown/40 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
    </button>
  )
}

export function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm text-center">
      <span className="text-xl block mb-0.5">{icon}</span>
      <p className="text-xl font-black text-desert-brown">{value}</p>
      <p className="text-[10px] text-desert-brown/50">{label}</p>
    </div>
  )
}

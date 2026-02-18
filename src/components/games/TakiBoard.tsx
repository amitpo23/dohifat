'use client'

import { useState, useEffect } from 'react'

interface TakiCard {
  id: number
  color: 'red' | 'blue' | 'green' | 'yellow' | 'any'
  value: string
}

interface TakiState {
  hands: Record<string, TakiCard[]>
  deck: TakiCard[]
  pile: TakiCard[]
  currentColor: string
  takiOpen: boolean
  drawPending: number
}

interface Props {
  gameState: TakiState
  teamA: number
  teamB: number
  teamAInfo: { emoji: string; color: string }
  teamBInfo: { emoji: string; color: string }
  currentTurn: number
  myTeamId: number | null
  onMove: (state: TakiState, nextTurn: number, winner?: number) => void
}

const COLORS: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow']
const COLOR_MAP: Record<string, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#22C55E',
  yellow: '#EAB308',
  any: '#9333EA',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createTakiState(teamA: number, teamB: number): TakiState {
  const deck: TakiCard[] = []
  let id = 0
  for (const color of COLORS) {
    for (let n = 1; n <= 9; n++) {
      deck.push({ id: id++, color, value: String(n) })
      deck.push({ id: id++, color, value: String(n) })
    }
    for (let i = 0; i < 2; i++) {
      deck.push({ id: id++, color, value: 'taki' })
      deck.push({ id: id++, color, value: 'stop' })
      deck.push({ id: id++, color, value: 'plus' })
      deck.push({ id: id++, color, value: 'plus2' })
    }
  }
  for (let i = 0; i < 4; i++) deck.push({ id: id++, color: 'any', value: 'change' })
  for (let i = 0; i < 2; i++) deck.push({ id: id++, color: 'any', value: 'supertaki' })

  const shuffled = shuffle(deck)
  const handA = shuffled.splice(0, 8)
  const handB = shuffled.splice(0, 8)
  const firstCard = shuffled.find((c) => c.color !== 'any' && !['taki', 'stop', 'plus', 'plus2', 'supertaki'].includes(c.value))
  if (firstCard) {
    const idx = shuffled.indexOf(firstCard)
    shuffled.splice(idx, 1)
    return {
      hands: { [teamA]: handA, [teamB]: handB },
      deck: shuffled,
      pile: [firstCard],
      currentColor: firstCard.color,
      takiOpen: false,
      drawPending: 0,
    }
  }
  return {
    hands: { [teamA]: handA, [teamB]: handB },
    deck: shuffled.slice(1),
    pile: [shuffled[0]],
    currentColor: shuffled[0].color === 'any' ? 'red' : shuffled[0].color,
    takiOpen: false,
    drawPending: 0,
  }
}

function canPlay(card: TakiCard, topCard: TakiCard, currentColor: string, takiOpen: boolean, takiColor?: string): boolean {
  if (card.color === 'any') return true
  if (takiOpen) return card.color === (takiColor || currentColor)
  if (card.color === currentColor) return true
  if (card.value === topCard.value && !['taki', 'stop', 'plus', 'plus2'].includes(topCard.value)) return true
  return false
}

function getLabel(value: string): string {
  const labels: Record<string, string> = {
    taki: 'T', stop: '⛔', plus: '+', plus2: '+2', change: '🔄', supertaki: '★',
  }
  return labels[value] || value
}

function ensureDeck(state: TakiState): TakiState {
  if (state.deck.length > 0) return state
  if (state.pile.length <= 1) return state
  const top = state.pile.at(-1)!
  const reshuffled = shuffle(state.pile.slice(0, -1))
  return { ...state, deck: reshuffled, pile: [top] }
}

export function TakiBoard({ gameState, teamA, teamB, teamAInfo, teamBInfo, currentTurn, myTeamId, onMove }: Props) {
  const [state, setState] = useState(gameState)
  const [choosingColor, setChoosingColor] = useState(false)
  const [pendingState, setPendingState] = useState<TakiState | null>(null)
  const isMyTurn = currentTurn === myTeamId
  const myHand = state.hands[myTeamId || ''] || []
  const oppId = myTeamId === teamA ? teamB : teamA
  const oppHand = state.hands[oppId] || []
  const topCard = state.pile.at(-1)

  useEffect(() => {
    setState(gameState)
    setChoosingColor(false)
    setPendingState(null)
  }, [gameState])

  const playCard = (card: TakiCard) => {
    if (!isMyTurn || !topCard) return
    if (!canPlay(card, topCard, state.currentColor, state.takiOpen, state.currentColor)) return

    const ns = { ...state, hands: { ...state.hands }, pile: [...state.pile, card], deck: [...state.deck] }
    ns.hands[myTeamId!] = myHand.filter((c) => c.id !== card.id)

    if (ns.hands[myTeamId!].length === 0) {
      onMove(ns, currentTurn, myTeamId!)
      return
    }

    if (card.color !== 'any') ns.currentColor = card.color

    if (card.value === 'change' || card.value === 'supertaki') {
      setPendingState(ns)
      setChoosingColor(true)
      return
    }

    if (card.value === 'taki' || card.value === 'supertaki') {
      setState({ ...ns, takiOpen: true })
      return
    }

    if (card.value === 'plus') {
      setState(ns)
      return
    }

    if (card.value === 'stop') {
      onMove({ ...ns, takiOpen: false }, currentTurn)
      return
    }

    if (card.value === 'plus2') {
      const drawn = drawCards(ensureDeck(ns), oppId, 2)
      onMove({ ...drawn, takiOpen: false }, currentTurn === teamA ? teamB : teamA)
      return
    }

    const nextTurn = state.takiOpen ? currentTurn : (currentTurn === teamA ? teamB : teamA)
    onMove({ ...ns, takiOpen: false }, nextTurn)
  }

  const chooseColor = (color: string) => {
    if (!pendingState) return
    const ns = { ...pendingState, currentColor: color, takiOpen: pendingState.pile.at(-1)?.value === 'supertaki' }
    setChoosingColor(false)
    setPendingState(null)
    if (ns.takiOpen) {
      setState(ns)
    } else {
      const nextTurn = currentTurn === teamA ? teamB : teamA
      onMove(ns, nextTurn)
    }
  }

  const closeTaki = () => {
    const ns = { ...state, takiOpen: false }
    const nextTurn = currentTurn === teamA ? teamB : teamA
    onMove(ns, nextTurn)
  }

  const drawCard = () => {
    if (!isMyTurn) return
    const ns = ensureDeck({ ...state, hands: { ...state.hands }, deck: [...state.deck] })
    if (ns.deck.length === 0) {
      const nextTurn = currentTurn === teamA ? teamB : teamA
      onMove(ns, nextTurn)
      return
    }
    const card = ns.deck.pop()!
    ns.hands[myTeamId!] = [...(ns.hands[myTeamId!] || []), card]
    const nextTurn = currentTurn === teamA ? teamB : teamA
    onMove(ns, nextTurn)
  }

  const drawCards = (s: TakiState, target: number, count: number) => {
    const ns = { ...s, hands: { ...s.hands }, deck: [...s.deck] }
    const drawn: TakiCard[] = []
    for (let i = 0; i < count; i++) {
      const fresh = ensureDeck(ns)
      ns.deck = fresh.deck
      ns.pile = fresh.pile
      if (ns.deck.length > 0) drawn.push(ns.deck.pop()!)
    }
    ns.hands[target] = [...(ns.hands[target] || []), ...drawn]
    return ns
  }

  const renderCard = (card: TakiCard, clickable: boolean, size: 'sm' | 'lg' = 'sm') => {
    const w = size === 'lg' ? 'w-14 h-20' : 'w-11 h-16'
    const txtSize = size === 'lg' ? 'text-lg' : 'text-sm'
    const playable = clickable && topCard && canPlay(card, topCard, state.currentColor, state.takiOpen, state.currentColor)
    return (
      <button
        key={card.id}
        type="button"
        onClick={() => clickable && playable && playCard(card)}
        disabled={!clickable || !playable}
        className={`${w} rounded-lg flex flex-col items-center justify-center font-black text-white shadow-sm
          border-2 transition-all shrink-0 ${playable ? 'border-white -translate-y-2 scale-105' : 'border-transparent opacity-60'}`}
        style={{ backgroundColor: COLOR_MAP[card.color] || '#666' }}
      >
        <span className={txtSize}>{getLabel(card.value)}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[380px]">
      {/* Opponent hand */}
      <div className="flex items-center gap-1">
        <span className="text-sm">{oppId === teamA ? teamAInfo.emoji : teamBInfo.emoji}</span>
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(oppHand.length, 12) }).map((_, i) => (
            <div key={i} className="w-6 h-9 rounded bg-desert-brown/30 border border-desert-brown/20" />
          ))}
        </div>
        <span className="text-xs text-desert-brown/50">({oppHand.length})</span>
      </div>

      {/* Pile + deck + color indicator */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={drawCard}
          disabled={!isMyTurn || state.takiOpen}
          className="w-14 h-20 rounded-lg bg-desert-brown/20 border-2 border-dashed border-desert-brown/30 flex items-center justify-center
                     text-desert-brown/40 text-xs font-bold disabled:opacity-40"
        >
          שלוף
          <br />({state.deck.length})
        </button>
        {topCard && renderCard(topCard, false, 'lg')}
        <div
          className="w-8 h-8 rounded-full border-4 border-white shadow"
          style={{ backgroundColor: COLOR_MAP[state.currentColor] }}
          title={`צבע נוכחי: ${state.currentColor}`}
        />
      </div>

      {/* Taki open indicator */}
      {state.takiOpen && isMyTurn && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-hoopoe animate-pulse">טאקי פתוח!</span>
          <button
            type="button"
            onClick={closeTaki}
            className="px-3 py-1 bg-accent-red text-white text-xs font-bold rounded-lg"
          >
            סגור טאקי
          </button>
        </div>
      )}

      {/* Color chooser */}
      {choosingColor && (
        <div className="flex gap-2 p-2 bg-white rounded-xl shadow-sm">
          <span className="text-sm font-bold text-desert-brown ml-2">בחרו צבע:</span>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => chooseColor(c)}
              className="w-10 h-10 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: COLOR_MAP[c] }}
            />
          ))}
        </div>
      )}

      {/* My hand */}
      <div className="flex gap-1 overflow-x-auto pb-2 px-2 max-w-full">
        {myHand.map((card) => renderCard(card, isMyTurn, 'sm'))}
      </div>

      {isMyTurn && !choosingColor && !state.takiOpen && (
        <p className="text-sm font-bold text-hoopoe animate-pulse">תורכם! שחקו קלף או שלפו</p>
      )}
    </div>
  )
}

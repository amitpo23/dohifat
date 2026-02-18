'use client'

import { useState, useEffect } from 'react'

interface PointState {
  team: number
  count: number
}

interface BackgammonState {
  points: (PointState | null)[]
  bar: Record<string, number>
  off: Record<string, number>
  dice: number[]
  movesLeft: number[]
  phase: 'roll' | 'move'
}

interface Props {
  gameState: BackgammonState
  teamA: number
  teamB: number
  teamAInfo: { emoji: string; color: string }
  teamBInfo: { emoji: string; color: string }
  currentTurn: number
  myTeamId: number | null
  onMove: (state: BackgammonState, nextTurn: number, winner?: number) => void
}

export function createBackgammonState(teamA: number, teamB: number): BackgammonState {
  const points: (PointState | null)[] = Array.from({ length: 25 }, () => null)
  points[1] = { team: teamB, count: 2 }
  points[6] = { team: teamA, count: 5 }
  points[8] = { team: teamA, count: 3 }
  points[12] = { team: teamB, count: 5 }
  points[13] = { team: teamA, count: 5 }
  points[17] = { team: teamB, count: 3 }
  points[19] = { team: teamB, count: 5 }
  points[24] = { team: teamA, count: 2 }
  return {
    points,
    bar: { [teamA]: 0, [teamB]: 0 },
    off: { [teamA]: 0, [teamB]: 0 },
    dice: [],
    movesLeft: [],
    phase: 'roll',
  }
}

function cloneState(s: BackgammonState): BackgammonState {
  return {
    points: s.points.map((p) => (p ? { ...p } : null)),
    bar: { ...s.bar },
    off: { ...s.off },
    dice: [...s.dice],
    movesLeft: [...s.movesLeft],
    phase: s.phase,
  }
}

function allInHome(state: BackgammonState, team: number, teamA: number): boolean {
  const homeStart = team === teamA ? 1 : 19
  const homeEnd = team === teamA ? 6 : 24
  if (state.bar[team] > 0) return false
  for (let i = 1; i <= 24; i++) {
    if (state.points[i]?.team === team && (i < homeStart || i > homeEnd)) return false
  }
  return true
}

function getDirection(team: number, teamA: number): number {
  return team === teamA ? -1 : 1
}

function getLegalMoves(state: BackgammonState, team: number, teamA: number, teamB: number, die: number): number[] {
  const dir = getDirection(team, teamA)
  const targets: number[] = []

  if (state.bar[team] > 0) {
    const entry = team === teamA ? 25 - die : die
    if (entry >= 1 && entry <= 24) {
      const pt = state.points[entry]
      const opp = team === teamA ? teamB : teamA
      if (!pt || pt.team === team || (pt.team === opp && pt.count <= 1)) {
        targets.push(entry)
      }
    }
    return targets
  }

  const canBearOff = allInHome(state, team, teamA)

  for (let i = 1; i <= 24; i++) {
    if (state.points[i]?.team !== team) continue
    const dest = i + dir * die
    if (dest >= 1 && dest <= 24) {
      const pt = state.points[dest]
      const opp = team === teamA ? teamB : teamA
      if (!pt || pt.team === team || (pt.team === opp && pt.count <= 1)) {
        targets.push(i)
      }
    } else if (canBearOff) {
      if (team === teamA && dest <= 0) targets.push(i)
      if (team === teamB && dest >= 25) targets.push(i)
    }
  }

  return targets
}

function applyMove(state: BackgammonState, from: number, die: number, team: number, teamA: number, teamB: number): BackgammonState {
  const ns = cloneState(state)
  const dir = getDirection(team, teamA)
  const opp = team === teamA ? teamB : teamA

  if (from === -1) {
    ns.bar[team]--
    const entry = team === teamA ? 25 - die : die
    const pt = ns.points[entry]
    if (pt && pt.team === opp && pt.count === 1) {
      ns.bar[opp]++
      ns.points[entry] = { team, count: 1 }
    } else if (pt && pt.team === team) {
      pt.count++
    } else {
      ns.points[entry] = { team, count: 1 }
    }
  } else {
    const src = ns.points[from]!
    if (src.count === 1) ns.points[from] = null
    else src.count--
    const dest = from + dir * die
    if (dest < 1 || dest > 24) {
      ns.off[team]++
    } else {
      const pt = ns.points[dest]
      if (pt && pt.team === opp && pt.count === 1) {
        ns.bar[opp]++
        ns.points[dest] = { team, count: 1 }
      } else if (pt && pt.team === team) {
        pt.count++
      } else {
        ns.points[dest] = { team, count: 1 }
      }
    }
  }

  const idx = ns.movesLeft.indexOf(die)
  if (idx >= 0) ns.movesLeft.splice(idx, 1)
  return ns
}

export function BackgammonBoard({ gameState, teamA, teamB, teamAInfo, teamBInfo, currentTurn, myTeamId, onMove }: Props) {
  const [state, setState] = useState(gameState)
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const isMyTurn = currentTurn === myTeamId

  useEffect(() => {
    setState(gameState)
    setSelectedPoint(null)
  }, [gameState])

  const rollDice = () => {
    if (!isMyTurn || state.phase !== 'roll') return
    const d1 = Math.floor(Math.random() * 6) + 1
    const d2 = Math.floor(Math.random() * 6) + 1
    const movesLeft = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2]
    const ns = { ...cloneState(state), dice: [d1, d2], movesLeft, phase: 'move' as const }

    let hasAnyMove = false
    for (const die of new Set(movesLeft)) {
      if (getLegalMoves(ns, myTeamId!, teamA, teamB, die).length > 0) {
        hasAnyMove = true
        break
      }
    }

    if (!hasAnyMove) {
      const final = { ...ns, movesLeft: [], phase: 'roll' as const }
      const nextTurn = currentTurn === teamA ? teamB : teamA
      onMove(final, nextTurn)
    } else {
      setState(ns)
    }
  }

  const handlePointClick = (pointIdx: number) => {
    if (!isMyTurn || state.phase !== 'move') return

    const fromBar = state.bar[myTeamId!] > 0

    if (fromBar) {
      for (const die of [...new Set(state.movesLeft)]) {
        const legals = getLegalMoves(state, myTeamId!, teamA, teamB, die)
        if (legals.length > 0) {
          const entry = myTeamId === teamA ? 25 - die : die
          if (pointIdx === entry) {
            const ns = applyMove(state, -1, die, myTeamId!, teamA, teamB)
            finishSubMove(ns)
            return
          }
        }
      }
      return
    }

    if (selectedPoint === pointIdx) {
      setSelectedPoint(null)
      return
    }

    if (state.points[pointIdx]?.team === myTeamId) {
      setSelectedPoint(pointIdx)
      return
    }

    if (selectedPoint !== null) {
      const dir = getDirection(myTeamId!, teamA)
      for (const die of [...new Set(state.movesLeft)]) {
        const dest = selectedPoint + dir * die
        if (dest === pointIdx || (dest < 1 && pointIdx === 0) || (dest > 24 && pointIdx === 25)) {
          const ns = applyMove(state, selectedPoint, die, myTeamId!, teamA, teamB)
          setSelectedPoint(null)
          finishSubMove(ns)
          return
        }
      }
    }
  }

  const handleBearOff = () => {
    if (!isMyTurn || !selectedPoint || state.phase !== 'move') return
    const dir = getDirection(myTeamId!, teamA)
    for (const die of [...new Set(state.movesLeft)]) {
      const dest = selectedPoint + dir * die
      if ((myTeamId === teamA && dest <= 0) || (myTeamId === teamB && dest >= 25)) {
        const ns = applyMove(state, selectedPoint, die, myTeamId!, teamA, teamB)
        setSelectedPoint(null)
        finishSubMove(ns)
        return
      }
    }
  }

  const finishSubMove = (ns: BackgammonState) => {
    if (ns.off[myTeamId!] >= 15) {
      onMove({ ...ns, phase: 'roll' }, currentTurn, myTeamId!)
      return
    }

    if (ns.movesLeft.length === 0) {
      const final = { ...ns, phase: 'roll' as const }
      const nextTurn = currentTurn === teamA ? teamB : teamA
      onMove(final, nextTurn)
      return
    }

    let hasMove = false
    for (const die of new Set(ns.movesLeft)) {
      if (getLegalMoves(ns, myTeamId!, teamA, teamB, die).length > 0) {
        hasMove = true
        break
      }
    }

    if (!hasMove) {
      const final = { ...ns, movesLeft: [], phase: 'roll' as const }
      const nextTurn = currentTurn === teamA ? teamB : teamA
      onMove(final, nextTurn)
    } else {
      setState(ns)
    }
  }

  const diceEmoji = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
  const topRow = Array.from({ length: 12 }, (_, i) => 13 + i)
  const bottomRow = Array.from({ length: 12 }, (_, i) => 12 - i)
  const canBearOff = selectedPoint !== null && allInHome(state, myTeamId!, teamA)

  const renderPoint = (idx: number, isTop: boolean) => {
    const pt = state.points[idx]
    const count = pt?.count || 0
    const color = pt ? (pt.team === teamA ? teamAInfo.color : teamBInfo.color) : 'transparent'
    const isSel = selectedPoint === idx
    const maxShow = 5
    const show = Math.min(count, maxShow)
    const isHighlighted = selectedPoint !== null && state.movesLeft.some((die) => {
      const dir = getDirection(myTeamId!, teamA)
      return selectedPoint + dir * die === idx
    })

    return (
      <button
        key={idx}
        type="button"
        onClick={() => handlePointClick(idx)}
        className={`relative flex ${isTop ? 'flex-col' : 'flex-col-reverse'} items-center w-full py-0.5 ${
          isSel ? 'bg-hoopoe/20' : isHighlighted ? 'bg-accent-teal/20' : ''
        }`}
        style={{ minHeight: 80 }}
      >
        <span className="text-[8px] text-desert-brown/30">{idx}</span>
        {Array.from({ length: show }).map((_, i) => (
          <span
            key={i}
            className="w-5 h-5 rounded-full border border-white/50 -my-0.5"
            style={{ backgroundColor: color }}
          />
        ))}
        {count > maxShow && <span className="text-[8px] text-desert-brown/50">+{count - maxShow}</span>}
      </button>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[360px]">
      {/* Dice + controls */}
      <div className="flex items-center gap-3">
        {state.dice.length > 0 && (
          <div className="flex gap-1 text-2xl">
            {state.dice.map((d, i) => (
              <span key={i} className={state.movesLeft.includes(d) ? '' : 'opacity-30'}>{diceEmoji[d]}</span>
            ))}
          </div>
        )}
        {isMyTurn && state.phase === 'roll' && (
          <button
            type="button"
            onClick={rollDice}
            className="px-4 py-2 bg-hoopoe text-white font-bold rounded-xl text-sm animate-pulse"
          >
            🎲 הטילו קוביות
          </button>
        )}
        {canBearOff && (
          <button
            type="button"
            onClick={handleBearOff}
            className="px-3 py-1 bg-accent-teal text-white font-bold rounded-lg text-xs"
          >
            הוצא מהלוח
          </button>
        )}
      </div>

      {/* Bar + off */}
      <div className="flex justify-between w-full text-xs text-desert-brown/60 px-2">
        <span>{teamAInfo.emoji} בר: {state.bar[teamA]} | הוצאו: {state.off[teamA]}</span>
        <span>{teamBInfo.emoji} בר: {state.bar[teamB]} | הוצאו: {state.off[teamB]}</span>
      </div>

      {/* Board */}
      <div className="bg-[#5C3D2E] rounded-xl p-1 w-full shadow-lg">
        {/* Top row: points 13-24 */}
        <div className="grid grid-cols-12 gap-px bg-[#8B6F47] rounded-t-lg overflow-hidden">
          {topRow.map((idx) => renderPoint(idx, true))}
        </div>
        {/* Bar */}
        <div className="h-3 bg-[#5C3D2E] flex items-center justify-center">
          {state.bar[currentTurn] > 0 && (
            <span className="text-[10px] text-white/60">
              {state.bar[currentTurn]} בבר
            </span>
          )}
        </div>
        {/* Bottom row: points 12-1 */}
        <div className="grid grid-cols-12 gap-px bg-[#8B6F47] rounded-b-lg overflow-hidden">
          {bottomRow.map((idx) => renderPoint(idx, false))}
        </div>
      </div>

      {isMyTurn && state.phase === 'move' && (
        <p className="text-sm font-bold text-hoopoe">בחרו כלי להזיז</p>
      )}
    </div>
  )
}

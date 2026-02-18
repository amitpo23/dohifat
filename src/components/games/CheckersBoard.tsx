'use client'

import { useState, useEffect } from 'react'

interface Piece {
  team: number
  king: boolean
}

interface CheckersState {
  board: (Piece | null)[][]
}

interface Props {
  gameState: CheckersState
  teamA: number
  teamB: number
  teamAInfo: { emoji: string; color: string }
  teamBInfo: { emoji: string; color: string }
  currentTurn: number
  myTeamId: number | null
  onMove: (state: CheckersState, nextTurn: number, winner?: number) => void
}

interface Move {
  row: number
  col: number
  captured: { row: number; col: number }[]
}

export function createCheckersState(teamA: number, teamB: number): CheckersState {
  const board: (Piece | null)[][] = Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => null)
  )
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { team: teamB, king: false }
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { team: teamA, king: false }
    }
  }
  return { board }
}

function getCaptures(board: (Piece | null)[][], r: number, c: number, teamA: number, teamB: number): Move[] {
  const piece = board[r][c]
  if (!piece) return []
  const opp = piece.team === teamA ? teamB : teamA
  const fwd = piece.team === teamA ? -1 : 1
  const dirs = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : [[fwd, -1], [fwd, 1]]
  const result: Move[] = []
  for (const [dr, dc] of dirs) {
    const mr = r + dr, mc = c + dc
    const nr = r + 2 * dr, nc = c + 2 * dc
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[mr]?.[mc]?.team === opp && !board[nr][nc]) {
      result.push({ row: nr, col: nc, captured: [{ row: mr, col: mc }] })
    }
  }
  return result
}

function getSimpleMoves(board: (Piece | null)[][], r: number, c: number, teamA: number): Move[] {
  const piece = board[r][c]
  if (!piece) return []
  const fwd = piece.team === teamA ? -1 : 1
  const dirs = piece.king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : [[fwd, -1], [fwd, 1]]
  const result: Move[] = []
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !board[nr][nc]) {
      result.push({ row: nr, col: nc, captured: [] })
    }
  }
  return result
}

function checkWin(board: (Piece | null)[][], teamA: number, teamB: number): number | undefined {
  let aCount = 0, bCount = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell?.team === teamA) aCount++
      if (cell?.team === teamB) bCount++
    }
  }
  if (aCount === 0) return teamB
  if (bCount === 0) return teamA
  return undefined
}

export function CheckersBoard({ gameState, teamA, teamB, teamAInfo, teamBInfo, currentTurn, myTeamId, onMove }: Props) {
  const [board, setBoard] = useState(gameState.board)
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [chainCapture, setChainCapture] = useState(false)
  const isMyTurn = currentTurn === myTeamId

  useEffect(() => {
    setBoard(gameState.board)
    setSelected(null)
    setMoves([])
    setChainCapture(false)
  }, [gameState])

  const handleClick = (r: number, c: number) => {
    if (!isMyTurn) return

    if (chainCapture && selected) {
      const move = moves.find((m) => m.row === r && m.col === c)
      if (move) doMove(selected.row, selected.col, move)
      return
    }

    const piece = board[r]?.[c]
    if (piece && piece.team === myTeamId) {
      const caps = getCaptures(board, r, c, teamA, teamB)
      const simple = caps.length > 0 ? [] : getSimpleMoves(board, r, c, teamA)
      setSelected({ row: r, col: c })
      setMoves([...caps, ...simple])
      return
    }

    if (selected) {
      const move = moves.find((m) => m.row === r && m.col === c)
      if (move) {
        doMove(selected.row, selected.col, move)
      } else {
        setSelected(null)
        setMoves([])
      }
    }
  }

  const doMove = (fr: number, fc: number, move: Move) => {
    const nb = board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
    const piece = { ...nb[fr][fc]! }
    nb[fr][fc] = null
    for (const cap of move.captured) nb[cap.row][cap.col] = null

    if ((piece.team === teamA && move.row === 0) || (piece.team === teamB && move.row === 7)) {
      piece.king = true
    }
    nb[move.row][move.col] = piece

    if (move.captured.length > 0) {
      const further = getCaptures(nb, move.row, move.col, teamA, teamB)
      if (further.length > 0) {
        setBoard(nb)
        setSelected({ row: move.row, col: move.col })
        setMoves(further)
        setChainCapture(true)
        return
      }
    }

    setSelected(null)
    setMoves([])
    setChainCapture(false)
    const winner = checkWin(nb, teamA, teamB)
    const nextTurn = currentTurn === teamA ? teamB : teamA
    onMove({ board: nb }, nextTurn, winner)
  }

  const isValidDest = (r: number, c: number) => moves.some((m) => m.row === r && m.col === c)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid grid-cols-8 gap-0 w-[320px] h-[320px] rounded-xl overflow-hidden shadow-md">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1
            const isSel = selected?.row === r && selected?.col === c
            const isDest = isValidDest(r, c)
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleClick(r, c)}
                className="w-10 h-10 flex items-center justify-center relative"
                style={{
                  backgroundColor: isSel ? '#D4943C' : dark ? '#8B6F47' : '#F5E6D3',
                }}
              >
                {isDest && (
                  <span className="absolute w-3 h-3 rounded-full bg-hoopoe/60 animate-pulse" />
                )}
                {cell && (
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black border-2 border-white/50"
                    style={{ backgroundColor: cell.team === teamA ? teamAInfo.color : teamBInfo.color }}
                  >
                    {cell.king ? '♛' : ''}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
      {isMyTurn && (
        <p className="text-sm font-bold text-hoopoe animate-pulse">
          {chainCapture ? 'המשיכו לאכול!' : 'תורכם! בחרו כלי'}
        </p>
      )}
    </div>
  )
}

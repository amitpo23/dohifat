'use client'

interface TicTacToeState {
  board: (number | null)[]
}

interface Props {
  gameState: TicTacToeState
  teamA: number
  teamB: number
  teamAInfo: { emoji: string; color: string }
  teamBInfo: { emoji: string; color: string }
  currentTurn: number
  myTeamId: number | null
  onMove: (state: TicTacToeState, nextTurn: number, winner?: number) => void
}

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function checkWinner(board: (number | null)[]): number | null {
  for (const [a, b, c] of LINES) {
    if (board[a] !== null && board[a] === board[b] && board[b] === board[c]) {
      return board[a]
    }
  }
  return null
}

export function createTicTacToeState(): TicTacToeState {
  return { board: Array.from({ length: 9 }, () => null) }
}

export function TicTacToeBoard({ gameState, teamA, teamB, teamAInfo, teamBInfo, currentTurn, myTeamId, onMove }: Props) {
  const isMyTurn = currentTurn === myTeamId
  const { board } = gameState

  const handleClick = (idx: number) => {
    if (!isMyTurn || board[idx] !== null) return
    const newBoard = [...board]
    newBoard[idx] = myTeamId!
    const winner = checkWinner(newBoard)
    const isDraw = !winner && newBoard.every((c) => c !== null)
    const nextTurn = currentTurn === teamA ? teamB : teamA
    onMove({ board: newBoard }, nextTurn, winner ?? (isDraw ? 0 : undefined))
  }

  const getCell = (val: number | null) => {
    if (val === teamA) return { text: teamAInfo.emoji, color: teamAInfo.color }
    if (val === teamB) return { text: teamBInfo.emoji, color: teamBInfo.color }
    return { text: '', color: 'transparent' }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-3 gap-2 w-[280px]">
        {board.map((cell, i) => {
          const info = getCell(cell)
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(i)}
              disabled={!isMyTurn || cell !== null}
              className="w-[88px] h-[88px] rounded-2xl bg-white shadow-sm flex items-center justify-center text-4xl
                         transition-all active:scale-95 disabled:cursor-default"
              style={{
                borderColor: info.color,
                borderWidth: cell ? 3 : 1,
                borderStyle: 'solid',
              }}
            >
              {info.text}
            </button>
          )
        })}
      </div>
      {isMyTurn && (
        <p className="text-sm font-bold text-hoopoe animate-pulse">תורכם! לחצו על משבצת</p>
      )}
    </div>
  )
}

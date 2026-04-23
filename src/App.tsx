import { useMemo, useState } from 'react'
import './App.css'

const BOARD_SIZE = 8

type PlayerColor = 'red' | 'black'
type Piece = 'r' | 'R' | 'b' | 'B'
type Cell = Piece | null
type Board = Cell[][]

type Position = {
  row: number
  col: number
}

type Move = Position & {
  capture: Position | null
}

const DIRECTIONS: Record<PlayerColor, ReadonlyArray<readonly [number, number]>> = {
  red: [
    [-1, -1],
    [-1, 1],
  ],
  black: [
    [1, -1],
    [1, 1],
  ],
}

const KING_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]

const inBounds = (row: number, col: number): boolean =>
  row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE

const getPieceColor = (piece: Cell): PlayerColor | null => {
  if (!piece) return null
  return piece.toLowerCase() === 'r' ? 'red' : 'black'
}

const isKing = (piece: Cell): piece is 'R' | 'B' => piece === 'R' || piece === 'B'

const createInitialBoard = (): Board => {
  const board: Board = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  )

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const isDarkSquare = (row + col) % 2 === 1
      if (!isDarkSquare) continue

      if (row < 3) {
        board[row][col] = 'b'
      } else if (row > 4) {
        board[row][col] = 'r'
      }
    }
  }

  return board
}

const getMovesForPiece = (
  board: Board,
  row: number,
  col: number,
  onlyCaptures = false,
): Move[] => {
  const piece = board[row][col]
  if (!piece) return []

  const color = getPieceColor(piece)
  if (!color) return []

  const dirs = isKing(piece) ? KING_DIRECTIONS : DIRECTIONS[color]
  const moves: Move[] = []

  dirs.forEach(([dy, dx]) => {
    const nextRow = row + dy
    const nextCol = col + dx

    if (inBounds(nextRow, nextCol) && board[nextRow][nextCol] === null && !onlyCaptures) {
      moves.push({ row: nextRow, col: nextCol, capture: null })
    }

    const jumpRow = row + dy * 2
    const jumpCol = col + dx * 2
    if (!inBounds(jumpRow, jumpCol)) return

    const midPiece = board[nextRow]?.[nextCol]
    if (
      midPiece &&
      getPieceColor(midPiece) !== color &&
      board[jumpRow][jumpCol] === null
    ) {
      moves.push({
        row: jumpRow,
        col: jumpCol,
        capture: { row: nextRow, col: nextCol },
      })
    }
  })

  return moves
}

const getPiecesWithCaptures = (board: Board, turn: PlayerColor): Position[] => {
  const result: Position[] = []
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col]
      if (getPieceColor(piece) !== turn) continue
      const captures = getMovesForPiece(board, row, col, true)
      if (captures.some((move) => move.capture)) {
        result.push({ row, col })
      }
    }
  }
  return result
}

const countPieces = (board: Board): Record<PlayerColor, number> => {
  let red = 0
  let black = 0
  board.forEach((line) => {
    line.forEach((piece) => {
      if (getPieceColor(piece) === 'red') red += 1
      if (getPieceColor(piece) === 'black') black += 1
    })
  })
  return { red, black }
}

const hasAnyMoves = (board: Board, turn: PlayerColor): boolean => {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const piece = board[row][col]
      if (getPieceColor(piece) !== turn) continue
      if (getMovesForPiece(board, row, col).length > 0) return true
    }
  }
  return false
}

function App() {
  const [board, setBoard] = useState<Board>(createInitialBoard)
  const [turn, setTurn] = useState<PlayerColor>('red')
  const [selected, setSelected] = useState<Position | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Move[]>([])

  const piecesWithCaptures = useMemo(() => getPiecesWithCaptures(board, turn), [board, turn])

  const winner = useMemo<PlayerColor | null>(() => {
    const { red, black } = countPieces(board)
    if (red === 0) return 'black'
    if (black === 0) return 'red'
    if (!hasAnyMoves(board, turn)) return turn === 'red' ? 'black' : 'red'
    return null
  }, [board, turn])

  const resetGame = () => {
    setBoard(createInitialBoard())
    setTurn('red')
    setSelected(null)
    setPossibleMoves([])
  }

  const onCellClick = (row: number, col: number) => {
    if (winner) return

    const clickedPiece = board[row][col]
    const clickedColor = getPieceColor(clickedPiece)

    const move = possibleMoves.find((item) => item.row === row && item.col === col)
    if (selected && move) {
      const nextBoard = board.map((line) => [...line]) as Board
      const movingPiece = nextBoard[selected.row][selected.col]
      if (!movingPiece) return

      nextBoard[selected.row][selected.col] = null

      let placedPiece: Piece = movingPiece
      if (movingPiece === 'r' && row === 0) placedPiece = 'R'
      if (movingPiece === 'b' && row === BOARD_SIZE - 1) placedPiece = 'B'
      nextBoard[row][col] = placedPiece

      if (move.capture) {
        nextBoard[move.capture.row][move.capture.col] = null
      }

      if (move.capture) {
        const nextCaptures = getMovesForPiece(nextBoard, row, col, true).filter(
          (item) => item.capture,
        )
        if (nextCaptures.length > 0) {
          setBoard(nextBoard)
          setSelected({ row, col })
          setPossibleMoves(nextCaptures)
          return
        }
      }

      setBoard(nextBoard)
      setSelected(null)
      setPossibleMoves([])
      setTurn(turn === 'red' ? 'black' : 'red')
      return
    }

    if (clickedColor !== turn) {
      setSelected(null)
      setPossibleMoves([])
      return
    }

    const mustCapture = piecesWithCaptures.length > 0
    const canSelectThisPiece =
      !mustCapture || piecesWithCaptures.some((piece) => piece.row === row && piece.col === col)
    if (!canSelectThisPiece) return

    const moves = getMovesForPiece(board, row, col, mustCapture)
    setSelected({ row, col })
    setPossibleMoves(moves)
  }

  const turnLabel = turn === 'red' ? 'Czerwony' : 'Czarny'
  const winnerLabel = winner === 'red' ? 'Czerwony' : 'Czarny'

  return (
    <main className="game-page">
      <header className="top-bar">
        <div>
          <h1>Warcaby - React MVP</h1>
          <p className="status">
            {winner ? `Wygrał: ${winnerLabel}` : `Ruch gracza: ${turnLabel}`}
          </p>
        </div>
        <button className="reset-btn" onClick={resetGame}>
          Nowa gra
        </button>
      </header>

      <section className="board" aria-label="Plansza warcabowa">
        {board.map((line, row) =>
          line.map((piece, col) => {
            const isDark = (row + col) % 2 === 1
            const isSelected = selected?.row === row && selected?.col === col
            const moveTarget = possibleMoves.find(
              (item) => item.row === row && item.col === col,
            )
            const pieceColorClass = getPieceColor(piece) ?? ''

            return (
              <button
                key={`${row}-${col}`}
                className={`cell ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''}`}
                onClick={() => onCellClick(row, col)}
                disabled={!isDark || Boolean(winner)}
              >
                {piece && (
                  <span className={`piece ${pieceColorClass} ${isKing(piece) ? 'king' : ''}`}>
                    {isKing(piece) ? 'K' : ''}
                  </span>
                )}
                {moveTarget && <span className="move-dot">{moveTarget.capture ? 'x' : ''}</span>}
              </button>
            )
          }),
        )}
      </section>

      <section className="legend">
        <p>
          Kliknij pionek, aby zobaczyc ruchy. Bicie jest obowiazkowe, gdy jest
          dostepne.
        </p>
        <p>
          Kiedy pionek dojdzie do konca planszy, staje sie damka (oznaczenie
          <strong> K</strong>).
        </p>
      </section>
    </main>
  )
}

export default App

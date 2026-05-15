import React, { useState, useEffect } from 'react';
import { Plus, Trophy, Trash2, Shuffle, ChevronLeft, DollarSign, Calendar, Users, Check, MessageCircle, Send } from 'lucide-react';
import { supabase } from './supabase';

export default function SquareBoard() {
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [view, setView] = useState('home'); // home, create, board
  const [loaded, setLoaded] = useState(false);

  // Form state for creating a board
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [buyIn, setBuyIn] = useState('');

  // Form state for claiming a square
  const [claimingIndex, setClaimingIndex] = useState(null);
  const [claimName, setClaimName] = useState('');

  // Form state for entering scores
  const [scoringQuarter, setScoringQuarter] = useState(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  // Confirmation modals
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);

  // Comments state
  const [commentName, setCommentName] = useState(() => {
    try { return localStorage.getItem('commentName') || ''; } catch { return ''; }
  });
  const [commentText, setCommentText] = useState('');
  const [commentTeam, setCommentTeam] = useState('none'); // 'home', 'away', 'none'

  // Load boards from Supabase on mount
  useEffect(() => {
    async function loadBoards() {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load boards from Supabase:', error);
      } else {
        // Convert database snake_case to camelCase for our React code
        const camelBoards = (data || []).map(dbToBoard);
        setBoards(camelBoards);
      }
      setLoaded(true);
    }
    loadBoards();
  }, []);

  // Subscribe to realtime updates from Supabase.
  // When ANY board changes in the database, update our local state.
  useEffect(() => {
    const channel = supabase
      .channel('boards-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'boards' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newBoard = dbToBoard(payload.new);
            setBoards((current) => {
              // Don't add if we already have this board (e.g. we just created it ourselves)
              if (current.some((b) => b.id === newBoard.id)) return current;
              return [newBoard, ...current];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedBoard = dbToBoard(payload.new);
            setBoards((current) =>
              current.map((b) => (b.id === updatedBoard.id ? updatedBoard : b))
            );
            // If this is the currently active board, update it too
            setActiveBoard((current) =>
              current && current.id === updatedBoard.id ? updatedBoard : current
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setBoards((current) => current.filter((b) => b.id !== deletedId));
            setActiveBoard((current) =>
              current && current.id === deletedId ? null : current
            );
          }
        }
      )
      .subscribe();

    // Cleanup: when the component unmounts (rare, but matters), close the channel
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Convert a database row (snake_case) to a board object (camelCase)
  // that matches what the rest of our code expects.
  function dbToBoard(row) {
    return {
      id: row.id,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      gameDate: row.game_date,
      buyIn: parseFloat(row.buy_in) || 0,
      squares: row.squares || Array(100).fill(null),
      rowNumbers: row.row_numbers,
      colNumbers: row.col_numbers,
      scores: row.scores || { q1: null, q2: null, q3: null, final: null },
      winners: row.winners || { q1: null, q2: null, q3: null, final: null },
      comments: row.comments || [],
      lockedEarly: row.locked_early,
      createdAt: row.created_at,
    };
  }

  // Save boards to storage whenever they change
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem('boards', JSON.stringify(boards));
    } catch (err) {
      console.error('Failed to save boards:', err);
    }
  }, [boards, loaded]);

  async function createBoard() {
    if (!homeTeam.trim() || !awayTeam.trim()) return;

    // Insert into Supabase. The database will generate the UUID and timestamps.
    const { data, error } = await supabase
      .from('boards')
      .insert({
        home_team: homeTeam.trim(),
        away_team: awayTeam.trim(),
        game_date: gameDate,
        buy_in: parseFloat(buyIn) || 0,
        squares: Array(100).fill(null),
        // row_numbers, col_numbers stay null until drawn
        scores: { q1: null, q2: null, q3: null, final: null },
        winners: { q1: null, q2: null, q3: null, final: null },
        comments: [],
        locked_early: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create board:', error);
      alert('Sorry, could not create the board. Please try again.');
      return;
    }

    // Convert the returned row to our camelCase format and add to state
    const newBoard = dbToBoard(data);
    setBoards([newBoard, ...boards]);
    setActiveBoard(newBoard);
    setHomeTeam('');
    setAwayTeam('');
    setGameDate('');
    setBuyIn('');
    setView('board');
  }

  function deleteBoard(id) {
    if (!confirm('Delete this board? This cannot be undone.')) return;
    setBoards(boards.filter(b => b.id !== id));
    if (activeBoard?.id === id) {
      setActiveBoard(null);
      setView('home');
    }
  }

  async function updateActiveBoard(updates) {
    const updated = { ...activeBoard, ...updates };
    setActiveBoard(updated);
    setBoards(boards.map(b => b.id === updated.id ? updated : b));

    const dbUpdates = {};
    if ('homeTeam' in updates) dbUpdates.home_team = updates.homeTeam;
    if ('awayTeam' in updates) dbUpdates.away_team = updates.awayTeam;
    if ('gameDate' in updates) dbUpdates.game_date = updates.gameDate;
    if ('buyIn' in updates) dbUpdates.buy_in = updates.buyIn;
    if ('squares' in updates) dbUpdates.squares = updates.squares;
    if ('rowNumbers' in updates) dbUpdates.row_numbers = updates.rowNumbers;
    if ('colNumbers' in updates) dbUpdates.col_numbers = updates.colNumbers;
    if ('scores' in updates) dbUpdates.scores = updates.scores;
    if ('winners' in updates) dbUpdates.winners = updates.winners;
    if ('comments' in updates) dbUpdates.comments = updates.comments;
    if ('lockedEarly' in updates) dbUpdates.locked_early = updates.lockedEarly;
    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('boards')
      .update(dbUpdates)
      .eq('id', activeBoard.id);

    if (error) {
      console.error('Failed to update board:', error);
    }
  }

  function claimSquare(index) {
    if (!claimName.trim()) return;
    const newSquares = [...activeBoard.squares];
    newSquares[index] = { name: claimName.trim() };

    const changes = { squares: newSquares };

    // Auto-assign numbers if board just got filled
    const filledCount = newSquares.filter(s => s !== null).length;
    if (filledCount === 100 && !activeBoard.rowNumbers) {
      changes.rowNumbers = shuffle([0,1,2,3,4,5,6,7,8,9]);
      changes.colNumbers = shuffle([0,1,2,3,4,5,6,7,8,9]);
    }

    updateActiveBoard(changes);
    setClaimingIndex(null);
    setClaimName('');
  }

  function drawNumbersEarly() {
    updateActiveBoard({
      rowNumbers: shuffle([0,1,2,3,4,5,6,7,8,9]),
      colNumbers: shuffle([0,1,2,3,4,5,6,7,8,9]),
      lockedEarly: true,
    });
    setShowDrawConfirm(false);
  }

  function unclaimSquare(index) {
    const newSquares = [...activeBoard.squares];
    newSquares[index] = null;
    updateActiveBoard({ squares: newSquares });
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function recordScore(quarter) {
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);
    if (isNaN(home) || isNaN(away)) return;

    const homeDigit = home % 10;
    const awayDigit = away % 10;

    // Find the winning square
    const colIdx = activeBoard.colNumbers.indexOf(homeDigit);
    const rowIdx = activeBoard.rowNumbers.indexOf(awayDigit);
    const squareIdx = rowIdx * 10 + colIdx;
    const winnerName = activeBoard.squares[squareIdx]?.name || 'Unclaimed';

    const newScores = { ...activeBoard.scores, [quarter]: { home, away } };
    const newWinners = { ...activeBoard.winners, [quarter]: { name: winnerName, squareIdx, homeDigit, awayDigit } };

    updateActiveBoard({ scores: newScores, winners: newWinners });
    setScoringQuarter(null);
    setHomeScore('');
    setAwayScore('');
  }

  function clearScore(quarter) {
    const newScores = { ...activeBoard.scores, [quarter]: null };
    const newWinners = { ...activeBoard.winners, [quarter]: null };
    updateActiveBoard({ scores: newScores, winners: newWinners });
  }

  function addComment() {
    if (!commentName.trim() || !commentText.trim()) return;
    const trimmedName = commentName.trim();
    const newComment = {
      id: Date.now().toString(),
      name: trimmedName,
      text: commentText.trim(),
      team: commentTeam,
      timestamp: Date.now(),
    };
    const comments = activeBoard.comments || [];
    updateActiveBoard({ comments: [newComment, ...comments] });
    setCommentText('');
    try { localStorage.setItem('commentName', trimmedName); } catch {}
  }

  function deleteComment(id) {
    const comments = (activeBoard.comments || []).filter(c => c.id !== id);
    updateActiveBoard({ comments });
  }

  function formatTimestamp(ts) {
    const now = Date.now();
    const diff = now - ts;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  function getFilledCount(board) {
    return board.squares.filter(s => s !== null).length;
  }

  function getPotInfo(board) {
    const filled = board.squares.filter(s => s !== null).length;
    const total = board.buyIn * filled;
    const perQuarter = total / 4;
    // Count unclaimed quarter wins to add to final
    const unclaimedQuarters = ['q1', 'q2', 'q3'].filter(q => {
      const w = board.winners[q];
      return w && w.name === 'Unclaimed';
    }).length;
    const finalBonus = unclaimedQuarters * perQuarter;
    // If Final itself is unclaimed, all that money becomes orphaned
    const finalIsUnclaimed = board.winners.final && board.winners.final.name === 'Unclaimed';
    const orphanedAmount = finalIsUnclaimed ? perQuarter + finalBonus : 0;
    return { total, perQuarter, finalBonus, filled, orphanedAmount, finalIsUnclaimed };
  }

  // ============== HOME VIEW ==============
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center pt-8 pb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 mb-4 shadow-lg shadow-emerald-500/30">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-2 h-2 bg-white rounded-sm"></div>
                <div className="w-2 h-2 bg-white/60 rounded-sm"></div>
                <div className="w-2 h-2 bg-white/60 rounded-sm"></div>
                <div className="w-2 h-2 bg-white rounded-sm"></div>
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tight">SquareBoard</h1>
            <p className="text-slate-400 mt-2">Run your football squares pool, the easy way</p>
          </div>

          <button
            onClick={() => setView('create')}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] mb-8"
          >
            <Plus size={20} />
            Create New Board
          </button>

          {boards.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-2xl bg-white/5 border border-white/10">
              <Trophy size={40} className="mx-auto text-slate-500 mb-3" />
              <p className="text-slate-400">No boards yet. Create one to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-2">Your Boards</h2>
              {boards.map(board => {
                const filled = getFilledCount(board);
                const pot = getPotInfo(board);
                return (
                  <button
                    key={board.id}
                    onClick={() => { setActiveBoard(board); setView('board'); }}
                    className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 transition-all hover:border-emerald-500/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-lg leading-tight">
                          {board.awayTeam} <span className="text-slate-500">@</span> {board.homeTeam}
                        </div>
                        {board.gameDate && (
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(board.gameDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                      {pot.total > 0 && (
                        <div className="text-right">
                          <div className="text-emerald-400 font-bold">${pot.total.toFixed(2)}</div>
                          <div className="text-xs text-slate-500">pot</div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Users size={12} />
                        {filled}/100 squares
                      </div>
                      <div className="flex-1 mx-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                          style={{ width: `${filled}%` }}
                        />
                      </div>
                      <div className="text-xs font-semibold text-slate-300">{filled}%</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center text-xs text-slate-600 pb-6">
            All data stays on your device. Money is handled offline between players.
          </div>
        </div>
      </div>
    );
  }

  // ============== CREATE VIEW ==============
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setView('home')}
            className="flex items-center gap-1 text-slate-400 hover:text-white mb-6 mt-2"
          >
            <ChevronLeft size={18} /> Back
          </button>

          <h1 className="text-3xl font-black mb-2">New Board</h1>
          <p className="text-slate-400 mb-8">Set up a squares pool for an upcoming game</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Away Team</label>
              <input
                type="text"
                value={awayTeam}
                onChange={e => setAwayTeam(e.target.value)}
                placeholder="e.g. Cowboys"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Home Team</label>
              <input
                type="text"
                value={homeTeam}
                onChange={e => setHomeTeam(e.target.value)}
                placeholder="e.g. Eagles"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Game Date (optional)</label>
              <input
                type="date"
                value={gameDate}
                onChange={e => setGameDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">Buy-in per Square (optional)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="number"
                  value={buyIn}
                  onChange={e => setBuyIn(e.target.value)}
                  placeholder="0.25"
                  min="0"
                  step="0.25"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">As low as $0.25 per square. Money is collected offline. The app just tracks who wins.</p>
            </div>

            <button
              onClick={createBoard}
              disabled={!homeTeam.trim() || !awayTeam.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
            >
              Create Board
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============== BOARD VIEW ==============
  if (view === 'board' && activeBoard) {
    const filled = getFilledCount(activeBoard);
    const isFilled = filled === 100;
    const pot = getPotInfo(activeBoard);
    const quarters = [
      { key: 'q1', label: 'Q1' },
      { key: 'q2', label: 'Q2' },
      { key: 'q3', label: 'Q3' },
      { key: 'final', label: 'Final' },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 mt-2">
            <button
              onClick={() => setView('home')}
              className="flex items-center gap-1 text-slate-400 hover:text-white"
            >
              <ChevronLeft size={18} /> Back
            </button>
            <button
              onClick={() => deleteBoard(activeBoard.id)}
              className="text-slate-500 hover:text-red-400 p-2"
              title="Delete board"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {activeBoard.awayTeam} <span className="text-slate-500 font-light">@</span> {activeBoard.homeTeam}
            </h1>
            {activeBoard.gameDate && (
              <p className="text-sm text-slate-400 mt-1">
                {new Date(activeBoard.gameDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            )}
            {pot.total > 0 && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <DollarSign size={14} className="text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">${pot.total.toFixed(2)} pot</span>
                <span className="text-xs text-emerald-400/70">· ${pot.perQuarter.toFixed(2)}/qtr</span>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">{filled}/100 squares claimed</span>
              <span className="text-sm text-slate-400">{filled}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                style={{ width: `${filled}%` }}
              />
            </div>

            {!activeBoard.rowNumbers && !isFilled && (
              <div>
                <p className="text-xs text-slate-400 mt-3">
                  Tap any square to claim it. Numbers are drawn automatically once all 100 are filled — or draw them early for a small pool.
                </p>
                {filled >= 1 && (
                  <button
                    onClick={() => setShowDrawConfirm(true)}
                    className="mt-3 w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Shuffle size={14} />
                    Draw Numbers & Start Game ({filled} {filled === 1 ? 'square' : 'squares'} in play)
                  </button>
                )}
              </div>
            )}

            {isFilled && !activeBoard.scores.q1 && (
              <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
                <Check size={14} /> Board is full! Numbers drawn. Enter scores below as the game progresses.
              </p>
            )}

            {!isFilled && activeBoard.rowNumbers && (
              <p className="text-xs text-cyan-400 mt-3 flex items-center gap-1">
                <Check size={14} /> Numbers drawn. {filled} squares in play. Unclaimed quarter wins roll to Final.
              </p>
            )}
          </div>

          {/* Quarter scores section (only show when numbers are drawn) */}
          {activeBoard.rowNumbers && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <h3 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-3">Quarter Results</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {quarters.map(q => {
                  const score = activeBoard.scores[q.key];
                  const winner = activeBoard.winners[q.key];
                  const isUnclaimed = winner?.name === 'Unclaimed';
                  const finalBonusForDisplay = q.key === 'final' ? pot.finalBonus : 0;
                  return (
                    <div key={q.key} className="bg-black/20 rounded-xl p-3">
                      <div className="text-xs text-slate-400 font-bold mb-1">{q.label}</div>
                      {score ? (
                        <>
                          <div className="text-sm font-bold">
                            {score.away}-{score.home}
                          </div>
                          {isUnclaimed ? (
                            <div className="text-xs text-amber-400 mt-1">
                              No winner
                              {q.key !== 'final' && <div className="text-amber-400/70">Rolls to Final</div>}
                              {q.key === 'final' && pot.orphanedAmount > 0 && (
                                <div className="text-amber-400/70">${pot.orphanedAmount.toFixed(2)} unclaimed</div>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="text-xs text-emerald-400 mt-1 truncate" title={winner.name}>
                                🏆 {winner.name}
                              </div>
                              {pot.perQuarter > 0 && (
                                <div className="text-xs text-emerald-400/70">
                                  ${(pot.perQuarter + finalBonusForDisplay).toFixed(2)}
                                  {finalBonusForDisplay > 0 && <span className="ml-1">(+bonus)</span>}
                                </div>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => clearScore(q.key)}
                            className="text-xs text-slate-500 hover:text-red-400 mt-1"
                          >
                            Clear
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setScoringQuarter(q.key)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                        >
                          + Enter score
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Orphaned pot warning */}
              {pot.orphanedAmount > 0 && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  <div className="text-sm font-bold text-amber-300 mb-1">
                    ⚠️ ${pot.orphanedAmount.toFixed(2)} unclaimed
                  </div>
                  <p className="text-xs text-amber-300/80">
                    The Final quarter winning square was unclaimed, so this money has no winner. Most pools refund it, split it among other winners, or save it for the next pool — it's up to you to decide.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* The grid */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-5 mb-6">
            {/* Top label - home team */}
            <div className="text-center text-xs sm:text-sm uppercase tracking-wider text-cyan-400 font-bold mb-3">
              {activeBoard.homeTeam} →
            </div>

            {/* Main grid using a single CSS grid so rows align perfectly */}
            <div
              className="grid gap-1 sm:gap-1.5"
              style={{ gridTemplateColumns: 'auto repeat(10, 1fr)' }}
            >
              {/* Top-left empty corner */}
              <div></div>

              {/* Column headers (cyan numbers) */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={`col-${i}`} className="aspect-square flex items-center justify-center text-sm sm:text-base font-bold text-cyan-400">
                  {activeBoard.colNumbers ? activeBoard.colNumbers[i] : '?'}
                </div>
              ))}

              {/* Rows: orange label + 10 squares each */}
              {Array.from({ length: 10 }).map((_, row) => (
                <React.Fragment key={`row-${row}`}>
                  {/* Row label (orange number) */}
                  <div className="flex items-center justify-center text-sm sm:text-base font-bold text-orange-400 w-7 sm:w-10 h-full">
                    {activeBoard.rowNumbers ? activeBoard.rowNumbers[row] : '?'}
                  </div>

                  {/* 10 squares in this row */}
                  {Array.from({ length: 10 }).map((_, col) => {
                    const idx = row * 10 + col;
                    const square = activeBoard.squares[idx];
                    const isWinner = Object.values(activeBoard.winners).some(w => w?.squareIdx === idx);

                    return (
                      <button
                        key={`sq-${idx}`}
                        onClick={() => {
                          if (activeBoard.rowNumbers && !square) return;
                          if (square) {
                            if (activeBoard.rowNumbers) return;
                            if (confirm(`Remove ${square.name} from this square?`)) {
                              unclaimSquare(idx);
                            }
                          } else {
                            setClaimingIndex(idx);
                          }
                        }}
                        disabled={activeBoard.rowNumbers && !square}
                        className={`aspect-square rounded sm:rounded-md text-[9px] sm:text-xs font-semibold transition-all overflow-hidden ${
                          isWinner
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black shadow-lg shadow-yellow-500/30'
                            : square
                            ? 'bg-emerald-500/30 border border-emerald-400/60 text-emerald-50 hover:bg-emerald-500/40'
                            : activeBoard.rowNumbers
                            ? 'bg-slate-800/40 border border-slate-700/40 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-700/60 border border-slate-500/50 text-slate-400 hover:bg-cyan-500/30 hover:border-cyan-400/70 hover:text-white'
                        }`}
                      >
                        {square ? (
                          <span className="block px-0.5 truncate leading-tight">
                            {isWinner && '🏆 '}
                            {square.name}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            {/* Bottom label - away team */}
            <div className="text-center text-xs sm:text-sm uppercase tracking-wider text-orange-400 font-bold mt-3">
              ↑ {activeBoard.awayTeam}
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center mb-4">
            <span className="text-cyan-400">Cyan numbers</span> = {activeBoard.homeTeam} score digit · <span className="text-orange-400">Orange numbers</span> = {activeBoard.awayTeam} score digit
          </div>

          {/* Comments section */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={18} className="text-cyan-400" />
              <h3 className="font-bold">Game Chat</h3>
              <span className="text-xs text-slate-500 ml-auto">
                {(activeBoard.comments || []).length} {(activeBoard.comments || []).length === 1 ? 'comment' : 'comments'}
              </span>
            </div>

            {/* Comment input */}
            <div className="bg-black/20 rounded-xl p-3 mb-4">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={commentName}
                  onChange={e => setCommentName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
                />
                <select
                  value={commentTeam}
                  onChange={e => setCommentTeam(e.target.value)}
                  className="bg-slate-800 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none transition"
                >
                  <option value="none" className="bg-slate-800 text-white">No team</option>
                  <option value="away" className="bg-slate-800 text-white">{activeBoard.awayTeam || 'Away'}</option>
                  <option value="home" className="bg-slate-800 text-white">{activeBoard.homeTeam || 'Home'}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                  placeholder="Cheer, jeer, or just trash talk..."
                  rows={2}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition resize-none"
                />
                <button
                  onClick={addComment}
                  disabled={!commentName.trim() || !commentText.trim()}
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg px-4 transition-all flex items-center justify-center"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>

            {/* Comments list */}
            {(!activeBoard.comments || activeBoard.comments.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No comments yet. Be the first to chime in!
              </div>
            ) : (
              <div className="space-y-2">
                {activeBoard.comments.map(comment => {
                  const teamColor =
                    comment.team === 'home' ? 'border-l-cyan-400 bg-cyan-500/5' :
                    comment.team === 'away' ? 'border-l-orange-400 bg-orange-500/5' :
                    'border-l-slate-600 bg-white/5';
                  const teamBadge =
                    comment.team === 'home' ? { label: activeBoard.homeTeam, color: 'text-cyan-400' } :
                    comment.team === 'away' ? { label: activeBoard.awayTeam, color: 'text-orange-400' } :
                    null;

                  return (
                    <div
                      key={comment.id}
                      className={`border-l-4 rounded-r-lg p-3 ${teamColor} group`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-sm truncate">{comment.name}</span>
                          {teamBadge && (
                            <span className={`text-[10px] uppercase tracking-wider font-bold ${teamBadge.color} flex-shrink-0`}>
                              {teamBadge.label}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {formatTimestamp(comment.timestamp)}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Claim square modal */}
        {claimingIndex !== null && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setClaimingIndex(null)}>
            <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-2">Claim Square</h3>
              <p className="text-sm text-slate-400 mb-4">Who's claiming this square?</p>
              <input
                type="text"
                value={claimName}
                onChange={e => setClaimName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && claimSquare(claimingIndex)}
                placeholder="Enter name"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setClaimingIndex(null); setClaimName(''); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => claimSquare(claimingIndex)}
                  disabled={!claimName.trim()}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:opacity-30 hover:from-emerald-400 hover:to-cyan-400 rounded-xl py-3 font-bold transition"
                >
                  Claim
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Score entry modal */}
        {scoringQuarter && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setScoringQuarter(null)}>
            <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-2">
                {quarters.find(q => q.key === scoringQuarter)?.label} Score
              </h3>
              <p className="text-sm text-slate-400 mb-4">Enter the score at the end of this quarter.</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-orange-400 font-bold mb-2">{activeBoard.awayTeam}</label>
                  <input
                    type="number"
                    value={awayScore}
                    onChange={e => setAwayScore(e.target.value)}
                    placeholder="0"
                    min="0"
                    autoFocus
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-bold focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-cyan-400 font-bold mb-2">{activeBoard.homeTeam}</label>
                  <input
                    type="number"
                    value={homeScore}
                    onChange={e => setHomeScore(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-bold focus:border-emerald-500 focus:outline-none transition"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setScoringQuarter(null); setHomeScore(''); setAwayScore(''); }}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => recordScore(scoringQuarter)}
                  disabled={homeScore === '' || awayScore === ''}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:opacity-30 hover:from-emerald-400 hover:to-cyan-400 rounded-xl py-3 font-bold transition"
                >
                  Record
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Draw numbers confirmation modal */}
        {showDrawConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDrawConfirm(false)}>
            <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-2">Draw Numbers & Start?</h3>
              <p className="text-sm text-slate-400 mb-4">
                This will randomly assign 0-9 to the rows and columns and lock the board. No more squares can be claimed or removed after this.
              </p>
              <p className="text-sm text-cyan-300 mb-5">
                <span className="font-bold">{filled}</span> {filled === 1 ? 'square is' : 'squares are'} currently in play.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDrawConfirm(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={drawNumbersEarly}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 rounded-xl py-3 font-bold transition"
                >
                  Draw & Lock
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null
}
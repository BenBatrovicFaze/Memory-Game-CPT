import React, { useState, useEffect, useRef } from "react";

// URL to fetch a big emoji list (no API key needed)
const EMOJI_API_URL =
  "https://unpkg.com/emoji.json@13.1.0/emoji.json";

function shuffleArray(arr) {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export default function MemoryGame() {
  const [gridSize, setGridSize] = useState(4);
  const [difficulty, setDifficulty] = useState("easy"); // easy, medium, hard
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [score, setScore] = useState(0);
  const timerRef = useRef(null);
  const timeoutRef = useRef(null);
  const [emojiList, setEmojiList] = useState([]);

  // Map difficulty to number of duplicates per emoji
  const difficultyMultiplier = {
    easy: 2,
    medium: 3,
    hard: 4,
  };

  // Fetch emoji list once on mount
  useEffect(() => {
    fetch(EMOJI_API_URL)
      .then((res) => res.json())
      .then((data) => {
        // Filter to only emoji that have a single char (exclude multi-char emojis to keep it simple)
        const simpleEmojis = data
          .map((item) => item.char)
          .filter((e) => e.length === 1);
        setEmojiList(simpleEmojis);
      })
      .catch((err) => {
        console.error("Error fetching emojis:", err);
      });
  }, []);

  // Start a new game with emojis pulled from the internet
  const startNewGame = (size, diff) => {
    if (emojiList.length === 0) return; // wait for emojis to load

    const mult = difficultyMultiplier[diff];

    // total cards on the board
    const totalCards = size * size;

    // Adjust total to be divisible by multiplier (pairs/triples/quadruples)
    const adjustedTotal = totalCards - (totalCards % mult);

    // number of unique emojis needed
    const uniqueNeeded = adjustedTotal / mult;

    // Pick uniqueNeeded random emojis from the emoji list and shuffle them
    const selectedEmojis = shuffleArray(emojiList).slice(0, uniqueNeeded);

    // Duplicate emojis according to difficulty multiplier (pairs, triples, quadruples)
    let doubled = [];
    selectedEmojis.forEach((emoji) => {
      for (let i = 0; i < mult; i++) {
        doubled.push(emoji);
      }
    });

    // Shuffle the full deck again
    const shuffledCards = shuffleArray(doubled);

    setCards(shuffledCards);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setElapsedTime(0);
    setScore(0);
    setStartTime(Date.now());
    setDisabled(false);
  };

  // Restart game when gridSize or difficulty changes, and emojiList loaded
  useEffect(() => {
    if (emojiList.length > 0) {
      startNewGame(gridSize, difficulty);
    }
  }, [gridSize, difficulty, emojiList]);

  // Timer logic
  useEffect(() => {
    if (startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [startTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Flip card logic
  const flipCard = (index) => {
    if (disabled || flipped.includes(index) || matched.includes(index)) return;

    if (flipped.length === difficultyMultiplier[difficulty] - 1) {
      // When flipped count is multiplier - 1, flip this last card and check
      setFlipped((prev) => [...prev, index]);
      setDisabled(true);
      setMoves((prev) => prev + 1);

      timeoutRef.current = setTimeout(() => {
        // Check if all flipped cards match
        const flippedEmojis = [...flipped, index].map((i) => cards[i]);
        const allMatch = flippedEmojis.every((e) => e === flippedEmojis[0]);

        if (allMatch) {
          setMatched((prev) => [...prev, ...flipped, index]);
        }
        setFlipped([]);
        setDisabled(false);
      }, 1000);
    } else {
      setFlipped((prev) => [...prev, index]);
    }
  };

  // End game check + score calculation
  const allMatched = matched.length === cards.length && cards.length > 0;

  useEffect(() => {
    if (allMatched) {
      clearInterval(timerRef.current);
      const ideal = cards.length / difficultyMultiplier[difficulty];
      const efficiency = Math.max(0, 100 - (moves - ideal) * 5);
      setScore(efficiency);
    }
  }, [allMatched, moves, cards, difficulty]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  const resetGame = () => {
    startNewGame(gridSize, difficulty);
  };

  return (
    <div
      style={{
        backgroundColor: "#121212",
        color: "#eeeeee",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "'Segoe UI', sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "#fff" }}>🧠 Memory Matching Game</h1>

      {/* Grid size selector */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontWeight: "bold", marginRight: "0.5rem" }}>
          Grid Size:
        </label>
        <select
          value={gridSize}
          onChange={(e) => setGridSize(parseInt(e.target.value))}
          style={{
            padding: "6px 12px",
            fontSize: "16px",
            backgroundColor: "#222",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: "4px",
          }}
        >
          <option value={4}>4x4</option>
          <option value={5}>5x5</option>
          <option value={6}>6x6</option>
          <option value={7}>7x7</option>
        </select>
      </div>

      {/* Difficulty selector */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontWeight: "bold", marginRight: "0.5rem" }}>
          Difficulty:
        </label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          style={{
            padding: "6px 12px",
            fontSize: "16px",
            backgroundColor: "#222",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: "4px",
          }}
        >
          <option value="easy">Easy (Pairs)</option>
          <option value="medium">Medium (Triples)</option>
          <option value="hard">Hard (Quadruples)</option>
        </select>
      </div>

      <div style={{ marginBottom: "1rem", fontSize: "18px" }}>
        <p>🕒 Time: {formatTime(elapsedTime)} | 🔁 Moves: {moves}</p>
        {allMatched && <p>🏅 Score: {score}/100</p>}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gridSize}, 80px)`,
          gap: "15px",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}
      >
        {cards.map((card, i) => {
          const isFlipped = flipped.includes(i) || matched.includes(i);
          return (
            <button
              key={i}
              onClick={() => flipCard(i)}
              style={{
                width: "80px",
                height: "80px",
                fontSize: "38px",
                backgroundColor: isFlipped ? "#fff" : "#333",
                color: isFlipped ? "#000" : "#222",
                border: "2px solid #555",
                borderRadius: "10px",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              {isFlipped ? card : "❓"}
            </button>
          );
        })}
      </div>

      {allMatched && (
        <div>
          <h2>
            🎉 All matched in {moves} moves and {formatTime(elapsedTime)}!
          </h2>
          <button
            onClick={resetGame}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              cursor: "pointer",
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              marginTop: "10px",
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
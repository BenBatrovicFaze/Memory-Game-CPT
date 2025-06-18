import React, { useState, useEffect, useRef } from "react";

// URL for fetching emoji data (no API key needed)
const EMOJI_API_URL = "https://unpkg.com/emoji.json@13.1.0/emoji.json";

// Utility function to shuffle an array randomly
function shuffleArray(arr) {
  return arr
    .map((value) => ({ value, sort: Math.random() })) // pair each value with random sort key
    .sort((a, b) => a.sort - b.sort)                  // sort by that random key
    .map(({ value }) => value);                        // extract the shuffled values
}

export default function App() {
  // React state hooks to track game variables
  const [gridSize, setGridSize] = useState(4);        // number of cards per row/column (4x4, 5x5 etc)
  const [difficulty, setDifficulty] = useState("easy"); // difficulty level controls matching groups size
  const [cards, setCards] = useState([]);             // array of emojis/cards currently in the game
  const [flipped, setFlipped] = useState([]);         // indexes of cards currently flipped face-up
  const [matched, setMatched] = useState([]);         // indexes of cards already matched and removed
  const [disabled, setDisabled] = useState(false);    // disables clicks during checking matches
  const [moves, setMoves] = useState(0);               // number of moves the player made
  const [startTime, setStartTime] = useState(null);    // timestamp when the game started
  const [elapsedTime, setElapsedTime] = useState(0);   // seconds elapsed since game started
  const [score, setScore] = useState(0);               // final calculated score at game end
  const [emojiList, setEmojiList] = useState([]);      // list of emojis fetched from API

  // useRef hooks to hold interval and timeout IDs so we can clear them properly
  const timerRef = useRef(null);   // interval for updating elapsed time
  const timeoutRef = useRef(null); // timeout for flipping cards back after mismatch

  // Map difficulty string to how many matching cards per group
  const difficultyMultiplier = {
    easy: 2,    // pairs
    medium: 3,  // triples
    hard: 4,    // quadruples
  };

  // On component mount, fetch the list of emojis once
  useEffect(() => {
    fetch(EMOJI_API_URL)
      .then((res) => res.json())
      .then((data) => {
        // Filter emojis to only single-character ones for simplicity
        const simpleEmojis = data.map((item) => item.char).filter((e) => e.length === 1);
        setEmojiList(simpleEmojis);
      })
      .catch((err) => {
        console.error("Error fetching emojis:", err);
      });
  }, []);

  // Function to start or restart the game
  const startNewGame = (size, diff) => {
    if (emojiList.length === 0) return; // Don't start until emojis are loaded

    const mult = difficultyMultiplier[diff];    // get multiplier for current difficulty
    const totalCards = size * size;              // total cards in grid (e.g. 16 for 4x4)
    const adjustedTotal = totalCards - (totalCards % mult); // ensure divisible by mult
    const uniqueNeeded = adjustedTotal / mult;  // number of unique emojis needed

    // Pick random emojis and duplicate each according to difficulty multiplier
    const selectedEmojis = shuffleArray(emojiList).slice(0, uniqueNeeded);
    let deck = [];
    selectedEmojis.forEach((emoji) => {
      for (let i = 0; i < mult; i++) deck.push(emoji);
    });

    // Shuffle the deck and reset all state variables to start fresh
    setCards(shuffleArray(deck));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setElapsedTime(0);
    setScore(0);
    setStartTime(Date.now());
    setDisabled(false);
  };

  // When gridSize, difficulty, or emojiList changes, start a new game
  useEffect(() => {
    if (emojiList.length > 0) {
      startNewGame(gridSize, difficulty);
    }
  }, [gridSize, difficulty, emojiList]);

  // Timer effect to update elapsedTime every second while game is running
  useEffect(() => {
    if (startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    // Cleanup interval when startTime changes or component unmounts
    return () => clearInterval(timerRef.current);
  }, [startTime]);

  // Helper function: formats seconds into MM:SS string
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Handler for when a card is clicked/flipped
  const flipCard = (index) => {
    // Ignore clicks if disabled, or card already flipped/matched
    if (disabled || flipped.includes(index) || matched.includes(index)) return;

    // If this flip will complete a group (pairs/triples/quadruples), check for match
    if (flipped.length === difficultyMultiplier[difficulty] - 1) {
      setFlipped((prev) => [...prev, index]);  // flip the card
      setDisabled(true);                        // disable further clicks temporarily
      setMoves((prev) => prev + 1);            // increment moves count

      // Wait 1 second so user can see the last flipped card before checking match
      timeoutRef.current = setTimeout(() => {
        const flippedEmojis = [...flipped, index].map((i) => cards[i]);
        const allMatch = flippedEmojis.every((e) => e === flippedEmojis[0]);

        if (allMatch) {
          // If all flipped cards match, add their indexes to matched array
          setMatched((prev) => [...prev, ...flipped, index]);
        }
        setFlipped([]);  // reset flipped cards to none
        setDisabled(false); // re-enable clicking
      }, 1000);
    } else {
      // If group not complete yet, just add card to flipped list
      setFlipped((prev) => [...prev, index]);
    }
  };

  // Boolean flag to check if game is completed (all cards matched)
  const allMatched = matched.length === cards.length && cards.length > 0;

  // When game completes, stop timer and calculate score
  useEffect(() => {
    if (allMatched) {
      clearInterval(timerRef.current);
      const ideal = cards.length / difficultyMultiplier[difficulty];
      const efficiency = Math.max(0, 100 - (moves - ideal) * 5); // score out of 100
      setScore(efficiency);
    }
  }, [allMatched, moves, cards, difficulty]);

  // Cleanup timers when component unmounts
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  // Restart current game with existing settings
  const resetGame = () => {
    startNewGame(gridSize, difficulty);
  };

  // JSX to render the game UI
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

      {/* Grid Size Selector */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontWeight: "bold", marginRight: "0.5rem" }}>Grid Size:</label>
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

      {/* Difficulty Selector */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontWeight: "bold", marginRight: "0.5rem" }}>Difficulty:</label>
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

      {/* Stats: elapsed time, moves, and score (if game finished) */}
      <div style={{ marginBottom: "1rem", fontSize: "18px" }}>
        <p>
          🕒 Time: {formatTime(elapsedTime)} | 🔁 Moves: {moves}
        </p>
        {allMatched && <p>🏅 Score: {score}/100</p>}
      </div>

      {/* The grid of cards */}
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

      {/* Game complete message and restart button */}
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
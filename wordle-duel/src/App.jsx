import React, { useEffect, useMemo, useState } from "react";
import "./wordle.css";
import { loadDictionary } from "./dictionary-en";

const ATTEMPTS = 6;

function clampLetters(s) {
  return (s || "").replace(/[^A-Za-z]/g, "").toUpperCase();
}

function computeFeedback(secret, guess) {
  const n = secret.length;
  const res = Array(n).fill("absent");
  const sec = secret.split(""), g = guess.split("");
  const left = {};
  for (let i = 0; i < n; i++) {
    if (g[i] === sec[i]) res[i] = "correct";
    else left[sec[i]] = (left[sec[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (res[i] === "correct") continue;
    const ch = g[i];
    if (left[ch] > 0) { res[i] = "present"; left[ch]--; }
  }
  return res;
}

function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

export default function App() {
  const [playerA, setPlayerA] = useState("Player A");
  const [playerB, setPlayerB] = useState("Player B");
  const [setterIsA, setSetterIsA] = useState(true);
  const setter = setterIsA ? playerA : playerB;
  const guesser = setterIsA ? playerB : playerA;

  const [phase, setPhase] = useState("setup");
  const [wordLen, setWordLen] = useState(5);
  const [secret, setSecret] = useState("");
  const [mask, setMask] = useState(true);
  const [soloMode, setSoloMode] = useState(false);

  const [rows, setRows] = useState([]);
  const [rowIndex, setRowIndex] = useState(0);
  const [colIndex, setColIndex] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(ATTEMPTS);
  const [shakingRow, setShakingRow] = useState(-1);
  const [flipping, setFlipping] = useState({ row: -1, step: "idle" });
  const [result, setResult] = useState(null);
  const [dictionary, setDictionary] = useState(new Set());

  const [keyColors, setKeyColors] = useState({}); // 🆕 Track keyboard letter colors

  useEffect(() => {
    loadDictionary().then(setDictionary);
  }, []);

  const emptyRows = useMemo(() => (
    Array.from({ length: ATTEMPTS }, () => ({
      letters: Array(wordLen).fill(""),
      states:  Array(wordLen).fill(""),
    }))
  ), [wordLen]);

  useEffect(() => { if (phase === "setup") setRows(emptyRows); }, [emptyRows, phase]);

  // keyboard typing
  useEffect(() => {
    if (phase !== "play") return;
    const onKey = async (e) => {
      const key = e.key;
      if (flipping.row !== -1) return;
      if (/^[a-z]$/i.test(key)) {
        if (colIndex >= wordLen) return;
        const ch = key.toUpperCase();
        setRows(p => {
          const c = p.map(r=>({...r,letters:[...r.letters],states:[...r.states]}));
          c[rowIndex].letters[colIndex] = ch;
          return c;
        });
        setColIndex(c => c + 1);
      } else if (key === "Backspace") {
        if (colIndex === 0) return;
        setRows(p=>{
          const c=p.map(r=>({...r,letters:[...r.letters],states:[...r.states]}));
          c[rowIndex].letters[colIndex-1]="";
          return c;
        });
        setColIndex(c=>c-1);
      } else if (key === "Enter") {
        submitRow();
      }
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  }, [phase,rowIndex,colIndex,wordLen,flipping]);

  function startRound() {
    const clean = clampLetters(secret).slice(0, wordLen);
    if (clean.length !== wordLen) return shakeBoard();
    if (!dictionary.has(clean)) return shakeBoard();
    setSecret(clean);
    setSoloMode(false);
    setPhase("play");
  }

  function startSolo() {
    if (dictionary.size === 0) {
      shakeBoard();
      return;
    }
    const allWords = Array.from(dictionary).filter(w => w.length === wordLen);
    const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
    setSecret(randomWord);
    setSoloMode(true);
    setPhase("play");
  }

  function shakeBoard() {
    setShakingRow(rowIndex);
    setTimeout(() => setShakingRow(-1), 400);
  }

  function updateKeyboard(guess, colors) {
    setKeyColors((prev) => {
      const newColors = { ...prev };
      const priority = { correct: 3, present: 2, absent: 1 };
      for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const color = colors[i];
        if (!newColors[letter] || priority[color] > priority[newColors[letter]]) {
          newColors[letter] = color;
        }
      }
      return newColors;
    });
  }

  async function submitRow() {
    const guess = rows[rowIndex].letters.join("");
    if (guess.length !== wordLen || rows[rowIndex].letters.includes("")) {
      shakeBoard();
      return;
    }
    if (!dictionary.has(guess)) {
      shakeBoard();
      return;
    }

    const feedback = computeFeedback(secret, guess);
    for (let i=0;i<wordLen;i++){
      setFlipping({row:rowIndex,step:"flip-in",col:i});
      await sleep(90);
      setRows(p=>{
        const c=p.map(r=>({...r,letters:[...r.letters],states:[...r.states]}));
        c[rowIndex].states[i]=feedback[i];
        return c;
      });
      setFlipping({row:rowIndex,step:"flip-out",col:i});
      await sleep(90);
    }
    setFlipping({row:-1,step:"idle"});

    updateKeyboard(guess, feedback); // 🆕 Update keyboard color states

    if (guess === secret) {
      setResult({ winner: soloMode ? "You" : guesser, loser: setter, reason: soloMode ? "You guessed the word!" : `${guesser} guessed it!` });
      setPhase("result");
      return;
    }
    if (attemptsLeft-1<=0) {
      setResult({ winner: soloMode ? "System" : setter, loser: guesser, reason: `Out of attempts! The word was ${secret}.` });
      setPhase("result");
      return;
    }
    setAttemptsLeft(a=>a-1);
    setRowIndex(r=>r+1);
    setColIndex(0);
  }

  function resetRound(swap=false){
    if(swap) setSetterIsA(s=>!s);
    setPhase("setup");
    setSecret("");
    setMask(true);
    setAttemptsLeft(ATTEMPTS);
    setRows(emptyRows);
    setRowIndex(0);
    setColIndex(0);
    setResult(null);
    setShakingRow(-1);
    setFlipping({row:-1,step:"idle"});
    setKeyColors({}); // 🆕 reset keyboard colors
  }

  return (
    <div className="container" style={{["--cols"]:wordLen}}>
      <div className="header">WORDDLE 💫 </div>

      {phase==="setup" && (
        <div className="panel">
          <div className="row-flex">
            <span>Player A:</span>
            <input className="name" value={playerA} onChange={e=>setPlayerA(e.target.value)} />
            <span>Player B:</span>
            <input className="name" value={playerB} onChange={e=>setPlayerB(e.target.value)} />
          </div>
          <div className="row-flex">
            <span>Setter:</span><b>{setter}</b>
            <button className="btn ghost small" onClick={()=>setSetterIsA(s=>!s)}>Swap Roles</button>
          </div>
          <div className="row-flex length">
            <span>Length:</span>
            {[4,5,6].map(n=>(
              <button key={n} onClick={()=>setWordLen(n)} className={n===wordLen?"active":""}>{n}</button>
            ))}
          </div>
          <div className="row-flex">
            <input
              className="input-secret"
              type={mask?"password":"text"}
              value={secret}
              onChange={e=>setSecret(clampLetters(e.target.value).slice(0,wordLen))}
              placeholder={`Enter ${wordLen}-letter secret`}
            />
            <button className="btn ghost small" onClick={()=>setMask(m=>!m)}>{mask?"Show":"Hide"}</button>
            <button className="btn" onClick={startRound}>Start Duel</button>
            <button className="btn ghost small" onClick={startSolo}>Start Solo</button>
          </div>
          <div className="helper">Dictionary words: {dictionary.size}</div>
        </div>
      )}

      {phase==="play" && (
        <>
          <div className="row-flex" style={{justifyContent:"space-between"}}>
            <div>Guesser: <b>{soloMode ? "You" : guesser}</b></div>
            <div>Attempts left: <b>{attemptsLeft}</b></div>
          </div>
          {soloMode && (
            <div className="helper" style={{marginBottom:"10px"}}>
              🧠 Solo Mode — Random word chosen by system
            </div>
          )}

          <div className="board">
            {rows.map((r,ri)=>(
              <div key={ri} className={"row"+(ri===shakingRow?" shake":"")}>
                {r.letters.map((ch,ci)=>{
                  const classes=["tile"];
                  if(r.states[ci]) classes.push(r.states[ci]);
                  else if(ch) classes.push("filled");
                  if(flipping.row===ri && flipping.col===ci) classes.push(flipping.step);
                  return <div key={ci} className={classes.join(" ")}>{ch}</div>;
                })}
              </div>
            ))}
          </div>

          <div className="helper">Type letters. Press Enter to submit. Backspace to delete.</div>
          <OnScreenKeyboard
            onKey={(k) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k }))}
            keyColors={keyColors}
          />
        </>
      )}

      {phase==="result" && result && (
        <div className="panel" style={{textAlign:"center"}}>
          <h2>{result.winner} wins!</h2>
          <p>{result.reason}</p>
          <p>Secret word: <b>{secret}</b></p>
          <div className="row-flex" style={{justifyContent:"center",marginTop:10}}>
            <button className="btn ghost" onClick={()=>resetRound(false)}>Play Again</button>
            <button className="btn" onClick={()=>resetRound(true)}>Swap Roles</button>
            <button className="btn ghost small" onClick={startSolo}>Play Solo Again</button>
          </div>
        </div>
      )}
      <div className="footer"></div>
    </div>
  );
}

/* ✅ Updated keyboard component with color */
function OnScreenKeyboard({ onKey, keyColors }) {
  const layout = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  return (
    <div className="keyboard">
      {layout.map((row, ri) => (
        <div key={ri} className="key-row">
          {row.split("").map((k) => (
            <button
              key={k}
              className={`key ${keyColors[k] || ""}`}
              onClick={() => onKey(k)}
            >
              {k}
            </button>
          ))}
          {ri === 2 && (
            <>
              <button className="key special" onClick={() => onKey("ENTER")}>ENTER</button>
              <button className="key special" onClick={() => onKey("BACKSPACE")}>⌫</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

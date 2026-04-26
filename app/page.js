'use client';

import { useEffect, useMemo, useState } from 'react';
import { Music2, Sparkles, Play, Download, RefreshCw } from 'lucide-react';

const genres = ['Pop', 'Trap', 'EDM', 'Rock', 'Indie', 'R&B', 'Ambient', 'Cinematic', 'Lo-fi'];
const moods = ['Happy', 'Dark', 'Romantic', 'Energetic', 'Chill', 'Epic', 'Sad', 'Dreamy'];
const steps = ['Queued', 'Submitted', 'Generating', 'Fetching result', 'Ready'];

function makeBars() {
  return Array.from({ length: 64 }, (_, i) => 20 + Math.round(Math.abs(Math.sin(i * 0.72) * 52) + Math.random() * 24));
}

function saveSong(song) {
  const existing = JSON.parse(localStorage.getItem('songforge_songs') || '[]');
  localStorage.setItem('songforge_songs', JSON.stringify([song, ...existing].slice(0, 50)));
}

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function buildTags({ genre, mood, bpm, voiceStyle, language }) {
  return [genre, mood, `${bpm} bpm feel`, voiceStyle, language, 'modern production'].filter(Boolean).join(', ');
}

export default function Home() {
  const [prompt, setPrompt] = useState('dreamy pop song about searching for yourself and future love');
  const [lyrics, setLyrics] = useState('');
  const [genre, setGenre] = useState('Pop');
  const [mood, setMood] = useState('Dreamy');
  const [bpm, setBpm] = useState(110);
  const [duration, setDuration] = useState('2:30');
  const [instrumental, setInstrumental] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState('Auto vocal');
  const [language, setLanguage] = useState('English');
  const [creativity, setCreativity] = useState(0.65);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [taskId, setTaskId] = useState('');
  const [error, setError] = useState('');
  const [track, setTrack] = useState(null);
  const [health, setHealth] = useState(null);
  const [library, setLibrary] = useState([]);
  const [demoMode, setDemoMode] = useState(false);

  const tags = useMemo(() => buildTags({ genre, mood, bpm, voiceStyle, language }), [genre, mood, bpm, voiceStyle, language]);

  useEffect(() => {
    setLibrary(JSON.parse(localStorage.getItem('songforge_songs') || '[]'));
    checkHealth();
  }, []);

  async function checkHealth() {
    try {
      const h = await api('/api/sonauto/health');
      setHealth(h);
    } catch {
      setHealth({ configured: false });
    }
  }

  function demoGenerate() {
    const song = {
      id: crypto.randomUUID(),
      title: `${mood} ${genre} Draft`,
      prompt,
      lyrics,
      genre,
      mood,
      bpm,
      duration,
      tags,
      createdAt: new Date().toISOString(),
      audioUrl: '',
      demo: true,
    };
    setTrack(song);
    saveSong(song);
    setLibrary(JSON.parse(localStorage.getItem('songforge_songs') || '[]'));
  }

  async function generate() {
    setError('');
    setTrack(null);

    if (!prompt.trim() && !lyrics.trim()) {
      setError('Add a prompt or lyrics first.');
      return;
    }

    if (demoMode || health?.configured === false) {
      setRunning(true);
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        await new Promise((r) => setTimeout(r, 700));
      }
      demoGenerate();
      setRunning(false);
      return;
    }

    setRunning(true);
    setCurrentStep(0);

    try {
      setCurrentStep(1);
      const gen = await api('/api/sonauto/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          lyrics,
          tags,
          instrumental,
          prompt_strength: Number(creativity),
          output_format: 'mp3',
        }),
      });

      setTaskId(gen.taskId);
      setCurrentStep(2);

      let status = 'UNKNOWN';
      for (let attempt = 0; attempt < 80; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        const stat = await api(`/api/sonauto/status?taskId=${encodeURIComponent(gen.taskId)}`);
        status = stat.status;
        if (status === 'SUCCESS') break;
        if (status === 'FAILURE') throw new Error('Generation failed at provider.');
      }

      if (status !== 'SUCCESS') throw new Error('Generation timed out. Try again later.');

      setCurrentStep(3);
      const result = await api(`/api/sonauto/result?taskId=${encodeURIComponent(gen.taskId)}`);
      if (!result.audioUrl) throw new Error('No audio URL returned by provider.');

      setCurrentStep(4);
      const song = {
        id: gen.taskId,
        taskId: gen.taskId,
        title: `${mood} ${genre} Song`,
        prompt,
        lyrics,
        genre,
        mood,
        bpm,
        duration,
        tags,
        createdAt: new Date().toISOString(),
        audioUrl: result.audioUrl,
        songPaths: result.songPaths || [],
      };
      setTrack(song);
      saveSong(song);
      setLibrary(JSON.parse(localStorage.getItem('songforge_songs') || '[]'));
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div className="logo"><div className="logoIcon"><Music2 size={22} /></div><div>SongForge<br /><span className="small">v3 Studio</span></div></div>
        <div className="badge">{health?.configured ? 'API ready' : 'Demo mode / key missing'}</div>
      </header>

      <section className="wrap">
        <div className="grid">
          <div className="card">
            <h1>Create studio-ready songs from ideas.</h1>
            <p>Secure Vercel backend proxy. Your API key stays server-side only.</p>

            {health?.configured === false && <div className="error">Server API key is not configured. Add SONAUTO_API_KEY in Vercel Environment Variables to enable real generation.</div>}
            {error && <div className="error">{error}</div>}

            <label>Prompt</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the song..." />

            <label>Lyrics optional</label>
            <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Paste lyrics or leave empty..." />

            <label>Genre</label>
            <div className="chips">{genres.map((g) => <button key={g} className={`chip ${genre === g ? 'active' : ''}`} onClick={() => setGenre(g)}>{g}</button>)}</div>

            <label>Mood</label>
            <div className="chips">{moods.map((m) => <button key={m} className={`chip ${mood === m ? 'active' : ''}`} onClick={() => setMood(m)}>{m}</button>)}</div>

            <div className="row">
              <div><label>BPM creative hint</label><input type="range" min="70" max="170" value={bpm} onChange={(e) => setBpm(e.target.value)} /><div className="small">{bpm} BPM goes into tags, not top-level v3 field.</div></div>
              <div><label>Duration note</label><select value={duration} onChange={(e) => setDuration(e.target.value)}><option>1:30</option><option>2:30</option><option>3:30</option></select></div>
            </div>

            <div className="row">
              <div><label>Voice style</label><select value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}><option>Auto vocal</option><option>Female vocal</option><option>Male vocal</option><option>Soft vocal</option><option>Rap vocal</option></select></div>
              <div><label>Language</label><select value={language} onChange={(e) => setLanguage(e.target.value)}><option>English</option><option>Russian</option><option>Spanish</option><option>French</option></select></div>
            </div>

            <div className="row">
              <div><label>Creativity / prompt strength</label><input type="range" min="0" max="1" step="0.05" value={creativity} onChange={(e) => setCreativity(e.target.value)} /><div className="small">{creativity}</div></div>
              <div><label>Mode</label><button className="secondary" onClick={() => setInstrumental(!instrumental)}>{instrumental ? 'Instrumental' : 'Vocal'}</button> <button className="secondary" onClick={() => setDemoMode(!demoMode)}>{demoMode ? 'Demo ON' : 'Demo OFF'}</button></div>
            </div>

            <label>Generated tags</label>
            <input value={tags} readOnly />

            <button className="primary" onClick={generate} disabled={running}>{running ? 'Generating...' : <><Sparkles size={16} /> Generate Song</>}</button>
          </div>

          <div className="card">
            <h2>Generation</h2>
            {steps.map((s, i) => <div className="status" key={s}><span>{s}</span><span className={`dot ${i <= currentStep ? 'on' : ''}`} /></div>)}
            {taskId && <p className="small">Task ID: {taskId}</p>}
            <button className="secondary" onClick={checkHealth}><RefreshCw size={14} /> Check API</button>
          </div>
        </div>

        {track && <div className="card track">
          <h2>{track.title}</h2>
          <p>{track.prompt}</p>
          <div className="wave">{makeBars().map((h, i) => <div key={i} className="bar" style={{ height: h }} />)}</div>
          {track.audioUrl ? <audio controls src={track.audioUrl} style={{ width: '100%' }} /> : <div className="ok">Demo track created. Add the server key for real audio.</div>}
          <div className="chips"><span className="chip active">{track.genre}</span><span className="chip active">{track.mood}</span><span className="chip">{track.bpm} BPM</span></div>
          {track.audioUrl && <a className="secondary" href={track.audioUrl} target="_blank"><Download size={14} /> Open / Download audio</a>}
        </div>}

        <div className="card">
          <h2>Library</h2>
          <div className="library">
            {library.length === 0 && <p>No songs yet.</p>}
            {library.map((s) => <div className="card" key={s.id}>
              <h3>{s.title}</h3>
              <p className="small">{new Date(s.createdAt).toLocaleString()}</p>
              <p>{s.genre} · {s.mood} · {s.bpm} BPM</p>
              {s.audioUrl ? <audio controls src={s.audioUrl} style={{ width: '100%' }} /> : <button className="secondary"><Play size={14} /> Demo placeholder</button>}
            </div>)}
          </div>
        </div>
      </section>
    </main>
  );
}

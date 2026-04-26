'use client';

import { useEffect, useMemo, useState } from 'react';
import { Music2, Sparkles, Play, Download, RefreshCw, Search, Heart, Trash2, Tag, Grid3X3, ListMusic, Mic2, UploadCloud } from 'lucide-react';

const genres = ['Pop', 'Trap', 'EDM', 'Rock', 'Indie', 'R&B', 'Ambient', 'Cinematic', 'Lo-fi'];
const moods = ['Happy', 'Dark', 'Romantic', 'Energetic', 'Chill', 'Epic', 'Sad', 'Dreamy'];
const styleTags = ['female vocal', 'male vocal', 'rap vocal', 'soft vocal', 'anthem', 'club', 'sad', 'romantic', 'cinematic', 'guitar', 'synth', 'piano', 'bass heavy', 'future pop', 'lo-fi', 'hyperpop', 'my voice'];
const steps = ['Queued', 'Submitted', 'Generating', 'Fetching result', 'Ready'];

function makeBars() {
  return Array.from({ length: 64 }, (_, i) => 20 + Math.round(Math.abs(Math.sin(i * 0.72) * 52) + Math.random() * 24));
}

function readSongs() {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('songforge_songs') || '[]');
}

function saveSong(song) {
  const existing = readSongs();
  localStorage.setItem('songforge_songs', JSON.stringify([song, ...existing].slice(0, 80)));
}

async function api(path, options) {
  const res = await fetch(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function buildTags({ genre, mood, bpm, voiceStyle, language, myVoiceEnabled }) {
  return [genre, mood, `${bpm} bpm feel`, myVoiceEnabled ? 'my private voice, user-owned voice style' : voiceStyle, language, 'modern production'].filter(Boolean).join(', ');
}

function titleFromPrompt(prompt, genre, mood) {
  const words = prompt.split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
  return words ? `${mood} ${genre}: ${words}` : `${mood} ${genre} Song`;
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
  const [activeTag, setActiveTag] = useState('All');
  const [librarySearch, setLibrarySearch] = useState('');
  const [onlyLiked, setOnlyLiked] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [myVoiceEnabled, setMyVoiceEnabled] = useState(false);
  const [voiceName, setVoiceName] = useState('My Voice');
  const [voiceFileName, setVoiceFileName] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('No voice sample uploaded yet.');

  const tags = useMemo(() => buildTags({ genre, mood, bpm, voiceStyle, language, myVoiceEnabled }), [genre, mood, bpm, voiceStyle, language, myVoiceEnabled]);

  useEffect(() => {
    setLibrary(readSongs());
    checkHealth();
    const savedVoice = JSON.parse(localStorage.getItem('songforge_my_voice') || 'null');
    if (savedVoice) {
      setMyVoiceEnabled(Boolean(savedVoice.enabled));
      setVoiceName(savedVoice.name || 'My Voice');
      setVoiceFileName(savedVoice.fileName || 'saved voice sample');
      setVoiceStatus(savedVoice.status || 'Private voice preset ready for tagging.');
    }
  }, []);

  async function checkHealth() {
    try {
      const h = await api('/api/sonauto/health');
      setHealth(h);
    } catch {
      setHealth({ configured: false });
    }
  }

  function refreshLibrary() {
    setLibrary(readSongs());
  }

  function handleVoiceUpload(file) {
    if (!file) return;
    const preset = {
      enabled: true,
      name: voiceName || 'My Voice',
      fileName: file.name,
      status: 'Private voice preset saved locally. Real voice conversion needs a connected voice-conversion provider.',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('songforge_my_voice', JSON.stringify(preset));
    setMyVoiceEnabled(true);
    setVoiceFileName(file.name);
    setVoiceStatus(preset.status);
    setVoiceStyle('My Voice');
  }

  function demoGenerate() {
    const song = {
      id: crypto.randomUUID(),
      title: titleFromPrompt(prompt, genre, mood),
      prompt,
      lyrics,
      genre,
      mood,
      bpm,
      duration,
      tags,
      voicePreset: myVoiceEnabled ? voiceName : voiceStyle,
      createdAt: new Date().toISOString(),
      audioUrl: '',
      liked: false,
      demo: true,
    };
    setTrack(song);
    saveSong(song);
    refreshLibrary();
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
        title: titleFromPrompt(prompt, genre, mood),
        prompt,
        lyrics,
        genre,
        mood,
        bpm,
        duration,
        tags,
        voicePreset: myVoiceEnabled ? voiceName : voiceStyle,
        createdAt: new Date().toISOString(),
        audioUrl: result.audioUrl,
        songPaths: result.songPaths || [],
        liked: false,
      };
      setTrack(song);
      saveSong(song);
      refreshLibrary();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  function toggleLike(id) {
    const updated = readSongs().map((s) => s.id === id ? { ...s, liked: !s.liked } : s);
    localStorage.setItem('songforge_songs', JSON.stringify(updated));
    setLibrary(updated);
    if (track?.id === id) setTrack({ ...track, liked: !track.liked });
  }

  function deleteSong(id) {
    const updated = readSongs().filter((s) => s.id !== id);
    localStorage.setItem('songforge_songs', JSON.stringify(updated));
    setLibrary(updated);
    if (track?.id === id) setTrack(null);
  }

  function useTemplate(tag) {
    setActiveTag(tag);
    if (genres.includes(tag)) setGenre(tag);
    if (moods.includes(tag)) setMood(tag);
    setPrompt(`${tag.toLowerCase()} song with polished vocals, memorable hook, modern production`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const allTags = useMemo(() => {
    const fromSongs = library.flatMap((song) => [song.genre, song.mood, song.voicePreset, ...(song.tags || '').split(',').map((t) => t.trim()).filter(Boolean)]);
    return ['All', 'Liked', ...Array.from(new Set([...genres, ...moods, ...styleTags, ...fromSongs])).filter(Boolean)];
  }, [library]);

  const tagCounts = useMemo(() => {
    const counts = { All: library.length, Liked: library.filter((s) => s.liked).length };
    library.forEach((song) => {
      [song.genre, song.mood, song.voicePreset, ...(song.tags || '').split(',').map((t) => t.trim())].filter(Boolean).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [library]);

  const filteredLibrary = useMemo(() => {
    const q = librarySearch.trim().toLowerCase();
    return library.filter((song) => {
      const haystack = [song.title, song.prompt, song.lyrics, song.genre, song.mood, song.tags, song.voicePreset].join(' ').toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesLiked = !onlyLiked || song.liked;
      const matchesTag = activeTag === 'All' || activeTag === 'Liked' ? true : haystack.includes(activeTag.toLowerCase());
      const matchesActiveLiked = activeTag === 'Liked' ? song.liked : true;
      return matchesSearch && matchesLiked && matchesTag && matchesActiveLiked;
    });
  }, [library, librarySearch, onlyLiked, activeTag]);

  const featuredTags = ['Dreamy', 'Pop', 'Cinematic', 'Trap', 'Romantic', 'Lo-fi', 'female vocal', 'bass heavy'];

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
              <div><label>Voice style</label><select value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value)}><option>Auto vocal</option><option>Female vocal</option><option>Male vocal</option><option>Soft vocal</option><option>Rap vocal</option><option>My Voice</option></select></div>
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

          <div className="card stickyCard">
            <h2>Generation</h2>
            {steps.map((s, i) => <div className="status" key={s}><span>{s}</span><span className={`dot ${i <= currentStep ? 'on' : ''}`} /></div>)}
            {taskId && <p className="small">Task ID: {taskId}</p>}
            <button className="secondary" onClick={checkHealth}><RefreshCw size={14} /> Check API</button>

            <div className="miniExplorer">
              <label>Explore style tags</label>
              <div className="chips">{featuredTags.map((t) => <button key={t} className="chip" onClick={() => useTemplate(t)}><Tag size={13} /> {t}</button>)}</div>
            </div>
          </div>
        </div>

        <section className="card voiceLab">
          <div className="sectionHead">
            <div>
              <h2><Mic2 size={22} /> Sing with My Voice</h2>
              <p>Upload your own clean voice sample, save a private preset, then use it as a vocal direction for new songs.</p>
            </div>
            <div className={`voiceBadge ${myVoiceEnabled ? 'ready' : ''}`}>{myVoiceEnabled ? 'My Voice ON' : 'Not configured'}</div>
          </div>
          <div className="voiceGrid">
            <div>
              <label>Voice preset name</label>
              <input value={voiceName} onChange={(e) => setVoiceName(e.target.value)} placeholder="My Voice" />
              <label>Upload voice sample</label>
              <label className="uploadBox">
                <UploadCloud size={24} />
                <span>{voiceFileName || 'Choose WAV/MP3/M4A, 30-90 sec, no background music'}</span>
                <input type="file" accept="audio/*" onChange={(e) => handleVoiceUpload(e.target.files?.[0])} />
              </label>
              <div className="actionRow">
                <button className="secondary" onClick={() => { setMyVoiceEnabled(!myVoiceEnabled); localStorage.setItem('songforge_my_voice', JSON.stringify({ enabled: !myVoiceEnabled, name: voiceName, fileName: voiceFileName, status: voiceStatus })); }}>{myVoiceEnabled ? 'Disable My Voice' : 'Use My Voice'}</button>
                <button className="secondary" onClick={() => { setVoiceStyle('My Voice'); setMyVoiceEnabled(true); }}>Apply to generator</button>
              </div>
            </div>
            <div className="voiceTips">
              <h3>How to record</h3>
              <p>Record 30-90 seconds in a quiet room. Use headphones. Add speech and a short sung phrase. Russian lyrics are supported in the main generator.</p>
              <div className="ok">{voiceStatus}</div>
              <p className="small">Current build stores the preset locally and passes “my private voice” into tags. To truly convert a generated vocal into your voice, connect a voice-conversion provider API later.</p>
            </div>
          </div>
        </section>

        {track && <div className="card track">
          <h2>{track.title}</h2>
          <p>{track.prompt}</p>
          <div className="wave">{makeBars().map((h, i) => <div key={i} className="bar" style={{ height: h }} />)}</div>
          {track.audioUrl ? <audio controls src={track.audioUrl} style={{ width: '100%' }} /> : <div className="ok">Demo track created. Add the server key for real audio.</div>}
          <div className="chips"><span className="chip active">{track.genre}</span><span className="chip active">{track.mood}</span><span className="chip">{track.bpm} BPM</span>{track.voicePreset && <span className="chip">{track.voicePreset}</span>}</div>
          <div className="actionRow">
            <button className="secondary" onClick={() => toggleLike(track.id)}><Heart size={14} /> {track.liked ? 'Liked' : 'Like'}</button>
            {track.audioUrl && <a className="secondary" href={track.audioUrl} target="_blank"><Download size={14} /> Open / Download audio</a>}
          </div>
        </div>}

        <section className="card tagExplorer">
          <div className="sectionHead">
            <div>
              <h2>Library Tag Explorer</h2>
              <p>Browse generated songs by genre, mood, voice style and production tags.</p>
            </div>
            <div className="viewSwitch">
              <button className={`secondary ${viewMode === 'grid' ? 'selected' : ''}`} onClick={() => setViewMode('grid')}><Grid3X3 size={14} /> Grid</button>
              <button className={`secondary ${viewMode === 'list' ? 'selected' : ''}`} onClick={() => setViewMode('list')}><ListMusic size={14} /> List</button>
            </div>
          </div>

          <div className="explorerLayout">
            <aside className="tagPanel">
              <div className="searchBox"><Search size={16} /><input value={librarySearch} onChange={(e) => setLibrarySearch(e.target.value)} placeholder="Search songs or tags..." /></div>
              <button className={`tagLine ${onlyLiked ? 'active' : ''}`} onClick={() => setOnlyLiked(!onlyLiked)}><Heart size={15} /> Liked only <span>{tagCounts.Liked || 0}</span></button>
              <label>Popular tags</label>
              <div className="tagList">
                {allTags.map((tag) => <button key={tag} className={`tagLine ${activeTag === tag ? 'active' : ''}`} onClick={() => setActiveTag(tag)}><span>{tag}</span><em>{tagCounts[tag] || 0}</em></button>)}
              </div>
            </aside>

            <div className={`songShelf ${viewMode}`}>
              {filteredLibrary.length === 0 && <div className="emptyState"><h3>No songs found</h3><p>Generate a song or choose another tag.</p></div>}
              {filteredLibrary.map((s) => <article className="songCard" key={s.id}>
                <div className="songTop">
                  <div>
                    <h3>{s.title}</h3>
                    <p className="small">{new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <button className={`iconBtn ${s.liked ? 'liked' : ''}`} onClick={() => toggleLike(s.id)}><Heart size={16} /></button>
                </div>
                <p className="songPrompt">{s.prompt}</p>
                <div className="tinyWave">{makeBars().slice(0, 36).map((h, i) => <span key={i} style={{ height: Math.max(10, h / 2) }} />)}</div>
                {s.audioUrl ? <audio controls src={s.audioUrl} style={{ width: '100%' }} /> : <button className="secondary"><Play size={14} /> Demo placeholder</button>}
                <div className="chips compact"><button className="chip active" onClick={() => setActiveTag(s.genre)}>{s.genre}</button><button className="chip active" onClick={() => setActiveTag(s.mood)}>{s.mood}</button><span className="chip">{s.bpm} BPM</span>{s.voicePreset && <button className="chip" onClick={() => setActiveTag(s.voicePreset)}>{s.voicePreset}</button>}</div>
                <div className="cardActions">
                  {s.audioUrl && <a className="secondary" href={s.audioUrl} target="_blank"><Download size={14} /> Download</a>}
                  <button className="secondary danger" onClick={() => deleteSong(s.id)}><Trash2 size={14} /> Delete</button>
                </div>
              </article>)}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

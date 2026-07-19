import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useThree } from '@react-three/fiber'
import { Bounds, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei'
import { ArrowLeft, Check, ChevronRight, MousePointer2, RotateCcw, Search, Undo2, X } from 'lucide-react'
import paletteData from '../palettes/ring_lord_palette_derived.json'
import socialIconsUrl from './assets/images/minima-social-icons.svg'
import './styles.css'

const MODELS = [
  { id: 'two_way_spiral', name: 'Two Way Spiral', file: new URL('../models/two_way_spiral.glb', import.meta.url).href, rings: 16, note: 'A compact, kinetic weave' },
  { id: 'rosetta', name: 'Rosetta', file: new URL('../models/rosetta.glb', import.meta.url).href, rings: 44, note: 'An intricate radial composition' },
]

const COLORS = Object.entries(paletteData).map(([key, value]) => ({
  key,
  hex: `#${value}`,
  name: key.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  finish: key.startsWith('matte_') ? 'Matte' : 'Bright',
}))

function Loader() {
  return <Html center><div className="loader" /></Html>
}

function ModelObject({ file, colors, selected, onSelect, preview = false }) {
  const { scene } = useGLTF(file)
  const prepared = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((item) => {
      if (!item.isMesh) return
      item.material = item.material.clone()
      const isSurface = item.material.name === 'Base Grey'
      if (isSurface) {
        item.material.metalness = 0.55
        item.material.roughness = 0.28
      }
    })
    let ringIndex = 0
    copy.traverse((item) => {
      if (!item.isMesh || item.material.name !== 'Base Grey') return
      const index = ringIndex++
      item.parent.traverse((part) => {
        if (!part.isMesh) return
        part.userData.ringIndex = index
        part.userData.isOutline = part.material.name === 'Black Outline'
      })
    })
    return copy
  }, [scene])

  useEffect(() => {
    prepared.traverse((item) => {
      const index = item.userData.ringIndex
      if (!item.isMesh || index === undefined) return
      item.material.color.set(item.userData.isOutline
        ? (selected.includes(index) ? '#ffb000' : '#000000')
        : (colors[index] || '#717678'))
      if (item.material.emissive) {
        item.material.emissive.set('#000000')
        item.material.emissiveIntensity = 0
      }
    })
  }, [prepared, colors, selected])

  return (
    <primitive
      object={prepared}
      onClick={preview ? undefined : (event) => {
        event.stopPropagation()
        const index = event.object.userData.ringIndex
        if (index !== undefined) onSelect(index, {
          add: event.nativeEvent.shiftKey,
          remove: event.nativeEvent.ctrlKey || event.nativeEvent.metaKey,
        })
      }}
      onPointerOver={preview ? undefined : (event) => {
        if (event.object.userData.ringIndex !== undefined) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={preview ? undefined : () => { document.body.style.cursor = 'default' }}
    />
  )
}

function Scene({ model, colors = [], selected = [], onSelect = () => {}, preview = false }) {
  return (
    <Canvas
      camera={{ position: preview ? [4, 3, 5] : [4.5, 3.2, 5.8], fov: 38 }}
      dpr={preview ? [1, 2] : [1, 2.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[preview ? '#212121' : '#181818']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -4]} intensity={0.8} color="#aebbd4" />
      <Suspense fallback={<Loader />}>
        <Bounds fit clip observe margin={preview ? 1.2 : 1.35}>
          <ModelObject file={model.file} colors={colors} selected={selected} onSelect={onSelect} preview={preview} />
        </Bounds>
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls makeDefault enablePan={!preview} autoRotate={preview} autoRotateSpeed={1.2} minDistance={2} maxDistance={12} />
    </Canvas>
  )
}

function Home({ onOpen }) {
  return (
    <main className="home">
      <header className="site-header">
        <div className="header-wrapper">
          <a className="site-title" href="https://www.mckaymaille.ca">McKay Maille</a>
          <nav className="site-nav">
            <input type="checkbox" id="nav-trigger" className="nav-trigger" />
            <label htmlFor="nav-trigger">
              <span className="menu-icon">
                <svg viewBox="0 0 18 15" width="18" height="15"><path d="M18 1.484c0 .82-.665 1.484-1.484 1.484H1.484C.665 2.969 0 2.304 0 1.484S.665 0 1.484 0h15.032C17.335 0 18 .665 18 1.484zM18 7.516C18 8.335 17.335 9 16.516 9H1.484C.665 9 0 8.335 0 7.516c0-.82.665-1.485 1.484-1.485h15.032c.819 0 1.484.665 1.484 1.485zm0 6C18 14.335 17.335 15 16.516 15H1.484C.665 15 0 14.335 0 13.516c0-.82.665-1.483 1.484-1.483h15.032c.819 0 1.484.663 1.484 1.483z" /></svg>
              </span>
            </label>
            <div className="nav-links">
              {[
                ['About', '/about/'], ['Contact', '/contact/'], ['Gallery', '/gallery/'],
                ['Glossary', '/glossary/'], ['Blogroll', '/blogroll/'],
                ['Posts By Family', '/families'], ['Posts By Tag', '/tags/'],
              ].map(([label, path]) => <a className="page-link" href={`https://www.mckaymaille.ca${path}`} key={label}>{label}</a>)}
            </div>
          </nav>
        </div>
      </header>
      <section className="hero">
        <p className="eyebrow">Interactive colour studio</p>
        <h1>Choose a weave.<br /><em>Make it yours.</em></h1>
        <p className="intro">Explore each ring, compose your colour story, and preview the finished piece from every angle.</p>
      </section>
      <section className="model-section">
        <div className="section-heading"><span>Select a model</span><span>{MODELS.length} designs</span></div>
        <div className="model-grid">
          {MODELS.map((model, index) => (
            <button className="model-card" key={model.id} onClick={() => onOpen(model)}>
              <div className="card-index">0{index + 1}</div>
              <div className="model-preview"><Scene model={model} preview /></div>
              <div className="card-copy">
                <div><h2>{model.name}</h2><p>{model.note}</p></div>
                <span className="open-button"><ChevronRight /></span>
              </div>
              <div className="card-meta"><span>{model.rings} rings</span><span>360° preview</span></div>
            </button>
          ))}
        </div>
      </section>
      <footer className="site-footer">
        <div className="footer-wrapper">
          <h2 className="footer-heading">McKay Maille</h2>
          <div className="footer-col-wrapper">
            <div className="footer-col">
              <ul className="contact-list">
                {[
                  ['github', 'GitHub', 'https://github.com/moaatt2'],
                  ['mastodon', 'Mastodon', 'https://mastodon.social/@mckaymaille'],
                  ['pixelfed', 'Pixelfed', 'https://pixelfed.social/mckaymaille'],
                  ['rss', 'RSS Feed', 'https://www.mckaymaille.ca/feed.xml'],
                  ['email', 'mckaymaille@gmail.com', 'mailto:mckaymaille@gmail.com'],
                  ['code', 'Source Code', 'https://github.com/moaatt2/test-blog'],
                ].map(([icon, label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer" title={label}>
                      <svg className="svg-icon"><use href={`${socialIconsUrl}#${icon}`} /></svg>
                      <span className="username">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer-col footer-description">
              <p>Welcome to my chainmaille showcase and blog. I hope you enjoy what you see and learn a lot here.</p>
              <p><a href="https://pages.github.com/">GH Pages</a> 232 <a href="https://jekyllrb.com/">Jekyll</a> 3.10.0</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

function Palette({ current, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [finish, setFinish] = useState('All')
  const shown = COLORS.filter((c) => (finish === 'All' || c.finish === finish) && c.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <aside className="palette-panel">
      <div className="panel-title"><div><p className="eyebrow">Ring colour</p><h2>Choose a finish</h2></div><button className="icon-button mobile-close" onClick={onClose}><X /></button></div>
      <div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search colours" /></div>
      <div className="tabs">{['All', 'Bright', 'Matte'].map((tab) => <button className={finish === tab ? 'active' : ''} onClick={() => setFinish(tab)} key={tab}>{tab}</button>)}</div>
      <div className="swatches">
        {shown.map((color) => (
          <button key={color.key} className={`swatch ${current === color.hex ? 'selected' : ''}`} onClick={() => onPick(color.hex)} title={color.name}>
            <span style={{ background: color.hex }}>{current === color.hex && <Check size={16} />}</span>
            <small>{color.name.replace(/^(Bright|Matte) /, '')}</small>
          </button>
        ))}
      </div>
      {!shown.length && <p className="empty">No colours match “{query}”.</p>}
    </aside>
  )
}

function Editor({ model, onBack }) {
  const initial = useMemo(() => Array(model.rings).fill('#717678'), [model])
  const [colors, setColors] = useState(initial)
  const [selected, setSelected] = useState([0])
  const [history, setHistory] = useState([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pick = (hex) => {
    setHistory((h) => [...h, colors])
    setColors((old) => old.map((c, i) => selected.includes(i) ? hex : c))
  }
  const undo = () => {
    if (!history.length) return
    setColors(history.at(-1)); setHistory((h) => h.slice(0, -1))
  }
  const reset = () => { setHistory((h) => [...h, colors]); setColors(initial) }
  const selectRing = (index, action = {}) => {
    setSelected((old) => {
      if (action.remove) return old.filter((item) => item !== index)
      if (action.add) return old.includes(index) ? old : [...old, index]
      return [index]
    })
    setPaletteOpen(true)
  }
  const selectedColors = [...new Set(selected.map((index) => colors[index]))]
  const current = selectedColors.length === 1 ? selectedColors[0] : null
  const selectionFill = current || 'conic-gradient(#ffb000, #4085b8, #b5546a, #ffb000)'
  const currentName = !selected.length ? 'No rings selected' : current ? (COLORS.find((c) => c.hex === current)?.name || 'Titanium Grey') : 'Mixed colours'
  return (
    <main className="editor">
      <header className="editor-header">
        <button className="back" onClick={onBack}><ArrowLeft size={18} /> All models</button>
        <div className="editor-title"><span>{model.name}</span><small>{model.rings} rings</small></div>
        <div className="header-actions"><button onClick={undo} disabled={!history.length}><Undo2 size={17} /> Undo</button><button onClick={reset}><RotateCcw size={17} /> Reset</button></div>
      </header>
      <div className="workspace">
        <section className="viewport">
          <Scene model={model} colors={colors} selected={selected} onSelect={selectRing} />
          <div className="tip"><MousePointer2 size={15} /> Click to select · Shift-click to add · Ctrl-click to remove · Drag to rotate</div>
          <div className="ring-chip"><span style={{ background: selectionFill }} /><div><small>Selected</small><strong>{selected.length === 1 ? `Ring ${selected[0] + 1}` : `${selected.length} rings`}</strong></div></div>
        </section>
        <div className={`palette-wrap ${paletteOpen ? 'open' : ''}`}>
          <Palette current={current} onPick={pick} onClose={() => setPaletteOpen(false)} />
        </div>
      </div>
      <button className="mobile-picker" onClick={() => setPaletteOpen(true)}><span style={{ background: selectionFill }} /><div><small>{selected.length === 1 ? `Ring ${selected[0] + 1}` : `${selected.length} rings`}</small><strong>{currentName}</strong></div><ChevronRight /></button>
    </main>
  )
}

function App() {
  const [model, setModel] = useState(null)
  useEffect(() => {
    const onPop = () => setModel(MODELS.find((m) => location.pathname.endsWith(m.id)) || null)
    onPop(); addEventListener('popstate', onPop); return () => removeEventListener('popstate', onPop)
  }, [])
  const open = (next) => { history.pushState({}, '', `/model/${next.id}`); setModel(next) }
  const back = () => { history.pushState({}, '', '/'); setModel(null) }
  return model ? <Editor model={model} onBack={back} /> : <Home onOpen={open} />
}

createRoot(document.getElementById('root')).render(<App />)

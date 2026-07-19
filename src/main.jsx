import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useThree } from '@react-three/fiber'
import { Bounds, ContactShadows, Environment, Html, OrbitControls, useGLTF } from '@react-three/drei'
import { ArrowLeft, Check, ChevronRight, MousePointer2, RotateCcw, Search, Undo2, X } from 'lucide-react'
import paletteData from '../palettes/ring_lord_palette_derived.json'
import logoUrl from './assets/images/logo.png'
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
    let ringIndex = 0
    copy.traverse((item) => {
      if (!item.isMesh) return
      item.material = item.material.clone()
      const isSurface = item.material.name === 'Base Grey'
      if (isSurface) {
        item.userData.ringIndex = ringIndex++
        item.material.metalness = 0.55
        item.material.roughness = 0.28
      }
    })
    return copy
  }, [scene])

  useEffect(() => {
    prepared.traverse((item) => {
      const index = item.userData.ringIndex
      if (!item.isMesh || index === undefined) return
      item.material.color.set(colors[index] || '#717678')
      if (item.material.emissive) {
        item.material.emissive.set(index === selected ? '#ffffff' : '#000000')
        item.material.emissiveIntensity = index === selected ? 0.12 : 0
      }
    })
  }, [prepared, colors, selected])

  return (
    <primitive
      object={prepared}
      onClick={preview ? undefined : (event) => {
        event.stopPropagation()
        const index = event.object.userData.ringIndex
        if (index !== undefined) onSelect(index)
      }}
      onPointerOver={preview ? undefined : (event) => {
        if (event.object.userData.ringIndex !== undefined) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={preview ? undefined : () => { document.body.style.cursor = 'default' }}
    />
  )
}

function Scene({ model, colors = [], selected = -1, onSelect = () => {}, preview = false }) {
  return (
    <Canvas camera={{ position: preview ? [4, 3, 5] : [4.5, 3.2, 5.8], fov: 38 }} dpr={[1, 1.8]} gl={{ antialias: true }}>
      <color attach="background" args={[preview ? '#212121' : '#181818']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -4]} intensity={0.8} color="#aebbd4" />
      <Suspense fallback={<Loader />}>
        <Bounds fit clip observe margin={preview ? 1.2 : 1.35}>
          <ModelObject file={model.file} colors={colors} selected={selected} onSelect={onSelect} preview={preview} />
        </Bounds>
        {!preview && <ContactShadows opacity={0.28} blur={2.5} scale={12} position={[0, -2, 0]} />}
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls makeDefault enablePan={!preview} autoRotate={preview} autoRotateSpeed={1.2} minDistance={2} maxDistance={12} />
    </Canvas>
  )
}

function Home({ onOpen }) {
  return (
    <main className="home">
      <header className="home-header">
        <div className="brand"><img className="brand-mark" src={logoUrl} alt="McKay Maille" /><span>McKay Maille <b>Designer</b></span></div>
        <a className="header-note" href="https://www.mckaymaille.ca">Back to mckaymaille.ca</a>
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
  const [selected, setSelected] = useState(0)
  const [history, setHistory] = useState([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const pick = (hex) => {
    setHistory((h) => [...h, colors])
    setColors((old) => old.map((c, i) => i === selected ? hex : c))
  }
  const undo = () => {
    if (!history.length) return
    setColors(history.at(-1)); setHistory((h) => h.slice(0, -1))
  }
  const reset = () => { setHistory((h) => [...h, colors]); setColors(initial) }
  const current = colors[selected]
  const currentName = COLORS.find((c) => c.hex === current)?.name || 'Titanium Grey'
  return (
    <main className="editor">
      <header className="editor-header">
        <button className="back" onClick={onBack}><ArrowLeft size={18} /> All models</button>
        <div className="editor-title"><span>{model.name}</span><small>{model.rings} rings</small></div>
        <div className="header-actions"><button onClick={undo} disabled={!history.length}><Undo2 size={17} /> Undo</button><button onClick={reset}><RotateCcw size={17} /> Reset</button></div>
      </header>
      <div className="workspace">
        <section className="viewport">
          <Scene model={model} colors={colors} selected={selected} onSelect={(index) => { setSelected(index); setPaletteOpen(true) }} />
          <div className="tip"><MousePointer2 size={15} /> Click a ring to colour it · Drag to rotate</div>
          <div className="ring-chip"><span style={{ background: current }} /><div><small>Selected</small><strong>Ring {selected + 1}</strong></div></div>
        </section>
        <div className={`palette-wrap ${paletteOpen ? 'open' : ''}`}>
          <Palette current={current} onPick={pick} onClose={() => setPaletteOpen(false)} />
        </div>
      </div>
      <button className="mobile-picker" onClick={() => setPaletteOpen(true)}><span style={{ background: current }} /><div><small>Ring {selected + 1}</small><strong>{currentName}</strong></div><ChevronRight /></button>
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

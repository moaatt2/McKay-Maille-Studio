import React, { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Html, OrbitControls, useGLTF } from '@react-three/drei'
import { Box3, MathUtils, Vector3 } from 'three'
import { ArrowLeft, Check, ChevronRight, Copy, Download, Mail, MousePointer2, Plus, RotateCcw, Search, Share2, Trash2, Undo2, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import paletteData from '../palettes/ring_lord_palette_derived.json'
import modelCatalog from '../models/models.json'
import socialIconsUrl from './assets/images/minima-social-icons.svg'
import './styles.css'

const modelFiles = import.meta.glob('../models/*.glb', { eager: true, query: '?url', import: 'default' })
const thumbnailFiles = import.meta.glob('./assets/thumbnails/*.webp', { eager: true, query: '?url', import: 'default' })
const groupFiles = import.meta.glob('../models/*.groups.json', { eager: true, import: 'default' })
const MODELS = modelCatalog.map((model) => ({
  ...model,
  file: modelFiles[`../models/${model.file}`],
  thumbnail: thumbnailFiles[`./assets/thumbnails/${model.thumbnail}`],
  groups: groupFiles[`../models/${model.id}.groups.json`]?.groups || [],
}))

const COLORS = Object.entries(paletteData).map(([key, value]) => ({
  key,
  hex: `#${value}`,
  name: key.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  finish: key.startsWith('matte_') ? 'Matte' : 'Bright',
}))

function encodeDesign(colors) {
  const unique = []
  const pattern = colors.map((color) => {
    const hex = color.replace('#', '').toUpperCase()
    let index = unique.indexOf(hex)
    if (index === -1) { unique.push(hex); index = unique.length - 1 }
    return index.toString(36)
  }).join('')
  return `1_${unique.join('-')}_${pattern}`
}

function decodeDesign(value, ringCount) {
  if (!value) return null
  const match = value.match(/^1_([0-9a-f-]+)_([0-9a-z]+)$/i)
  if (!match || match[2].length !== ringCount) return null
  const colors = match[1].split('-')
  if (!colors.length || colors.some((color) => !/^[0-9a-f]{6}$/i.test(color))) return null
  const design = [...match[2]].map((character) => colors[parseInt(character, 36)])
  if (design.some((color) => !color)) return null
  return design.map((color) => `#${color.toUpperCase()}`)
}

function Loader() {
  return <Html center><div className="loader" /></Html>
}

function ModelObject({ file, colors, selected, onSelect, controls, preview = false, onFramed }) {
  const { scene } = useGLTF(file)
  const { camera, size } = useThree()
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

  useLayoutEffect(() => {
    if (!controls || !size.width || !size.height) return
    const sphere = new Box3().setFromObject(prepared).getBoundingSphere({ center: new Vector3(), radius: 0 })
    const verticalFov = MathUtils.degToRad(camera.fov)
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
    const limitingFov = Math.min(verticalFov, horizontalFov)
    const distance = (sphere.radius / Math.sin(limitingFov / 2)) * (preview ? 1.45 : 1.5)
    const direction = new Vector3(...(preview ? [4, 3, 5] : [4.5, 3.2, 5.8])).normalize()

    camera.position.copy(sphere.center).add(direction.multiplyScalar(distance))
    camera.near = Math.max(0.01, distance - sphere.radius * 3)
    camera.far = distance + sphere.radius * 8
    camera.zoom = 1
    camera.updateProjectionMatrix()
    controls.target.copy(sphere.center)
    controls.minDistance = sphere.radius * 1.25
    controls.maxDistance = sphere.radius * 12
    controls.update()
    onFramed?.()
  }, [prepared, camera, controls, preview, size.width, size.height, onFramed])

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

function Scene({ model, colors = [], selected = [], onSelect = () => {}, preview = false, thumbnail = false, onFramed }) {
  const [controls, setControls] = useState(null)
  return (
    <Canvas
      camera={{ position: preview ? [4, 3, 5] : [4.5, 3.2, 5.8], fov: 38 }}
      dpr={preview ? [1, 2] : [1, 2.5]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[preview ? '#212121' : '#181818']} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#d7e3ff', '#28231f', 1.1]} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} />
      <directionalLight position={[-4, 2, -4]} intensity={0.8} color="#aebbd4" />
      <Suspense fallback={<Loader />}>
        <ModelObject file={model.file} colors={colors} selected={selected} onSelect={onSelect} controls={controls} preview={preview} onFramed={onFramed} />
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls ref={setControls} makeDefault enablePan={false} enableZoom={!preview} autoRotate={preview && !thumbnail} autoRotateSpeed={1.2} />
    </Canvas>
  )
}

function ModelCard({ model, index, onOpen }) {
  return (
    <article className="model-card">
      <div className="card-index">{String(index + 1).padStart(2, '0')}</div>
      <button className="model-preview" type="button" onClick={() => onOpen(model)} aria-label={`Design ${model.name}`}>
        {model.thumbnail
          ? <img src={model.thumbnail} alt={`${model.name} weave`} />
          : <span className="thumbnail-missing">Thumbnail unavailable</span>}
      </button>
      <button className="card-copy" type="button" onClick={() => onOpen(model)}>
        <div><h2>{model.name}</h2><p>{model.subtitle}</p></div>
        <span className="open-button"><ChevronRight /></span>
      </button>
      <div className="card-meta">
        <span>{model.rings} rings</span>
        {model.postUrl && <a href={model.postUrl}>View weave post ↗</a>}
      </div>
    </article>
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
          {MODELS.map((model, index) => <ModelCard model={model} index={index} onOpen={onOpen} key={model.id} />)}
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

function Palette({ current, onPick, onClose, groups = [], onSelectGroup }) {
  const [query, setQuery] = useState('')
  const [finish, setFinish] = useState('All')
  const shown = COLORS.filter((c) => (finish === 'All' || c.finish === finish) && c.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <aside className="palette-panel">
      <div className="panel-title"><div><p className="eyebrow">Ring colour</p><h2>Choose a finish</h2></div><button className="icon-button mobile-close" onClick={onClose}><X /></button></div>
      {groups.length > 0 && <div className="related-groups">
        <small>Ring Groups</small>
        <div>{groups.map((group) => <button type="button" key={group.id} onClick={() => onSelectGroup(group.rings)}>{group.name}</button>)}</div>
      </div>}
      <div className="search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search colours" /></div>
      <div className="tabs">{['All', 'Bright', 'Matte'].map((tab) => <button className={finish === tab ? 'active' : ''} onClick={() => setFinish(tab)} key={tab}>{tab}</button>)}</div>
      <div className="swatches">
        {shown.map((color) => (
          <button key={color.key} className={`swatch ${current === color.hex ? 'selected' : ''}`} onClick={() => onPick(color.hex)} title={color.name}>
            <span style={{ background: color.hex }}>{current === color.hex && <Check size={16} />}</span>
            <small className="swatch-name">{color.name.replace(/^(Bright|Matte) /, '')}</small>
            {finish === 'All' && <small className={`swatch-finish ${color.finish.toLowerCase()}`}>{color.finish}</small>}
          </button>
        ))}
      </div>
      {!shown.length && <p className="empty">No colours match “{query}”.</p>}
    </aside>
  )
}

function ShareDialog({ model, colors, onClose }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = useMemo(() => {
    const url = new URL(`/model/${model.id}`, location.origin)
    url.searchParams.set('design', encodeDesign(colors))
    return url.toString()
  }, [model.id, colors])
  const shareText = `My ${model.name} design from McKay Maille`

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  const nativeShare = async () => {
    try { await navigator.share({ title: `${model.name} design`, text: shareText, url: shareUrl }) } catch {}
  }
  return (
    <div className="share-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="share-heading">
          <div><p className="eyebrow">Finished design</p><h2 id="share-title">Share your {model.name}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close share dialog"><X /></button>
        </div>
        <p className="share-intro">Anyone with this link can open your exact ring colours. The colors are stored in the link itself.</p>
        <div className="share-content">
          <div className="qr-panel">
            <div className="qr-code"><QRCodeSVG value={shareUrl} size={190} level="M" marginSize={2} bgColor="#ffffff" fgColor="#181818" /></div>
            <strong>Scan to open design</strong>
            <small>Point a phone camera at this code.</small>
          </div>
          <div className="share-options">
            <label htmlFor="share-link">Design link</label>
            <div className="share-link"><input id="share-link" value={shareUrl} readOnly /><button type="button" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}</button></div>
            {'share' in navigator && <button className="native-share" type="button" onClick={nativeShare}><Share2 size={17} /> Share from this device</button>}
            <span className="share-label">Send with</span>
            <div className="social-actions">
              <button type="button" onClick={() => { location.href = `mailto:?subject=${encodeURIComponent(`${model.name} design`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}` }}><Mail size={18} /> Email</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function Editor({ model, onBack }) {
  const blank = useMemo(() => Array(model.rings).fill('#717678'), [model])
  const initial = useMemo(() => decodeDesign(new URLSearchParams(location.search).get('design'), model.rings) || blank, [model, blank])
  const [colors, setColors] = useState(initial)
  const [selected, setSelected] = useState([0])
  const [history, setHistory] = useState([])
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const pick = (hex) => {
    setHistory((h) => [...h, colors])
    setColors((old) => old.map((c, i) => selected.includes(i) ? hex : c))
  }
  const undo = () => {
    if (!history.length) return
    setColors(history.at(-1)); setHistory((h) => h.slice(0, -1))
  }
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const isEditingText = target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey && !isEditingText && history.length) {
        event.preventDefault()
        setColors(history.at(-1))
        setHistory((old) => old.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [history])
  const reset = () => { setHistory((h) => [...h, colors]); setColors(blank) }
  const selectRing = (index, action = {}) => {
    setSelected((old) => {
      if (action.remove) return old.filter((item) => item !== index)
      if (action.add) return old.includes(index) ? old : [...old, index]
      return [index]
    })
    setPaletteOpen(true)
  }
  const selectGroup = (rings, openPalette = true) => {
    setSelected([...rings])
    setPaletteOpen(openPalette)
  }
  const activeGroup = model.groups.find((group) => group.rings.length === selected.length && group.rings.every((ring) => selected.includes(ring)))
  const selectedColors = [...new Set(selected.map((index) => colors[index]))]
  const current = selectedColors.length === 1 ? selectedColors[0] : null
  const selectionFill = current || 'conic-gradient(#ffb000, #4085b8, #b5546a, #ffb000)'
  const currentName = !selected.length ? 'No rings selected' : current ? (COLORS.find((c) => c.hex === current)?.name || 'Titanium Grey') : 'Mixed colours'
  return (
    <main className="editor">
      <header className="editor-header">
        <button className="back" onClick={onBack}><ArrowLeft size={18} /> All models</button>
        <div className="editor-title"><span>{model.name}</span><small>{model.rings} rings</small></div>
        <div className="header-actions"><button onClick={undo} disabled={!history.length}><Undo2 size={17} /> Undo</button><button className="reset-button" onClick={reset}><RotateCcw size={17} /> Reset</button><button className="share-button" onClick={() => setShareOpen(true)}><Share2 size={17} /> Share</button></div>
      </header>
      <div className="workspace">
        <section className="viewport">
          <Scene model={model} colors={colors} selected={selected} onSelect={selectRing} />
          {model.groups.length > 0 && <div className="model-groups">
            <small>Ring Groups</small>
            <div>{model.groups.map((group) => <button className={activeGroup?.id === group.id ? 'active' : ''} type="button" key={group.id} onClick={() => selectGroup(group.rings, false)}><span>{group.name}</span><em>{group.rings.length}</em></button>)}</div>
          </div>}
          <div className="tip">
            <MousePointer2 size={15} />
            <span className="desktop-tip">Click to select · Shift-click to add · Ctrl-click to remove · Drag to rotate</span>
            <span className="mobile-tip">Tap a ring to select · Drag to rotate · Pinch to zoom</span>
          </div>
        </section>
        <div className={`palette-wrap ${paletteOpen ? 'open' : ''}`}>
          <Palette current={current} onPick={pick} onClose={() => setPaletteOpen(false)} groups={model.groups} onSelectGroup={selectGroup} />
        </div>
      </div>
      <button className="mobile-picker" onClick={() => setPaletteOpen(true)}><span style={{ background: selectionFill }} /><div><small>{selected.length === 1 ? `Ring ${selected[0] + 1}` : `${selected.length} rings`}</small><strong>{currentName}</strong></div><ChevronRight /></button>
      {shareOpen && <ShareDialog model={model} colors={colors} onClose={() => setShareOpen(false)} />}
    </main>
  )
}

function GroupEditor({ model }) {
  const [groups, setGroups] = useState(model.groups)
  const [selected, setSelected] = useState([])
  const [newName, setNewName] = useState('')
  const colors = useMemo(() => Array(model.rings).fill('#717678'), [model])

  const selectRing = (index, action = {}) => {
    setSelected((old) => {
      if (action.remove) return old.filter((item) => item !== index)
      if (action.add) return old.includes(index) ? old : [...old, index]
      return [index]
    })
  }
  const createGroup = (event) => {
    event.preventDefault()
    const name = newName.trim()
    if (!name || !selected.length) return
    const baseId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'group'
    let id = baseId
    let suffix = 2
    while (groups.some((group) => group.id === id)) id = `${baseId}-${suffix++}`
    setGroups((old) => [...old, { id, name, rings: [...selected].sort((a, b) => a - b) }])
    setNewName('')
  }
  const updateGroup = (id, changes) => setGroups((old) => old.map((group) => group.id === id ? { ...group, ...changes } : group))
  const download = () => {
    const payload = JSON.stringify({ model: model.id, groups }, null, 2)
    const url = URL.createObjectURL(new Blob([`${payload}\n`], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${model.id}.groups.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="group-editor">
      <header className="group-editor-header">
        <a href="/"><ArrowLeft size={18} /> Homepage</a>
        <div><strong>{model.name}</strong><small>Group authoring · development only</small></div>
        <button type="button" onClick={download}><Download size={16} /> Download JSON</button>
      </header>
      <div className="group-editor-workspace">
        <section className="group-editor-viewport">
          <Scene model={model} colors={colors} selected={selected} onSelect={selectRing} />
          <div className="tip"><MousePointer2 size={15} /> Click to select · Shift-click to add · Ctrl-click to remove</div>
        </section>
        <aside className="group-manager">
          <p className="eyebrow">Selection</p>
          <h1>{selected.length} {selected.length === 1 ? 'ring' : 'rings'} selected</h1>
          <p className="group-help">Select rings in the model, then create a group or update an existing one.</p>
          <form className="new-group" onSubmit={createGroup}>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="New group name" />
            <button disabled={!newName.trim() || !selected.length}><Plus size={16} /> Add</button>
          </form>
          <div className="group-list">
            {groups.map((group) => (
              <div className="group-row" key={group.id}>
                <input value={group.name} onChange={(event) => updateGroup(group.id, { name: event.target.value })} aria-label="Group name" />
                <small>{group.rings.length} rings · {group.id}</small>
                <div>
                  <button type="button" onClick={() => setSelected(group.rings)}>Select</button>
                  <button type="button" disabled={!selected.length} onClick={() => updateGroup(group.id, { rings: [...selected].sort((a, b) => a - b) })}>Update</button>
                  <button className="delete-group" type="button" onClick={() => setGroups((old) => old.filter((item) => item.id !== group.id))} title="Delete group"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
            {!groups.length && <p className="no-groups">No groups yet.</p>}
          </div>
          <p className="save-note">Download and replace <code>models/{model.id}.groups.json</code> when finished.</p>
        </aside>
      </div>
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
  return model ? <Editor key={model.id} model={model} onBack={back} /> : <Home onOpen={open} />
}

function ThumbnailPage({ model }) {
  const markReady = () => setTimeout(() => { document.documentElement.dataset.thumbnailReady = 'true' }, 700)
  return <div className="thumbnail-capture"><Scene model={model} thumbnail onFramed={markReady} /></div>
}

const thumbnailId = new URLSearchParams(location.search).get('thumbnail')
const thumbnailModel = MODELS.find((model) => model.id === thumbnailId)
const groupEditorMatch = location.pathname.match(/^\/group-editor\/([^/]+)\/?$/)
if (groupEditorMatch && !import.meta.env.DEV) history.replaceState({}, '', '/')
const groupEditorModel = import.meta.env.DEV && groupEditorMatch ? MODELS.find((model) => model.id === groupEditorMatch[1]) : null
createRoot(document.getElementById('root')).render(thumbnailModel ? <ThumbnailPage model={thumbnailModel} /> : groupEditorModel ? <GroupEditor model={groupEditorModel} /> : <App />)

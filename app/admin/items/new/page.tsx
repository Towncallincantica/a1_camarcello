'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ADVENTURE_ID } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
type UniquenessScope = 'none' | 'per_player' | 'per_episode' | 'per_adventure' | 'global'
type EffectType = 'give_xp' | 'give_item' | 'give_status_effect'

interface EffectEntry {
  id: string
  type: EffectType
  payload: Record<string, unknown>
}

interface WizardData {
  // Step 1 — Info
  name: string
  description: string
  category: string
  rarity: Rarity
  tags: string
  // Step 2 — Scope
  episode_id: string
  // Step 3 — Proprietà
  is_stackable: boolean
  is_consumable: boolean
  is_transferable: boolean
  max_stack: string
  weight: string
  claim_code: string
  claim_limit: string
  claim_limit_per_player: string
  uniqueness_scope: UniquenessScope
  // Step 4 — Effetti (strutturati, non stringa)
  on_hold: EffectEntry[]
  on_use_consumes: boolean
  on_use: EffectEntry[]
  // Step 5 — Immagine
  icon_url: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY: WizardData = {
  name: '', description: '', category: '', rarity: 'common', tags: '',
  episode_id: '',
  is_stackable: true, is_consumable: false, is_transferable: true,
  max_stack: '99', weight: '', claim_code: '', claim_limit: '',
  claim_limit_per_player: '1', uniqueness_scope: 'none',
  on_hold: [], on_use_consumes: false, on_use: [],
  icon_url: '',
}

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bg: string }> = {
  common:    { label: 'Comune',       color: 'rgba(255,255,255,0.5)',  bg: 'rgba(255,255,255,0.05)' },
  uncommon:  { label: 'Non comune',   color: '#64d278',               bg: 'rgba(100,210,120,0.08)' },
  rare:      { label: 'Raro',         color: '#5b9bd5',               bg: 'rgba(91,155,213,0.08)'  },
  epic:      { label: 'Epico',        color: '#b57bee',               bg: 'rgba(181,123,238,0.08)' },
  legendary: { label: 'Leggendario',  color: '#feeaa5',               bg: 'rgba(254,234,165,0.08)' },
}

const UNIQUENESS_OPTIONS: { value: UniquenessScope; label: string; desc: string }[] = [
  { value: 'none',          label: 'Nessuna',       desc: 'Nessun limite unicità' },
  { value: 'per_player',    label: 'Per giocatore', desc: 'Un giocatore può ottenerlo una volta' },
  { value: 'per_episode',   label: 'Per episodio',  desc: 'Una volta per episodio' },
  { value: 'per_adventure', label: 'Per avventura', desc: "Una volta per tutta l'avventura" },
  { value: 'global',        label: 'Globale',       desc: 'Una sola copia in tutto il gioco' },
]

const EFFECT_TYPES: { value: EffectType; label: string; desc: string }[] = [
  { value: 'give_xp',           label: 'Dai XP',           desc: 'Aggiunge punti esperienza al giocatore' },
  { value: 'give_item',         label: 'Dai oggetto',      desc: 'Aggiunge un oggetto all\'inventario' },
  { value: 'give_status_effect',label: 'Stato',            desc: 'Applica un effetto di stato al giocatore' },
]

const STEPS = [
  { n: 1, label: 'Info' },
  { n: 2, label: 'Scope' },
  { n: 3, label: 'Proprietà' },
  { n: 4, label: 'Effetti' },
  { n: 5, label: 'Immagine' },
]

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  btn: (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
    padding: '0.45rem 1.1rem',
    borderRadius: '6px',
    border: variant === 'primary' ? 'none'
          : variant === 'danger'  ? '1px solid rgba(255,80,80,0.4)'
          : '1px solid rgba(255,255,255,0.12)',
    background: variant === 'primary' ? '#e8af48'
              : variant === 'danger'  ? 'rgba(255,80,80,0.08)'
              : 'rgba(255,255,255,0.04)',
    color: variant === 'primary' ? '#090807'
         : variant === 'danger'  ? '#ff6060'
         : '#e8e4dc',
    fontFamily: 'inherit', fontSize: '0.83rem',
    fontWeight: variant === 'primary' ? 600 : 400,
    cursor: 'pointer', letterSpacing: '0.03em',
  }),
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    color: '#e8e4dc',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  label: {
    display: 'block', fontSize: '0.72rem',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '0.3rem', letterSpacing: '0.06em',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '0.4rem', marginBottom: '0.875rem', marginTop: '1.5rem',
  } as React.CSSProperties,
  card: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '8px', padding: '1rem',
  } as React.CSSProperties,
}

// ─── Effect payload editors ───────────────────────────────────────────────────

function EffectPayloadEditor({
  effect, onChange,
}: { effect: EffectEntry; onChange: (payload: Record<string, unknown>) => void }) {
  const p = effect.payload

  if (effect.type === 'give_xp') {
    return (
      <div>
        <label style={s.label}>Quantità XP</label>
        <input
          type="number" min={1}
          value={(p.amount as number) ?? ''}
          onChange={e => onChange({ amount: parseInt(e.target.value) || 0 })}
          style={{ ...s.input, maxWidth: '140px' }}
          placeholder="50"
        />
      </div>
    )
  }

  if (effect.type === 'give_item') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '0.6rem' }}>
        <div>
          <label style={s.label}>Item ID</label>
          <input
            type="text"
            value={(p.item_id as string) ?? ''}
            onChange={e => onChange({ ...p, item_id: e.target.value })}
            style={{ ...s.input, fontFamily: 'Space Mono, monospace', fontSize: '0.8rem' }}
            placeholder="uuid dell'oggetto"
          />
        </div>
        <div>
          <label style={s.label}>Quantità</label>
          <input
            type="number" min={1}
            value={(p.quantity as number) ?? ''}
            onChange={e => onChange({ ...p, quantity: parseInt(e.target.value) || 1 })}
            style={s.input}
            placeholder="1"
          />
        </div>
      </div>
    )
  }

  if (effect.type === 'give_status_effect') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.6rem' }}>
        <div>
          <label style={s.label}>Tipo stato</label>
          <input
            type="text"
            value={(p.effect_type as string) ?? ''}
            onChange={e => onChange({ ...p, effect_type: e.target.value })}
            style={s.input}
            placeholder="es. can_claim, is_visible…"
          />
        </div>
        <div>
          <label style={s.label}>Valore</label>
          <select
            value={String(p.value ?? 'true')}
            onChange={e => onChange({ ...p, value: e.target.value === 'true' })}
            style={s.input}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      </div>
    )
  }

  return null
}

// ─── Effect List editor ───────────────────────────────────────────────────────

function EffectList({
  title, effects, onChange,
}: { title: string; effects: EffectEntry[]; onChange: (effects: EffectEntry[]) => void }) {
  function addEffect() {
    const newEffect: EffectEntry = {
      id: Math.random().toString(36).slice(2),
      type: 'give_xp',
      payload: { amount: 0 },
    }
    onChange([...effects, newEffect])
  }

  function removeEffect(id: string) {
    onChange(effects.filter(e => e.id !== id))
  }

  function updateType(id: string, type: EffectType) {
    const defaultPayloads: Record<EffectType, Record<string, unknown>> = {
      give_xp: { amount: 0 },
      give_item: { item_id: '', quantity: 1 },
      give_status_effect: { effect_type: '', value: true },
    }
    onChange(effects.map(e => e.id === id ? { ...e, type, payload: defaultPayloads[type] } : e))
  }

  function updatePayload(id: string, payload: Record<string, unknown>) {
    onChange(effects.map(e => e.id === id ? { ...e, payload } : e))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: '#e8e4dc' }}>{title}</span>
        <button style={s.btn('ghost')} onClick={addEffect}>+ Aggiungi effetto</button>
      </div>

      {effects.length === 0 && (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: '6px' }}>
          Nessun effetto configurato
        </div>
      )}

      {effects.map((effect, idx) => (
        <div key={effect.id} style={{ ...s.card, marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
              EFFETTO {idx + 1}
            </span>
            <button
              onClick={() => removeEffect(effect.id)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,80,80,0.5)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ✕
            </button>
          </div>

          {/* Type selector */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {EFFECT_TYPES.map(et => {
              const active = effect.type === et.value
              return (
                <button
                  key={et.value}
                  onClick={() => updateType(effect.id, et.value)}
                  title={et.desc}
                  style={{
                    padding: '0.25rem 0.7rem', borderRadius: '5px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: '0.76rem',
                    border: `1px solid ${active ? 'rgba(254,234,165,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    background: active ? 'rgba(254,234,165,0.06)' : 'transparent',
                    color: active ? '#feeaa5' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {et.label}
                </button>
              )
            })}
          </div>

          {/* Payload editor */}
          <EffectPayloadEditor
            effect={effect}
            onChange={(payload) => updatePayload(effect.id, payload)}
          />
        </div>
      ))}
    </div>
  )
}

// ─── AI Generator Panel ───────────────────────────────────────────────────────

const AI_SYSTEM_PROMPT = `Sei il Cantore degli Oggetti Perduti, un archivista cosmico con un'ironia tagliente e uno humor assurdo. Il tuo compito è generare descrizioni di oggetti per un gioco di ruolo dal vivo in stile veneziano gotico.

Stile OBBLIGATORIO:
- Tono esilarante, surreale, leggermente demenziale ma con dignità narrativa
- Usare personificazioni assurde, paragoni impossibili, unità di misura inventate
- Riferimenti pseudo-storici completamente falsi ma detti con serietà assoluta
- Ogni oggetto deve sembrare importante anche se ridicolo
- Italiano vivace, nessun cliché fantasy generico

Esempi di tono:
- "Il Dente di Suocera è un raro fossile di critica p a s s i v o - a g g r e s s i v a, capace di sussurrarti cosa hai sbagliato nella vita… anche se non lo hai chiesto."
- "Il Litro di Fiamme è un'unità di misura proibita, usata solo dai draghi idraulici e dalle nonne che cucinano 'a occhio'. Versarlo è reato in 12 dimensioni."
- "L'Essenza Lavorata di Mana è il concentrato di magia raffinata, perfetto per stregoni professionisti e maghi in cerca di prestazioni elevate. Funziona meglio con un po' di musica epica di sottofondo."

Rispondi SOLO con un oggetto JSON valido, senza markdown, senza backtick, senza testo aggiuntivo:
{
  "name": "Nome dell'oggetto (titolo in italiano, 2-5 parole, suona importante o assurdo)",
  "description": "Descrizione 1-3 frasi nello stile sopra. Esilarante ma con dignità.",
  "category": "una parola in inglese minuscolo (es: artifact, relic, substance, document, key, creature, food, tool)",
  "tags": ["tag1", "tag2", "tag3"],
  "rarity": "common|uncommon|rare|epic|legendary"
}`

interface AIResult {
  name: string
  description: string
  category: string
  tags: string[]
  rarity: Rarity
}

function AIGeneratorPanel({ onApply }: { onApply: (result: AIResult) => void }) {
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<AIResult | null>(null)

  async function generate() {
    if (!idea.trim()) return
    setLoading(true)
    setError(null)
    setPreview(null)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: AI_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Genera un oggetto partendo da questa idea: "${idea.trim()}"` }],
        }),
      })

      const data = await res.json()
      const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? ''
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed: AIResult = JSON.parse(clean)

      const validRarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
      if (!validRarities.includes(parsed.rarity)) parsed.rarity = 'common'

      setPreview(parsed)
    } catch (e) {
      setError(`Errore generazione: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      border: '1px solid rgba(254,234,165,0.2)',
      borderRadius: '8px',
      background: 'rgba(254,234,165,0.03)',
      padding: '1rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1rem' }}>✦</span>
        <span style={{ fontSize: '0.78rem', color: '#feeaa5', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
          Generatore AI
        </span>
        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)', marginLeft: '0.25rem' }}>
          — descrivilo in poche parole, ci pensa il Cantore
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <input
          type="text"
          value={idea}
          onChange={e => setIdea(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') generate() }}
          style={{ ...s.input, flex: 1 }}
          placeholder="es: un fungo che canta, acqua di laguna maledetta, l'ultima lettera di un bugiardo…"
          disabled={loading}
        />
        <button
          style={{ ...s.btn('primary'), minWidth: '90px', opacity: loading ? 0.6 : 1 }}
          onClick={generate}
          disabled={loading || !idea.trim()}
        >
          {loading ? '✦ …' : '✦ Genera'}
        </button>
      </div>

      {error && (
        <p style={{ fontSize: '0.75rem', color: '#ff8080', marginTop: '0.5rem' }}>{error}</p>
      )}

      {preview && (
        <div style={{
          marginTop: '0.875rem',
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(254,234,165,0.12)',
          borderRadius: '6px',
          padding: '0.85rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.9rem', color: RARITY_CONFIG[preview.rarity].color, fontWeight: 500 }}>
                {preview.name}
              </span>
              <span style={{
                marginLeft: '0.6rem', fontSize: '0.65rem',
                color: RARITY_CONFIG[preview.rarity].color, opacity: 0.7,
                letterSpacing: '0.04em',
              }}>
                {RARITY_CONFIG[preview.rarity].label}
              </span>
            </div>
            <button
              onClick={() => { onApply(preview); setPreview(null); setIdea('') }}
              style={s.btn('primary')}
            >
              Usa →
            </button>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
            {preview.description}
          </p>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
              {preview.category}
            </span>
            {preview.tags.map(tag => (
              <span key={tag} style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(91,155,213,0.08)', color: 'rgba(91,155,213,0.7)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ data, set }: { data: WizardData; set: (p: Partial<WizardData>) => void }) {
  return (
    <div>
      <AIGeneratorPanel
        onApply={result => set({
          name: result.name,
          description: result.description,
          category: result.category,
          tags: result.tags.join(', '),
          rarity: result.rarity,
        })}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={s.label}>Nome *</label>
          <input
            type="text" autoFocus
            value={data.name}
            onChange={e => set({ name: e.target.value })}
            style={s.input}
            placeholder="Chiave Arrugginita"
          />
        </div>
        <div>
          <label style={s.label}>Categoria</label>
          <input
            type="text"
            value={data.category}
            onChange={e => set({ category: e.target.value })}
            style={s.input}
            placeholder="key, document, artifact…"
          />
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={s.label}>Descrizione</label>
        <textarea
          value={data.description}
          onChange={e => set({ description: e.target.value })}
          rows={3}
          style={{ ...s.input, resize: 'vertical' }}
          placeholder="Una vecchia chiave arrugginita che odora di mare…"
        />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={s.label}>Tag</label>
        <input
          type="text"
          value={data.tags}
          onChange={e => set({ tags: e.target.value })}
          style={s.input}
          placeholder="chiave, porta, segreto  (separati da virgola)"
        />
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem' }}>
          Separare i tag con virgola
        </p>
      </div>

      <div>
        <label style={s.label}>Rarità</label>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {(Object.keys(RARITY_CONFIG) as Rarity[]).map(r => {
            const cfg = RARITY_CONFIG[r]
            const active = data.rarity === r
            return (
              <button
                key={r}
                onClick={() => set({ rarity: r })}
                style={{
                  padding: '0.35rem 0.9rem', borderRadius: '6px', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '0.78rem',
                  border: `1px solid ${active ? cfg.color : 'rgba(255,255,255,0.08)'}`,
                  background: active ? cfg.bg : 'transparent',
                  color: active ? cfg.color : 'rgba(255,255,255,0.3)',
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Step2({ data, set }: { data: WizardData; set: (p: Partial<WizardData>) => void }) {
  return (
    <div>
      <div style={{ ...s.card, marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.4)' }}>Adventure ID</span>
          <span style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.78rem', color: '#feeaa5' }}>
            {ADVENTURE_ID}
          </span>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.4rem' }}>
          Fisso — questo oggetto appartiene all'avventura corrente.
        </p>
      </div>

      <div>
        <label style={s.label}>Episode ID <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>(opzionale)</span></label>
        <input
          type="text"
          value={data.episode_id}
          onChange={e => set({ episode_id: e.target.value })}
          style={{ ...s.input, fontFamily: 'Space Mono, monospace', fontSize: '0.82rem' }}
          placeholder="Lascia vuoto per item dell'avventura"
        />
        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.35rem' }}>
          Se specificato, l'oggetto sarà disponibile solo in quell'episodio.
        </p>
      </div>
    </div>
  )
}

function Step3({ data, set }: { data: WizardData; set: (p: Partial<WizardData>) => void }) {
  return (
    <div>
      {/* Proprietà booleane + stack */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <label style={s.label}>Stackable</label>
          <select value={data.is_stackable ? 'true' : 'false'} onChange={e => set({ is_stackable: e.target.value === 'true' })} style={s.input}>
            <option value="true">Sì</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Consumabile</label>
          <select value={data.is_consumable ? 'true' : 'false'} onChange={e => set({ is_consumable: e.target.value === 'true' })} style={s.input}>
            <option value="false">No</option>
            <option value="true">Sì</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Trasferibile</label>
          <select value={data.is_transferable ? 'true' : 'false'} onChange={e => set({ is_transferable: e.target.value === 'true' })} style={s.input}>
            <option value="true">Sì</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Max stack</label>
          <input type="number" min={1} value={data.max_stack} onChange={e => set({ max_stack: e.target.value })} style={s.input} />
        </div>
      </div>

      {/* Peso */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={s.label}>Peso</label>
        <input
          type="number" min={0}
          value={data.weight}
          onChange={e => set({ weight: e.target.value })}
          style={{ ...s.input, maxWidth: '120px' }}
          placeholder="—"
        />
        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', marginTop: '0.25rem' }}>
          Unità arbitrarie (opzionale)
        </p>
      </div>

      {/* Claim */}
      <p style={s.sectionTitle}>Claim & Unicità</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div>
          <label style={s.label}>Codice claim</label>
          <input
            type="text"
            value={data.claim_code}
            onChange={e => set({ claim_code: e.target.value.toUpperCase() })}
            style={{ ...s.input, fontFamily: 'Space Mono, monospace' }}
            placeholder="CHIAVE42"
          />
        </div>
        <div>
          <label style={s.label}>Limite globale</label>
          <input
            type="number" min={1}
            value={data.claim_limit}
            onChange={e => set({ claim_limit: e.target.value })}
            style={s.input}
            placeholder="— illimitato"
          />
        </div>
        <div>
          <label style={s.label}>Limit. per giocatore</label>
          <input
            type="number" min={1}
            value={data.claim_limit_per_player}
            onChange={e => set({ claim_limit_per_player: e.target.value })}
            style={s.input}
          />
        </div>
      </div>

      {/* Uniqueness scope */}
      <div>
        <label style={s.label}>Scope unicità</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {UNIQUENESS_OPTIONS.map(opt => {
            const active = data.uniqueness_scope === opt.value
            return (
              <label
                key={opt.value}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.45rem 0.75rem', borderRadius: '6px', cursor: 'pointer',
                  border: `1px solid ${active ? 'rgba(254,234,165,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  background: active ? 'rgba(254,234,165,0.04)' : 'transparent',
                }}
              >
                <input
                  type="radio" name="uniqueness_scope" value={opt.value}
                  checked={active}
                  onChange={() => set({ uniqueness_scope: opt.value })}
                  style={{ accentColor: '#feeaa5' }}
                />
                <div>
                  <span style={{ fontSize: '0.83rem', color: active ? '#feeaa5' : '#e8e4dc' }}>{opt.label}</span>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>{opt.desc}</span>
                </div>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Step4({ data, set }: { data: WizardData; set: (p: Partial<WizardData>) => void }) {
  return (
    <div>
      {/* On Hold */}
      <p style={s.sectionTitle}>Effetti passivi (on hold)</p>
      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>
        Attivi finché il giocatore possiede l'oggetto.
      </p>
      <EffectList
        title=""
        effects={data.on_hold}
        onChange={on_hold => set({ on_hold })}
      />

      {/* On Use */}
      <p style={{ ...s.sectionTitle, marginTop: '2rem' }}>Effetti attivi (on use)</p>
      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginBottom: '1rem' }}>
        Scatenati quando il giocatore usa l'oggetto.
      </p>

      {/* Consumes on use toggle */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.6rem 0.85rem', borderRadius: '6px', cursor: 'pointer',
        border: `1px solid ${data.on_use_consumes ? 'rgba(255,165,100,0.35)' : 'rgba(255,255,255,0.07)'}`,
        background: data.on_use_consumes ? 'rgba(255,165,100,0.05)' : 'transparent',
        marginBottom: '1rem',
      }}>
        <input
          type="checkbox"
          checked={data.on_use_consumes}
          onChange={e => set({ on_use_consumes: e.target.checked })}
          style={{ accentColor: '#e8af48', width: '15px', height: '15px' }}
        />
        <div>
          <span style={{ fontSize: '0.83rem', color: data.on_use_consumes ? 'rgba(255,165,100,0.9)' : '#e8e4dc' }}>
            Consuma all'uso
          </span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem' }}>
            L'oggetto viene rimosso dall'inventario dopo l'uso
          </span>
        </div>
      </label>

      <EffectList
        title=""
        effects={data.on_use}
        onChange={on_use => set({ on_use })}
      />

      {/* Preview JSON */}
      {(data.on_hold.length > 0 || data.on_use.length > 0) && (
        <div style={{ marginTop: '1.5rem' }}>
          <p style={s.sectionTitle}>Anteprima effect_data</p>
          <pre style={{
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '6px', padding: '0.75rem', fontSize: '0.72rem',
            color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Mono, monospace',
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {JSON.stringify(buildEffectData(data), null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function Step5({
  data, set, imageFile, imagePreview, onImageChange, onImageRemove, fileInputRef,
}: {
  data: WizardData
  set: (p: Partial<WizardData>) => void
  imageFile: File | null
  imagePreview: string | null
  onImageChange: (f: File) => void
  onImageRemove: () => void
  fileInputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Preview box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '120px', height: '120px', borderRadius: '10px', flexShrink: 0,
            border: '1px dashed rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.03)', cursor: 'pointer',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {imagePreview
            ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: '2rem', opacity: 0.2 }}>⬡</span>
          }
        </div>

        <div style={{ flex: 1 }}>
          <input
            ref={fileInputRef} type="file" accept="image/*"
            onChange={e => { const f = e.target.files?.[0]; if (f) onImageChange(f) }}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <button style={s.btn('ghost')} onClick={() => fileInputRef.current?.click()}>
              {imagePreview ? 'Cambia immagine' : 'Carica immagine'}
            </button>
            {imagePreview && (
              <button style={s.btn('danger')} onClick={onImageRemove}>
                Rimuovi
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)' }}>
            PNG, JPG, WEBP — max 2MB
          </p>
          {imageFile && (
            <p style={{ fontSize: '0.72rem', color: '#64d278', marginTop: '0.3rem' }}>
              ✓ {imageFile.name}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div style={{ ...s.card, marginTop: '2rem' }}>
        <p style={{ ...s.sectionTitle, marginTop: 0 }}>Riepilogo oggetto</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem' }}>
          {[
            ['Nome', data.name || '—'],
            ['Rarità', RARITY_CONFIG[data.rarity].label],
            ['Categoria', data.category || '—'],
            ['Tag', data.tags || '—'],
            ['Stackable', data.is_stackable ? 'Sì' : 'No'],
            ['Consumabile', data.is_consumable ? 'Sì' : 'No'],
            ['Trasferibile', data.is_transferable ? 'Sì' : 'No'],
            ['Codice claim', data.claim_code || '—'],
            ['Effetti passivi', `${data.on_hold.length} effetto/i`],
            ['Effetti uso', `${data.on_use.length} effetto/i${data.on_use_consumes ? ' · consuma' : ''}`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{k}</span>
              <span style={{ fontSize: '0.75rem', color: '#e8e4dc' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEffectData(data: WizardData): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  if (data.on_hold.length > 0) {
    result.on_hold = data.on_hold.map(({ type, payload }) => ({ type, payload }))
  }
  if (data.on_use.length > 0 || data.on_use_consumes) {
    result.on_use = {
      consumes_on_use: data.on_use_consumes,
      effects: data.on_use.map(({ type, payload }) => ({ type, payload })),
    }
  }
  return result
}

function parseTags(tags: string): string[] {
  return tags.split(',').map(t => t.trim()).filter(Boolean)
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewItemPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(EMPTY)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function set(partial: Partial<WizardData>) {
    setData(d => ({ ...d, ...partial }))
  }

  function validateStep(): string | null {
    if (step === 1 && !data.name.trim()) return 'Il nome è obbligatorio.'
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => Math.min(s + 1, STEPS.length))
  }

  function prev() {
    setError(null)
    setStep(s => Math.max(s - 1, 1))
  }

  function handleImageChange(file: File) {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleImageRemove() {
    setImageFile(null)
    setImagePreview(null)
    set({ icon_url: '' })
  }

  async function uploadImage(file: File): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('item-images').upload(path, file, { upsert: false })
    if (error) throw new Error(error.message)
    const { data: urlData } = supabase.storage.from('item-images').getPublicUrl(path)
    return urlData.publicUrl
  }

  async function handleSave() {
    if (!data.name.trim()) { setError('Il nome è obbligatorio.'); return }
    setSaving(true)
    setError(null)

    try {
      let iconUrl = data.icon_url
      if (imageFile) {
        iconUrl = await uploadImage(imageFile)
      }

      const payload = {
        adventure_id: ADVENTURE_ID,
        episode_id: data.episode_id.trim() || null,
        name: data.name.trim(),
        description: data.description.trim() || null,
        category: data.category.trim() || null,
        rarity: data.rarity,
        is_stackable: data.is_stackable,
        is_consumable: data.is_consumable,
        is_transferable: data.is_transferable,
        max_stack: parseInt(data.max_stack) || 99,
        claim_code: data.claim_code.trim() || null,
        claim_limit: data.claim_limit ? parseInt(data.claim_limit) : null,
        claim_limit_per_player: data.claim_limit_per_player ? parseInt(data.claim_limit_per_player) : 1,
        uniqueness_scope: data.uniqueness_scope,
        icon_url: iconUrl || null,
        weight: data.weight ? parseInt(data.weight) : null,
        tags: parseTags(data.tags),
        effect_data: buildEffectData(data),
      }

      const { error: err } = await supabase.from('items').insert(payload)
      if (err) { setError(err.message); return }

      router.push('/admin/items')
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => router.push('/admin/items')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
        >
          ←
        </button>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', color: '#feeaa5', fontWeight: 400 }}>
          Nuovo oggetto
        </h1>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '2.5rem' }}>
        {STEPS.map((s, idx) => {
          const done = step > s.n
          const active = step === s.n
          return (
            <div key={s.n} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {/* Connector line */}
              {idx > 0 && (
                <div style={{
                  position: 'absolute', top: '12px', right: '50%', left: '-50%',
                  height: '1px',
                  background: done || active ? 'rgba(254,234,165,0.4)' : 'rgba(255,255,255,0.08)',
                }} />
              )}
              {/* Circle */}
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: `1px solid ${active ? '#feeaa5' : done ? 'rgba(254,234,165,0.4)' : 'rgba(255,255,255,0.12)'}`,
                background: active ? '#feeaa5' : done ? 'rgba(254,234,165,0.12)' : 'rgba(255,255,255,0.03)',
                color: active ? '#090807' : done ? '#feeaa5' : 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 600, position: 'relative', zIndex: 1,
              }}>
                {done ? '✓' : s.n}
              </div>
              {/* Label */}
              <span style={{
                fontSize: '0.65rem', marginTop: '0.3rem', letterSpacing: '0.05em',
                color: active ? '#feeaa5' : done ? 'rgba(254,234,165,0.5)' : 'rgba(255,255,255,0.25)',
              }}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div style={{ ...s.card, minHeight: '320px', marginBottom: '1.5rem' }}>
        <p style={{ ...s.sectionTitle, marginTop: 0 }}>
          {STEPS[step - 1].label}
        </p>

        {step === 1 && <Step1 data={data} set={set} />}
        {step === 2 && <Step2 data={data} set={set} />}
        {step === 3 && <Step3 data={data} set={set} />}
        {step === 4 && <Step4 data={data} set={set} />}
        {step === 5 && (
          <Step5
            data={data} set={set}
            imageFile={imageFile} imagePreview={imagePreview}
            onImageChange={handleImageChange}
            onImageRemove={handleImageRemove}
            fileInputRef={fileInputRef}
          />
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: '1rem', padding: '0.6rem 0.9rem',
          background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)',
          borderRadius: '6px', color: '#ff8080', fontSize: '0.85rem',
        }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={s.btn('ghost')} onClick={step === 1 ? () => router.push('/admin/items') : prev}>
          {step === 1 ? 'Annulla' : '← Indietro'}
        </button>
        {step < STEPS.length
          ? <button style={s.btn('primary')} onClick={next}>Avanti →</button>
          : (
            <button style={s.btn('primary')} onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio…' : 'Crea oggetto'}
            </button>
          )
        }
      </div>
    </div>
  )
}
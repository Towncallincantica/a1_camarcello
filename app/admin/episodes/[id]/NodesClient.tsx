'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type NodeCategory = 'main_story' | 'side_quest' | 'exploration' | 'social' | 'combat' | 'puzzle'

type ContentNode = {
  node_id: string
  episode_id: string
  name: string
  node_category: NodeCategory
  content_html: string
  custom_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

type NodeForm = {
  name: string
  node_category: NodeCategory
  content_html: string
}

const CATEGORIES: NodeCategory[] = ['main_story', 'side_quest', 'exploration', 'social', 'combat', 'puzzle']

const CATEGORY_LABELS: Record<NodeCategory, string> = {
  main_story: 'Storia principale',
  side_quest: 'Missione secondaria',
  exploration: 'Esplorazione',
  social: 'Sociale',
  combat: 'Combattimento',
  puzzle: 'Puzzle',
}

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  main_story: '#feeaa5',
  side_quest: '#a5d8fe',
  exploration: '#a5feb8',
  social: '#fea5d8',
  combat: '#fea5a5',
  puzzle: '#d8a5fe',
}

const EMPTY_FORM: NodeForm = {
  name: '',
  node_category: 'main_story',
  content_html: '',
}

const s = {
  btn: (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
    padding: '0.45rem 1rem',
    borderRadius: '6px',
    border: variant === 'primary' ? 'none' : `1px solid ${variant === 'danger' ? 'rgba(255,80,80,0.4)' : 'rgba(255,255,255,0.12)'}`,
    background: variant === 'primary' ? '#e8af48' : variant === 'danger' ? 'rgba(255,80,80,0.08)' : 'rgba(255,255,255,0.04)',
    color: variant === 'primary' ? '#090807' : variant === 'danger' ? '#ff6060' : '#e8e4dc',
    fontFamily: 'inherit',
    fontSize: '0.82rem',
    fontWeight: variant === 'primary' ? 600 : 400,
    cursor: 'pointer',
    letterSpacing: '0.03em',
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
    display: 'block',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '0.3rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
}

export default function NodesClient({
  id,
  initialNodes,
}: {
  id: string
  initialNodes: ContentNode[]
}) {
  const [nodes, setNodes] = useState<ContentNode[]>(initialNodes)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<ContentNode | null>(null)
  const [form, setForm] = useState<NodeForm>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<NodeCategory | 'all'>('all')
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  const filtered = filterCategory === 'all' ? nodes : nodes.filter(n => n.node_category === filterCategory)

  function openCreate() {
    setEditingNode(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(node: ContentNode) {
    setEditingNode(node)
    setForm({ name: node.name, node_category: node.node_category, content_html: node.content_html })
    setError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingNode(null)
    setError(null)
  }

  function handleSave() {
    if (!form.name.trim()) { setError('Il nome è obbligatorio.'); return }

    startTransition(async () => {
      setError(null)
      if (editingNode) {
        const { data, error: err } = await supabase
          .from('content_nodes')
          .update({
            name: form.name.trim(),
            node_category: form.node_category,
            content_html: form.content_html,
            updated_at: new Date().toISOString(),
          })
          .eq('node_id', editingNode.node_id)
          .select()
          .single()
        if (err) { setError(err.message); return }
        setNodes(ns => ns.map(n => n.node_id === data.node_id ? data : n))
      } else {
        const { data, error: err } = await supabase
          .from('content_nodes')
          .insert({
            episode_id: id,
            name: form.name.trim(),
            node_category: form.node_category,
            content_html: form.content_html,
          })
          .select()
          .single()
        if (err) { setError(err.message); return }
        setNodes(ns => [...ns, data])
      }
      closeModal()
      router.refresh()
    })
  }

  function handleDelete(nodeId: string) {
    startTransition(async () => {
      const { error: err } = await supabase
        .from('content_nodes')
        .delete()
        .eq('node_id', nodeId)
      if (err) { alert(err.message); return }
      setNodes(ns => ns.filter(n => n.node_id !== nodeId))
      setDeleteConfirm(null)
    })
  }

  return (
    <div>
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1rem', color: '#e8e4dc', fontWeight: 400 }}>Nodi contenuto</h2>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.2rem' }}>{nodes.length} nodi</p>
        </div>
        <button style={s.btn('primary')} onClick={openCreate}>+ Nuovo nodo</button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {(['all', ...CATEGORIES] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '99px',
              border: `1px solid ${filterCategory === cat ? (cat === 'all' ? 'rgba(255,255,255,0.4)' : CATEGORY_COLORS[cat]) : 'rgba(255,255,255,0.08)'}`,
              background: filterCategory === cat ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: filterCategory === cat ? (cat === 'all' ? '#e8e4dc' : CATEGORY_COLORS[cat]) : 'rgba(255,255,255,0.3)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {cat === 'all' ? `Tutti (${nodes.length})` : `${CATEGORY_LABELS[cat]} (${nodes.filter(n => n.node_category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Nodes table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {['Nome', 'Categoria', 'Anteprima contenuto', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.875rem' }}>
                  Nessun nodo. Creane uno.
                </td>
              </tr>
            )}
            {filtered.map(node => (
              <tr key={node.node_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.65rem 0.75rem', color: '#e8e4dc', fontWeight: 500 }}>{node.name}</td>
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: `${CATEGORY_COLORS[node.node_category]}18`,
                    color: CATEGORY_COLORS[node.node_category],
                    border: `1px solid ${CATEGORY_COLORS[node.node_category]}40`,
                  }}>
                    {CATEGORY_LABELS[node.node_category]}
                  </span>
                </td>
                <td style={{ padding: '0.65rem 0.75rem', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.content_html.replace(/<[^>]+>/g, '').slice(0, 80) || '—'}
                </td>
                <td style={{ padding: '0.65rem 0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/admin/episodes/${node.episode_id}/editor/${node.node_id}`} style={{ ...s.btn('ghost'), display: 'inline-block', textDecoration: 'none' }}>Editor →</Link>
                    <button style={s.btn('ghost')} onClick={() => openEdit(node)}>Modifica</button>
                    {deleteConfirm === node.node_id ? (
                      <>
                        <button style={s.btn('danger')} onClick={() => handleDelete(node.node_id)} disabled={isPending}>Conferma</button>
                        <button style={s.btn('ghost')} onClick={() => setDeleteConfirm(null)}>Annulla</button>
                      </>
                    ) : (
                      <button style={s.btn('danger')} onClick={() => setDeleteConfirm(node.node_id)}>Elimina</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.05rem', color: '#feeaa5', fontWeight: 400 }}>
                {editingNode ? 'Modifica nodo' : 'Nuovo nodo'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={s.input}
                placeholder="Es. La lettera misteriosa"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Categoria</label>
              <select
                value={form.node_category}
                onChange={e => setForm(f => ({ ...f, node_category: e.target.value as NodeCategory }))}
                style={{ ...s.input }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} style={{ background: '#111' }}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={s.label}>Contenuto HTML</label>
              <textarea
                value={form.content_html}
                onChange={e => setForm(f => ({ ...f, content_html: e.target.value }))}
                rows={8}
                style={{ ...s.input, resize: 'vertical', lineHeight: 1.5 }}
                placeholder="<p>Testo narrativo del nodo...</p>"
              />
              {form.content_html && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', marginBottom: '0.4rem', letterSpacing: '0.06em' }}>ANTEPRIMA</div>
                  <div dangerouslySetInnerHTML={{ __html: form.content_html }} />
                </div>
              )}
            </div>

            {error && (
              <div style={{ marginBottom: '1rem', padding: '0.6rem 0.9rem', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '6px', color: '#ff8080', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button style={s.btn('ghost')} onClick={closeModal}>Annulla</button>
              <button style={s.btn('primary')} onClick={handleSave} disabled={isPending}>
                {isPending ? 'Salvataggio...' : editingNode ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
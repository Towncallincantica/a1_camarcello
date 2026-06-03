'use client'

// components/admin/ContentHtmlEditor.tsx
// Editor WYSIWYG (Tiptap) per content_nodes.content_html.
// Deps: @tiptap/react @tiptap/pm @tiptap/starter-kit
//       @tiptap/extension-link @tiptap/extension-image

import { useEffect, useState, useTransition } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { C, btnStyle } from './adminTheme'

interface Props {
  initialHtml: string
  onSave: (html: string) => Promise<{ success: boolean; error?: string }>
}

export function ContentHtmlEditor({ initialHtml, onSave }: Props) {
  const [dirty, setDirty] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Link.configure({ openOnClick: false, autolink: true }), Image],
    content: initialHtml || '',
    onUpdate: () => { setDirty(true); setMsg(null) },
    editorProps: {
      attributes: {
        style:
          'min-height:160px;max-height:340px;overflow-y:auto;border:1px solid ' + C.border +
          ';border-top:none;border-radius:0 0 8px 8px;background:rgba(255,255,255,0.02);' +
          'padding:0.85rem 1rem;color:' + C.text + ';font-size:0.92rem;line-height:1.6;outline:none;',
        class: 'cm-content',
      },
    },
  })

  useEffect(() => {
    if (editor && initialHtml !== editor.getHTML()) {
      editor.commands.setContent(initialHtml || '')
      setDirty(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHtml])

  function handleSave() {
    if (!editor) return
    const html = editor.getHTML()
    startTransition(async () => {
      const res = await onSave(html)
      if (res.success) { setDirty(false); setMsg({ kind: 'ok', text: 'Contenuto salvato.' }) }
      else setMsg({ kind: 'err', text: res.error ?? 'Salvataggio fallito.' })
    })
  }

  if (!editor) return <div style={{ fontSize: '0.8rem', color: C.muted2 }}>Caricamento editor…</div>

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button style={{ ...btnStyle(dirty ? 'primary' : 'ghost') }} onClick={handleSave} disabled={pending || !dirty}>
          {pending ? 'Salvataggio…' : dirty ? 'Salva contenuto' : 'Salvato'}
        </button>
        {msg && (
          <span style={{ fontSize: '0.76rem', color: msg.kind === 'ok' ? C.success : C.danger }}>{msg.text}</span>
        )}
      </div>
    </div>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  function setLink() {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL del link', prev ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  function addImage() {
    const url = window.prompt('URL immagine')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.15rem',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${C.border}`,
        borderRadius: '8px 8px 0 0',
        padding: '0.4rem',
      }}
    >
      <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></Btn>
      <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><em>i</em></Btn>
      <Sep />
      <Btn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
      <Btn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
      <Sep />
      <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• Lista</Btn>
      <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Lista</Btn>
      <Btn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</Btn>
      <Sep />
      <Btn active={editor.isActive('link')} onClick={setLink}>Link</Btn>
      <Btn active={false} onClick={addImage}>Img</Btn>
      <Sep />
      <Btn active={false} onClick={() => editor.chain().focus().undo().run()}>↶</Btn>
      <Btn active={false} onClick={() => editor.chain().focus().redo().run()}>↷</Btn>
    </div>
  )
}

function Btn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        borderRadius: 5,
        border: 'none',
        padding: '0.3rem 0.6rem',
        fontSize: '0.8rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
        background: active ? 'rgba(254,234,165,0.18)' : 'transparent',
        color: active ? C.gold : C.muted,
      }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span style={{ width: 1, alignSelf: 'stretch', background: C.border, margin: '0 0.2rem' }} />
}
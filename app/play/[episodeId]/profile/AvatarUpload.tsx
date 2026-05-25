'use client'

import { useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  currentAvatarUrl: string | null
}

export function AvatarUpload({ userId, currentAvatarUrl }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Seleziona un file immagine.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Immagine troppo grande. Massimo 2MB.')
      return
    }

    setError(null)
    setUploading(true)

    // Preview locale immediata
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `avatars/${userId}.${ext}`

await supabase.storage
  .from('item-images')
  .remove([path])

      const { error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(path)

      // Aggiorna users.avatar_url
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId)
console.log('update result:', updateError)

      if (updateError) throw updateError


      
      setPreview(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il caricamento.')
      setPreview(currentAvatarUrl)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {/* Avatar circle */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          border: '2px solid rgba(254,234,165,0.3)',
          background: 'rgba(255,255,255,0.03)',
          overflow: 'hidden',
          cursor: uploading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: 0,
          flexShrink: 0,
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '2rem', opacity: 0.3 }}>◈</span>
        )}

        {/* Overlay caricamento */}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(9,8,7,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '0.6rem', color: '#feeaa5', letterSpacing: '0.1em', fontFamily: 'Cinzel, serif' }}>
              ...
            </span>
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          background: 'transparent',
          border: '1px solid rgba(254,234,165,0.2)',
          color: 'rgba(254,234,165,0.6)',
          padding: '0.4rem 1.2rem',
          fontFamily: 'Cinzel, serif',
          fontSize: '0.62rem',
          letterSpacing: '0.1em',
          cursor: uploading ? 'default' : 'pointer',
          opacity: uploading ? 0.5 : 1,
        }}
      >
        {uploading ? 'CARICAMENTO...' : preview ? 'CAMBIA FOTO' : 'AGGIUNGI FOTO'}
      </button>

      {error && (
        <p style={{ color: '#e85555', fontSize: '0.78rem', textAlign: 'center', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}
'use client'

interface Props {
  action: () => Promise<void>
  label: string
}

export function DeleteButton({ action, label }: Props) {
  return (
    <form action={action}>
      <button
        type="submit"
        onClick={(e) => {
          if (!confirm(`Delete ${label}? This cannot be undone.`)) {
            e.preventDefault()
          }
        }}
        className="px-4 py-2 bg-red-900 hover:bg-red-800 text-red-300 text-sm rounded-lg transition-colors"
      >
        Delete {label}
      </button>
    </form>
  )
}
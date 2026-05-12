'use client'

import { useState } from 'react'

interface ProgressItem {
  progress_item_id: string
  name: string
}

interface Item {
  item_id: string
  name: string
  rarity: string
  episode_id: string | null
  adventure_id: string | null
}

interface Props {
  action: (formData: FormData) => Promise<void>
  progressItems: ProgressItem[]
  items: Item[]
}

const rarityColors: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400',
}

function itemScope(item: Item): string {
  if (item.episode_id) return 'episode'
  if (item.adventure_id) return 'adventure'
  return 'global'
}

export function EffectForm({ action, progressItems, items }: Props) {
  const [type, setType] = useState('grant_progress_item')
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <form action={action} className="space-y-3 border-t border-gray-800 pt-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
        <select
          name="type"
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setSelectedItem(null)
            setSearch('')
          }}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="grant_progress_item">Grant Progress Item</option>
          <option value="grant_inventory_item">Grant Inventory Item</option>
          <option value="modify_stat">Modify Stat</option>
          <option value="add_status_effect">Add Status Effect</option>
        </select>
      </div>

      {type === 'grant_progress_item' && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Progress Item</label>
          <select
            name="progress_item_id"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">— select —</option>
            {progressItems.map((p) => (
              <option key={p.progress_item_id} value={p.progress_item_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {type === 'grant_inventory_item' && (
        <>
          <input type="hidden" name="item_id" value={selectedItem?.item_id ?? ''} />

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Search Item</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedItem(null)
              }}
              placeholder="Type to filter..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {search && !selectedItem && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500">No items found</p>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.item_id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item)
                      setSearch(item.name)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-white">{item.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs ${rarityColors[item.rarity] ?? 'text-gray-400'}`}>
                        {item.rarity}
                      </span>
                      <span className="text-xs text-gray-600">{itemScope(item)}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedItem && (
            <div className="flex items-center justify-between bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white">{selectedItem.name}</span>
                <span className={`text-xs ${rarityColors[selectedItem.rarity] ?? 'text-gray-400'}`}>
                  {selectedItem.rarity}
                </span>
                <span className="text-xs text-gray-600">{itemScope(selectedItem)}</span>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedItem(null); setSearch('') }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
            <input
              name="quantity"
              type="number"
              defaultValue={1}
              min={1}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </>
      )}

      {type === 'modify_stat' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Stat</label>
            <input
              name="stat"
              placeholder="experience_points"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Value</label>
            <input
              name="value"
              type="number"
              placeholder="100"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      {type === 'add_status_effect' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Status Type</label>
            <input
              name="status_type"
              placeholder="invisibile"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Duration (min) — blank = ∞</label>
            <input
              name="duration_minutes"
              type="number"
              placeholder="30"
              min={1}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      <button type="submit" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
        + Add Effect
      </button>
    </form>
  )
}
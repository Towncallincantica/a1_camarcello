'use client'

import { useState } from 'react'

interface ProgressItem {
  progress_item_id: string
  name: string
}

interface Props {
  action: (formData: FormData) => Promise<void>
  progressItems: ProgressItem[]
}

export function ConditionForm({ action, progressItems }: Props) {
  const [type, setType] = useState('progress_item')

  return (
    <form action={action} className="space-y-3 border-t border-gray-800 pt-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="progress_item">Progress Item</option>
          <option value="gps_location">GPS Location</option>
          <option value="inventory_item">Inventory Item</option>
          <option value="time_window">Time Window</option>
        </select>
      </div>

      {type === 'progress_item' && (
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

      {type === 'gps_location' && (
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Lat</label>
            <input name="lat" type="number" step="any" placeholder="45.0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Lng</label>
            <input name="lng" type="number" step="any" placeholder="12.0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Radius (m)</label>
            <input name="radius_m" type="number" placeholder="50" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
      )}

      {type === 'inventory_item' && (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">Item ID</label>
            <input name="item_id" placeholder="uuid" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
            <input name="quantity" type="number" defaultValue={1} min={1} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
      )}

      {type === 'time_window' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Starts At</label>
            <input name="starts_at" type="datetime-local" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Ends At</label>
            <input name="ends_at" type="datetime-local" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
      )}

      <button type="submit" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
        + Add Condition
      </button>
    </form>
  )
}
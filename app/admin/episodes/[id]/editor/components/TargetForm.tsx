'use client'

import { useState } from 'react'

interface Props {
  action: (formData: FormData) => Promise<void>
}

export function TargetForm({ action }: Props) {
  const [type, setType] = useState('gps_location')

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
          <option value="gps_location">GPS Location</option>
          <option value="qr_scan">QR Scan</option>
          <option value="code_entry">Code Entry</option>
          <option value="claim_item">Claim Item</option>
        </select>
      </div>

      {type === 'gps_location' && (
        <>
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
              <input name="radius_m" type="number" placeholder="30" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Location Name</label>
            <input
              name="location_name"
              placeholder="Fontana del Giardino"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </>
      )}

      {(type === 'qr_scan' || type === 'code_entry') && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            {type === 'qr_scan' ? 'QR Code Value' : 'Entry Code'}
          </label>
          <input
            name="code"
            placeholder="SECRET123"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {type === 'claim_item' && (
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Item ID</label>
          <input
            name="item_id"
            placeholder="uuid"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      <button type="submit" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
        + Add Target
      </button>
    </form>
  )
}
import { useState, useEffect } from 'react';
import type { Facility } from '../types';

interface Props {
  facilities: Facility[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function FacilityFilter({ facilities, selected, onChange }: Props) {
  const [selectedOrg, setSelectedOrg] = useState<number | ''>('');

  // Unique orgs from authorized facilities only
  const orgs = Object.values(
    facilities.reduce<Record<number, { id: number; name: string }>>((acc, f) => {
      const orgId = Number(f.organizationId);
      if (!acc[orgId]) acc[orgId] = { id: orgId, name: f.organizationName };
      return acc;
    }, {})
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Facilities for selected org
  const filteredFacilities = selectedOrg
    ? facilities.filter((f) => Number(f.organizationId) === Number(selectedOrg))
    : [];

  // Reset facility selection when org changes
  useEffect(() => {
    // deselect any facilities not in the new org when org filter changes
  }, [selectedOrg]);

  function handleOrgChange(orgId: number | '') {
    setSelectedOrg(orgId);
    if (orgId === '') {
      // cleared org — clear all selected facilities
      onChange([]);
    }
  }

  function handleFacilityChange(facilityId: number | '') {
    if (facilityId === '') return;
    if (!selected.includes(facilityId)) {
      onChange([...selected, facilityId]);
    }
  }

  function remove(id: number) {
    onChange(selected.filter((x) => x !== id));
  }

  if (!facilities.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Organization dropdown */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Organization</label>
          <select
            value={selectedOrg}
            onChange={(e) => handleOrgChange(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 min-w-44"
          >
            <option value="">All organizations</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Facility dropdown — only when org selected */}
        {selectedOrg !== '' && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Facility</label>
            <select
              value=""
              onChange={(e) => handleFacilityChange(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 min-w-44"
            >
              <option value="">All in org</option>
              {filteredFacilities
                .filter((f) => !selected.includes(f.id))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}{f.code ? ` (${f.code})` : ''}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected facility badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {selected.map((id) => {
            const f = facilities.find((x) => x.id === id);
            return f ? (
              <span
                key={id}
                className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-indigo-900/50 border border-indigo-800 text-indigo-300 text-xs rounded-full"
              >
                <span className="text-indigo-500 mr-0.5">{f.organizationName} ·</span>
                {f.name}
                <button
                  onClick={() => remove(id)}
                  className="ml-0.5 hover:text-white transition-colors text-sm leading-none"
                >
                  ×
                </button>
              </span>
            ) : null;
          })}
          <button
            onClick={() => onChange([])}
            className="text-xs text-gray-500 hover:text-gray-300 px-1 transition-colors"
          >
            clear all
          </button>
        </div>
      )}
    </div>
  );
}

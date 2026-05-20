import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import * as analyticsApi from '../api/analytics';
import type { Facility } from '../types';
import type { ExportRow } from '../types';
import FacilityFilter from '../components/FacilityFilter';

const today = format(new Date(), 'yyyy-MM-dd');
const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

function toCsv(rows: ExportRow[]): string {
  if (!rows.length) return '';
  const headers = ['id', 'facilityId', 'facilityName', 'dataType', 'category', 'score', 'surveyType', 'answers', 'createdAt'];
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h as keyof ExportRow];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(JSON.stringify(val));
        return JSON.stringify(String(val));
      }).join(',')
    ),
  ];
  return lines.join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [dataType, setDataType] = useState<'pulse' | 'survey' | 'combined'>('combined');
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([]);

  useEffect(() => {
    analyticsApi.getFacilities().then(setFacilities).catch(() => {});
  }, []);

  async function handleExport() {
    setLoading(true);
    try {
      const rows = await analyticsApi.exportData({
        dateFrom,
        dateTo,
        dataType,
        facilityIds: selectedFacilities.length ? selectedFacilities : undefined,
      });
      if (!rows.length) {
        toast.info('No data found for the selected range');
        return;
      }
      const csv = toCsv(rows);
      const filename = `totale-export-${dataType}-${dateFrom}-${dateTo}.csv`;
      downloadCsv(csv, filename);
      toast.success(`Exported ${rows.length} rows`);
    } catch {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="p-6 space-y-6 max-w-xl">
      <h2 className="text-lg font-semibold text-white">Export Data</h2>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-5">
        {/* Date range */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Data type */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Data Type</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(['pulse', 'survey', 'combined'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDataType(t)}
                className={`flex-1 py-2 text-sm capitalize transition-colors ${
                  dataType === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {facilities.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Facilities <span className="text-gray-600">(all if none selected)</span>
            </label>
            <FacilityFilter
              facilities={facilities}
              selected={selectedFacilities}
              onChange={setSelectedFacilities}
            />
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Download size={15} />
          {loading ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
    </div>
  );
}

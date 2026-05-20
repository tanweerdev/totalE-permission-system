import { useState, useEffect } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { toast } from 'sonner';

function formatPeriod(period: string, granularity: 'day' | 'week' | 'month') {
  try {
    const d = parseISO(period);
    if (granularity === 'month') return format(d, 'MMM yyyy');
    if (granularity === 'week') return `Week of ${format(d, 'd MMM yyyy')}`;
    return format(d, 'd MMM yyyy');
  } catch {
    return period;
  }
}
import * as analyticsApi from '../api/analytics';
import type { Facility, SurveyRow } from '../types';
import FacilityFilter from '../components/FacilityFilter';

const today = format(new Date(), 'yyyy-MM-dd');
const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

export default function SurveyPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [data, setData] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [selectedFacilities, setSelectedFacilities] = useState<number[]>([]);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    analyticsApi.getFacilities().then(setFacilities).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [dateFrom, dateTo, selectedFacilities, granularity]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const rows = await analyticsApi.getSurvey({
        dateFrom,
        dateTo,
        facilityIds: selectedFacilities.length ? selectedFacilities : undefined,
        granularity,
      });
      setData(rows);
    } catch {
      setError('Failed to load survey data');
      toast.error('Failed to load survey data');
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="p-6 space-y-5">
      <h2 className="text-lg font-semibold text-white">Survey Analytics</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Granularity</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-2 text-sm capitalize transition-colors ${
                  granularity === g
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <FacilityFilter
        facilities={facilities}
        selected={selectedFacilities}
        onChange={setSelectedFacilities}
      />

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="text-center py-16 text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && data.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">No data for selected range</div>
        )}
        {!loading && !error && data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="px-4 py-3 text-left font-medium">Period</th>
                <th className="px-4 py-3 text-left font-medium">Facility</th>
                <th className="px-4 py-3 text-left font-medium">Survey Type</th>
                <th className="px-4 py-3 text-right font-medium">Responses</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-2 text-gray-300">{formatPeriod(row.period, granularity)}</td>
                  <td className="px-4 py-2 text-gray-300">{row.facilityName}</td>
                  <td className="px-4 py-2 text-gray-300">{row.surveyType}</td>
                  <td className="px-4 py-2 text-right text-white font-medium">{row.responseCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Trash2, PencilLine, Plus, X, Check, Search, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as adminApi from '../api/admin';
import type { UserListItem, OrgOption, FacilityOption } from '../api/admin';
import type { UserPermission, CreatePermissionDto } from '../types';

const FEATURE_KEYS: (keyof CreatePermissionDto)[] = [
  'canViewAnalytics',
  'canViewPulse',
  'canViewSurvey',
  'canExportAnalytics',
  'canManagePermissions',
];

const FEATURE_LABELS: Record<string, string> = {
  canViewAnalytics: 'View Analytics',
  canViewPulse: 'View Pulse',
  canViewSurvey: 'View Survey',
  canExportAnalytics: 'Export',
  canManagePermissions: 'Manage Perms',
};

const EMPTY_FORM: CreatePermissionDto = {
  organizationId: null,
  facilityId: null,
  canViewAnalytics: false,
  canViewPulse: false,
  canViewSurvey: false,
  canExportAnalytics: false,
  canManagePermissions: false,
};

const PAGE_SIZE = 10;


export default function AdminPage() {
  const { user: currentUser } = useAuth();

  // User list
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Selected user & permissions
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);

  // Permission form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [scopeType, setScopeType] = useState<'org' | 'facility'>('facility');
  const [form, setForm] = useState<CreatePermissionDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Org / facility dropdown data
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [selectedOrgForFacility, setSelectedOrgForFacility] = useState<number | null>(null);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Load orgs once on mount (needed whenever form opens)
  useEffect(() => {
    adminApi.listOrganizations().then(setOrgs).catch(() => {});
  }, []);

  // When org selected in facility tab, load its facilities
  useEffect(() => {
    if (scopeType !== 'facility' || !selectedOrgForFacility) {
      setFacilities([]);
      return;
    }
    setLoadingFacilities(true);
    setForm((f) => ({ ...f, facilityId: null }));
    adminApi.listFacilitiesByOrg(selectedOrgForFacility)
      .then(setFacilities)
      .catch(() => toast.error('Failed to load facilities'))
      .finally(() => setLoadingFacilities(false));
  }, [selectedOrgForFacility, scopeType]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await adminApi.listUsers(page, PAGE_SIZE, search);
      setUsers(res.data);
      setTotal(res.total);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function loadPermissions(user: UserListItem) {
    setSelectedUser(user);
    setLoadingPerms(true);
    try {
      const perms = await adminApi.getUserPermissions(user.id);
      setPermissions(perms);
    } catch {
      toast.error('Failed to load permissions');
    } finally {
      setLoadingPerms(false);
    }
  }

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setScopeType('facility');
    setSelectedOrgForFacility(null);
    setFacilities([]);
    setShowForm(true);
  }

  function openEdit(p: UserPermission) {
    setEditingId(p.id);
    const type = p.organizationId ? 'org' : 'facility';
    setScopeType(type);
    setForm({
      organizationId: p.organizationId,
      facilityId: p.facilityId,
      canViewAnalytics: p.canViewAnalytics,
      canViewPulse: p.canViewPulse,
      canViewSurvey: p.canViewSurvey,
      canExportAnalytics: p.canExportAnalytics,
      canManagePermissions: p.canManagePermissions,
    });
    // For facility scope, pre-load the org's facilities so the dropdown is populated
    if (type === 'facility' && p.facilityId) {
      // We need to find which org this facility belongs to — load all orgs' facilities to match
      // Simpler: just reset so the user re-picks org + facility on edit
      setSelectedOrgForFacility(null);
      setFacilities([]);
    }
    setShowForm(true);
  }

  async function handleSave() {
    if (!selectedUser) return;
    const dto: CreatePermissionDto = {
      ...form,
      organizationId: scopeType === 'org' ? form.organizationId : null,
      facilityId: scopeType === 'facility' ? form.facilityId : null,
    };

    const hasFeature = FEATURE_KEYS.some((k) => dto[k] === true);
    if (!hasFeature) { toast.error('Enable at least one feature'); return; }
    if (scopeType === 'org' && !dto.organizationId) { toast.error('Select an organization'); return; }
    if (scopeType === 'facility' && !dto.facilityId) { toast.error('Select a facility'); return; }

    setSaving(true);
    try {
      if (editingId) {
        await adminApi.updatePermission(editingId, dto);
        toast.success('Permission updated');
      } else {
        await adminApi.addPermission(selectedUser.id, dto);
        toast.success('Permission added');
      }
      const perms = await adminApi.getUserPermissions(selectedUser.id);
      setPermissions(perms);
      setShowForm(false);
    } catch {
      toast.error('Failed to save permission');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await adminApi.deletePermission(id);
      toast.success('Permission removed');
      setPermissions((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function handleToggleActive(p: UserPermission) {
    if (p.userId === currentUser?.id && p.canManagePermissions && p.isActive) {
      toast.error("You can't deactivate your own admin permission");
      return;
    }
    try {
      await adminApi.setPermissionActive(p.id, !p.isActive);
      setPermissions((prev) =>
        prev.map((x) => x.id === p.id ? { ...x, isActive: !x.isActive } : x)
      );
    } catch {
      toast.error('Failed to update');
    }
  }

  const selectClass = "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50";

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <h2 className="text-lg font-semibold text-white">Manage Permissions</h2>

      {selectedUser ? (
        /* ── Permissions view ── */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedUser(null)}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={15} /> Back to users
            </button>
            <span className="text-gray-600">|</span>
            <span className="text-sm text-gray-300">{selectedUser.email}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${selectedUser.isActive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
              {selectedUser.isActive ? 'active' : 'inactive'}
            </span>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="text-sm text-gray-400">
                {permissions.length} permission{permissions.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
              >
                <Plus size={13} /> Add Permission
              </button>
            </div>

            {loadingPerms ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : permissions.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">No permissions assigned</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="px-4 py-3 text-left font-medium">Scope</th>
                    <th className="px-4 py-3 text-left font-medium">Child Orgs</th>
                    <th className="px-4 py-3 text-left font-medium">Features</th>
                    <th className="px-4 py-3 text-center font-medium">Active</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((p) => {
                    const childOrgs = p.organizationId ? (() => {
                        const result: typeof orgs = [];
                        const queue = [Number(p.organizationId)];
                        while (queue.length) {
                          const parentId = queue.shift()!;
                          const children = orgs.filter((o) => Number(o.parentId) === parentId);
                          children.forEach((c) => { result.push(c); queue.push(c.id); });
                        }
                        return result;
                      })() : [];
                    return (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-3 text-gray-300">
                        {p.organizationId
                          ? <span className="text-cyan-400">Org · {p.organizationName ?? `#${p.organizationId}`}</span>
                          : <span className="text-amber-400">Facility · {p.facilityName ?? `#${p.facilityId}`}</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {childOrgs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {childOrgs.map((o) => (
                              <span key={o.id} className="px-2 py-0.5 bg-gray-800 text-gray-400 text-xs rounded-full border border-gray-700">
                                {o.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {FEATURE_KEYS.filter((k) => p[k as keyof UserPermission]).map((k) => (
                            <span key={k} className="px-2 py-0.5 bg-indigo-900/50 text-indigo-300 text-xs rounded-full border border-indigo-800">
                              {FEATURE_LABELS[k]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                            p.isActive
                              ? 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900'
                              : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                          }`}
                        >
                          {p.isActive ? <Check size={14} /> : <X size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                            <PencilLine size={14} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* ── User list ── */
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by email…"
                className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button onClick={handleSearch} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
              Search
            </button>
            {search && (
              <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-lg transition-colors">
                Clear
              </button>
            )}
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {loadingUsers ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">No users found</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="px-4 py-3 text-left font-medium">ID</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-4 py-3 text-gray-500 w-12">{u.id}</td>
                      <td className="px-4 py-3 text-gray-200">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${u.isActive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                          {u.isActive ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => loadPermissions(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-indigo-600 text-gray-300 hover:text-white text-xs rounded-lg transition-colors ml-auto"
                        >
                          <PencilLine size={12} /> Edit Permissions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>{total} users · page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit permission modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">{editingId ? 'Edit Permission' : 'Add Permission'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* Scope toggle */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Scope</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                {(['facility', 'org'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setScopeType(t);
                      setForm((f) => ({ ...f, organizationId: null, facilityId: null }));
                      setSelectedOrgForFacility(null);
                      setFacilities([]);
                    }}
                    className={`flex-1 py-2 text-sm transition-colors ${
                      scopeType === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {t === 'org' ? 'Organization' : 'Facility'}
                  </button>
                ))}
              </div>
            </div>

            {/* Organization scope — single dropdown */}
            {scopeType === 'org' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Organization</label>
                <select
                  value={form.organizationId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value ? parseInt(e.target.value) : null }))}
                  className={selectClass}
                >
                  <option value="">Select organization…</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Facility scope — org dropdown → facility dropdown */}
            {scopeType === 'facility' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Organization</label>
                  <select
                    value={selectedOrgForFacility ?? ''}
                    onChange={(e) => setSelectedOrgForFacility(e.target.value ? parseInt(e.target.value) : null)}
                    className={selectClass}
                  >
                    <option value="">Select organization…</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Facility</label>
                  <select
                    value={form.facilityId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, facilityId: e.target.value ? parseInt(e.target.value) : null }))}
                    disabled={!selectedOrgForFacility || loadingFacilities}
                    className={selectClass}
                  >
                    <option value="">
                      {!selectedOrgForFacility
                        ? 'Select an organization first…'
                        : loadingFacilities
                        ? 'Loading…'
                        : facilities.length === 0
                        ? 'No facilities in this org'
                        : 'Select facility…'}
                    </option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}{f.code ? ` (${f.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Feature checkboxes */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Features</label>
              <div className="space-y-2">
                {FEATURE_KEYS.map((key) => {
                  const isSelfManage = key === 'canManagePermissions' && selectedUser?.id === currentUser?.id;
                  return (
                    <label key={key} className={`flex items-center gap-3 cursor-pointer ${isSelfManage ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      <input
                        type="checkbox"
                        disabled={isSelfManage}
                        checked={!!form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-indigo-600"
                      />
                      <span className="text-sm text-gray-300">{FEATURE_LABELS[key]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

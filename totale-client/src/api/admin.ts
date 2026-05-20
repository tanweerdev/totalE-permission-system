import client from './client';
import type { UserPermission, CreatePermissionDto } from '../types';

export interface UserListItem {
  id: number;
  email: string;
  isActive: boolean;
}

export interface UserListResponse {
  data: UserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface OrgOption {
  id: number;
  name: string;
  level: number;
  parentId: number | null;
}

export interface FacilityOption {
  id: number;
  name: string;
  code: string;
}

export async function listOrganizations(): Promise<OrgOption[]> {
  const res = await client.get<OrgOption[]>('/admin/organizations');
  return res.data.map((o) => ({ ...o, id: Number(o.id), parentId: o.parentId != null ? Number(o.parentId) : null }));
}

export async function listFacilitiesByOrg(orgId: number): Promise<FacilityOption[]> {
  const res = await client.get<FacilityOption[]>(`/admin/organizations/${orgId}/facilities`);
  return res.data;
}

export async function listUsers(page: number, limit: number, search?: string): Promise<UserListResponse> {
  const params: Record<string, unknown> = { page, limit };
  if (search?.trim()) params.search = search.trim();
  const res = await client.get<UserListResponse>('/admin/users', { params });
  return res.data;
}

export async function getUserPermissions(userId: number): Promise<UserPermission[]> {
  const res = await client.get<UserPermission[]>(`/admin/users/${userId}/permissions`);
  return res.data;
}

export async function addPermission(userId: number, dto: CreatePermissionDto): Promise<UserPermission> {
  const res = await client.post<UserPermission>(`/admin/users/${userId}/permissions`, dto);
  return res.data;
}

export async function updatePermission(permissionId: number, dto: Partial<CreatePermissionDto>): Promise<UserPermission> {
  const res = await client.patch<UserPermission>(`/admin/permissions/${permissionId}`, dto);
  return res.data;
}

export async function deletePermission(permissionId: number): Promise<void> {
  await client.delete(`/admin/permissions/${permissionId}`);
}

export async function setPermissionActive(permissionId: number, isActive: boolean): Promise<void> {
  await client.patch(`/admin/permissions/${permissionId}/active`, { isActive });
}

export async function moveFacilityToOrg(facilityId: number, organizationId: number): Promise<void> {
  await client.patch(`/admin/facilities/${facilityId}/organization`, { organizationId });
}

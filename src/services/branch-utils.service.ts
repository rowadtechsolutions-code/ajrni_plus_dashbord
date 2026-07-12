import apiClient from '@/lib/api/axios';

let cachedBranchOfficeIds: string[] | null = null;
let cachePromise: Promise<string[]> | null = null;

export async function getBranchLinkedOfficeIds(): Promise<string[]> {
  if (cachedBranchOfficeIds) return cachedBranchOfficeIds;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      const res = await apiClient.get<{ linked_office_id: string | null }[]>('/OfficeBranches', {
        params: { select: 'linked_office_id', linked_office_id: 'not.is.null' },
      });
      const ids = [...new Set(res.data.map((r) => r.linked_office_id).filter(Boolean))] as string[];
      cachedBranchOfficeIds = ids;
      return ids;
    } catch {
      cachedBranchOfficeIds = [];
      return [];
    }
  })();

  return cachePromise;
}

export function clearBranchCache(): void {
  cachedBranchOfficeIds = null;
  cachePromise = null;
}

export async function getActiveBranchesCount(): Promise<number> {
  try {
    const res = await apiClient.get<unknown[]>('/OfficeBranches', {
      params: { select: 'id', is_active: 'eq.true', limit: '1' },
      headers: { Prefer: 'count=exact' },
    });
    const count = Number(res.headers['content-range']?.split('/')[1]);
    return Number.isFinite(count) ? count : 0;
  } catch {
    return 0;
  }
}

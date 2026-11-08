// Reads go through GraphQL (one query for the whole screen); writes go through REST.

export type Slot = 'AM' | 'PM';
export interface Employee { id: string; name: string; role: string; hourlyRateCents: number; maxHours: number; offDays: number[]; hours: number }
export interface Issue { rule: string; severity: 'error' | 'warning'; message: string; employeeId: string | null; day: number | null }
export interface Week {
  id: string; weekStart: string; status: 'draft' | 'published';
  budgetCents: number; laborCostCents: number;
  employees: Employee[];
  shifts: { id: string; day: number; slot: Slot; employee: { id: string } }[];
  coverage: { day: number; slot: Slot; minStaff: number }[];
  issues: Issue[];
}

export const SCHEDULE_ID = import.meta.env.VITE_SCHEDULE_ID ?? '00000000-0000-4000-8000-000000000042';

const WEEK_QUERY = /* GraphQL */ `
  query Week($id: ID!) {
    schedule(id: $id) {
      id weekStart status budgetCents laborCostCents
      employees { id name role hourlyRateCents maxHours offDays hours }
      shifts { id day slot employee { id } }
      coverage { day slot minStaff }
      issues { rule severity message employeeId day }
    }
  }`;

export async function fetchWeek(id = SCHEDULE_ID): Promise<Week> {
  const res = await fetch('/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: WEEK_QUERY, variables: { id } }),
  });
  const { data, errors } = await res.json();
  if (errors?.length || !data?.schedule) throw new Error(errors?.[0]?.message ?? 'Schedule not found');
  return data.schedule;
}

async function command(method: 'PUT' | 'POST', path: string, body?: unknown) {
  const res = await fetch(`/api/schedules/${SCHEDULE_ID}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json()).error ?? `Request failed (${res.status})`);
}

export const setAssignment = (employeeId: string, day: number, slot: Slot | null) =>
  command('PUT', '/assignments', { employeeId, day, slot });
export const autoFill = () => command('POST', '/auto-fill');
export const publish = () => command('POST', '/publish');

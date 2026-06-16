/** README §8 Event Type */
import { apiGet } from "./apiClient";

export interface EventTypeRecord {
  id: string;
  name: string;
  sourceId?: string;
  displayOrder?: number;
  isActive?: boolean;
  sportNodeType?: number;
  [key: string]: any;
}

export interface EventRecord {
  id: string;
  eventTypeId: string;
  sourceId: string;
  name: string;
  raceName: string;
  sportNodeType: number;
  countryCode: string;
  timezone: string;
  openDate: string;
}

/** GET /eventtype/geteventtype — list event types (sports). Auth: Session. */
export async function getEventType(): Promise<EventTypeRecord[]> {
  const res = await apiGet<EventTypeRecord[] | { data?: EventTypeRecord[] }>(
    "/eventtype/geteventtype"
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

/** GET /event/searchevent/{eventTypeId} — list events for a sport. Auth: Session. */
export async function searchEvents(eventTypeId: string): Promise<EventRecord[]> {
  const res = await apiGet<{ data?: EventRecord[] }>(
    `/event/searchevent/${eventTypeId}`
  );
  return res?.data ?? [];
}

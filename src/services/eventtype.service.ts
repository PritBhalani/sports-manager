/** README §8 Event Type */
import { apiGet } from "./apiClient";

export type EventTypeRecord = Record<string, unknown>;

/** GET /eventtype/geteventtype — list event types (sports). Auth: Session. */
export async function getEventType(): Promise<EventTypeRecord[]> {
  const res = await apiGet<EventTypeRecord[] | { data?: EventTypeRecord[] }>(
    "/eventtype/geteventtype"
  );
  return Array.isArray(res) ? res : res?.data ?? [];
}

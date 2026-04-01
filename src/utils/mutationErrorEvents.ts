export const MUTATION_TOAST_EVENT = "app:mutation-toast";

export type MutationToastType = "success" | "error";

export type MutationToastDetail = {
  type: MutationToastType;
  message: string;
  method: string;
  path: string;
  status?: number;
  timestamp: number;
};

export function emitMutationToast(
  detail: Omit<MutationToastDetail, "timestamp">,
): void {
  if (typeof window === "undefined") return;
  const payload: MutationToastDetail = {
    ...detail,
    timestamp: Date.now(),
  };
  window.dispatchEvent(
    new CustomEvent<MutationToastDetail>(MUTATION_TOAST_EVENT, {
      detail: payload,
    }),
  );
}

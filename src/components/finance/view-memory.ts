import type { TableSlug } from "./table-tabs";

/**
 * What the month screen remembers while you move between months. Changing month is a navigation that
 * mounts the screen again, so component state alone would reset the selected table and the list filters.
 * This lives at module level (the client bundle stays loaded across navigations) and is only written from
 * the browser, never while rendering, so nothing leaks between requests on the server.
 */
export interface ListFilters {
  query: string;
  category: string;
  quem: string;
}

const NO_FILTERS: ListFilters = { query: "", category: "", quem: "" };

let rememberedTab: TableSlug | null = null;
const rememberedFilters = new Map<string, ListFilters>();

export const readTab = (): TableSlug | null => rememberedTab;

export function rememberTab(tab: TableSlug): void {
  rememberedTab = tab;
}

export const readFilters = (listKey: string | undefined): ListFilters => (listKey && rememberedFilters.get(listKey)) || NO_FILTERS;

export function rememberFilters(listKey: string, filters: ListFilters): void {
  rememberedFilters.set(listKey, filters);
}

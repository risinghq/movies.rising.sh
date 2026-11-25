import { ref } from "vue";
import type { MediaSearchCandidate } from "@/shared/tracking";

export type LocalResult = {
  id: string;
  title: string;
  mediaType: "movie" | "show";
  posterPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  slug?: string | null;
  inLibrary: boolean;
};

export type RemoteResult = MediaSearchCandidate & { inLibrary: boolean };

export type PersonResult = {
  tmdbId: number;
  name: string;
  profilePath: string | null;
  knownForDepartment: string | null;
  knownFor: string[];
  slug: string;
};

type SearchResponse = {
  error?: string;
  remoteEnabled?: boolean;
  local?: LocalResult[];
  remote?: RemoteResult[];
  people?: PersonResult[];
};

export function useMediaSearch(options?: { limit?: number }) {
  const limit = options?.limit ?? 12;
  const query = ref("");
  const loading = ref(false);
  const error = ref("");
  const local = ref<LocalResult[]>([]);
  const remote = ref<RemoteResult[]>([]);
  const people = ref<PersonResult[]>([]);
  const remoteEnabled = ref(false);
  const hasSearched = ref(false);

  function reset() {
    local.value = [];
    remote.value = [];
    people.value = [];
  }

  async function run() {
    const q = query.value.trim();
    if (!q) return;

    error.value = "";
    hasSearched.value = true;
    loading.value = true;
    reset();

    try {
      const res = await fetch(`/api/media/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      const payload = (await res.json()) as SearchResponse;
      if (!res.ok) throw new Error(payload.error ?? "search failed");

      remoteEnabled.value = Boolean(payload.remoteEnabled);
      local.value = payload.local ?? [];
      remote.value = payload.remote ?? [];
      people.value = payload.people ?? [];
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : "search failed";
    } finally {
      loading.value = false;
    }
  }

  function clear() {
    query.value = "";
    reset();
    hasSearched.value = false;
    error.value = "";
  }

  return { query, loading, error, local, remote, people, remoteEnabled, hasSearched, run, clear };
}

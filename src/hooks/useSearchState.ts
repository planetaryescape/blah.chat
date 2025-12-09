import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useDebounce } from "./useDebounce";

export function useSearchState() {
  // Search query
  const [queryParam, setQueryParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const debouncedQuery = useDebounce(queryParam, 350);

  // Pagination
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  return {
    queryParam,
    setQueryParam,
    debouncedQuery,
    page,
    setPage,
  };
}

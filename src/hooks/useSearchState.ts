import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useDebounceValue } from "usehooks-ts";

export function useSearchState() {
  // Search query
  const [queryParam, setQueryParam] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [debouncedQuery] = useDebounceValue(queryParam, 350);

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

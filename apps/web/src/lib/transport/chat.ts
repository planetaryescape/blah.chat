export interface PaginatedItems<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
}

export function fromPaginatedConversations<T>(items: T[]): PaginatedItems<T> {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: items.length,
      total: items.length,
      hasNext: false,
    },
  };
}

export function fromHttpConversations<T>(data: {
  items: T[];
  total: number;
}): PaginatedItems<T> {
  return {
    items: data.items,
    pagination: {
      page: 1,
      pageSize: data.items.length,
      total: data.total,
      hasNext: false,
    },
  };
}

export function fromPaginatedMessages<T>(
  items: T[],
  hasNext: boolean,
): PaginatedItems<T> {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: items.length,
      total: items.length,
      hasNext,
    },
  };
}

export function fromHttpMessages<T>(items: T[]): PaginatedItems<T> {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: items.length,
      total: items.length,
      hasNext: false,
    },
  };
}

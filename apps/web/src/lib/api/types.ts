export type ApiResponse<T> = {
  status: "success" | "error";
  sys: {
    entity: string;
    id?: string;
    timestamps?: {
      created?: string;
      updated?: string;
      retrieved?: string;
    };
    async?: boolean;
  };
  data?: T;
  error?: string | { message: string; code?: string; details?: unknown };
};

export type PaginationParams = {
  page: number;
  pageSize: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

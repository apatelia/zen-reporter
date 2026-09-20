import { useState } from 'react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function usePagination(length: number, initialPageSize: number = 25) {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  const changePageSize = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  return { pageSize, changePageSize, setPage, currentPage, totalPages, start };
}

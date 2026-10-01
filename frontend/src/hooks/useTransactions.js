import { useState, useEffect, useCallback } from "react";
import {
  fetchTransactions,
  fetchSummary,
  addTransaction,
  editTransaction,
  removeTransaction,
} from "../api/transactionApi";

export function useTransactions(initialFilters = {}) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ limit: 10, ...initialFilters });

  const load = useCallback(async (overrideFilters) => {
    setLoading(true);
    try {
      const params = overrideFilters ?? filters;
      const res = await fetchTransactions(params);
      if (res.data?.success) {
        setTransactions(res.data.data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
        setCurrentPage(res.data.currentPage);
      }
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadSummary = useCallback(async (params) => {
    try {
      const res = await fetchSummary(params);
      if (res.data?.success) setSummary(res.data.data);
    } catch (err) {
      console.error("Failed to load summary:", err);
    }
  }, []);

  const create = async (data) => {
    const res = await addTransaction(data);
    return res.data;
  };

  const update = async (id, data) => {
    const res = await editTransaction(id, data);
    return res.data;
  };

  const remove = async (id) => {
    const res = await removeTransaction(id);
    return res.data;
  };

  const applyFilters = (newFilters) => {
    const merged = { ...filters, ...newFilters, page: 1 };
    setFilters(merged);
  };

  const goToPage = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  useEffect(() => {
    load();
  }, [load]);

  return {
    transactions,
    summary,
    loading,
    total,
    totalPages,
    currentPage,
    filters,
    load,
    loadSummary,
    create,
    update,
    remove,
    applyFilters,
    goToPage,
  };
}

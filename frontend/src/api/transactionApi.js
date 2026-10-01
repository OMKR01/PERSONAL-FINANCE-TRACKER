import { apiClient } from "./apiClient";

export const fetchTransactions = (params) =>
  apiClient.get("/transactions", { params });

export const fetchSummary = (params) =>
  apiClient.get("/transactions/summary", { params });

export const addTransaction = (data) =>
  apiClient.post("/transactions", data);

export const editTransaction = (id, data) =>
  apiClient.put(`/transactions/${id}`, data);

export const removeTransaction = (id) =>
  apiClient.delete(`/transactions/${id}`);

export const bulkImportTransactions = (transactions) =>
  apiClient.post("/transactions/import", { transactions });

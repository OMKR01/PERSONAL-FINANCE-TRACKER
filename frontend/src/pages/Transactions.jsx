import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import {
  fetchTransactions,
  addTransaction,
  editTransaction,
  removeTransaction,
} from "../api/transactionApi";
import { useAuth } from "../hooks/useAuth";
import TransactionModal from "../components/ui/TransactionModal";

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", INR: "₹", GBP: "£" };

const ALL_CATEGORIES = [
  "Salary","Freelance","Investments",
  "Housing","Food","Transport","Utilities","Entertainment","Health","Other",
];

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function SkeletonRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i}>
      {[40, 20, 20, 20, 10].map((w, j) => (
        <td key={j} style={{ padding: "14px 24px" }}>
          <div className="skeleton-cell" style={{ width: `${w}%` }} />
        </td>
      ))}
    </tr>
  ));
}

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`toast toast--${type}`}>
      <CheckCircle2 size={16} className={`toast__icon--${type}`} />
      {message}
    </div>
  );
}

export default function Transactions() {
  const { user } = useAuth();
  const sym = CURRENCY_SYMBOLS[user?.currency] || "$";

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  // Modal state
  const [modalTx, setModalTx] = useState(null); // null=closed, false=add, {...}=edit
  const [toast, setToast] = useState(null);

  const PAGE_SIZE = 10;

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (typeFilter)     params.type = typeFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (startDate)      params.startDate = startDate;
      if (endDate)        params.endDate = endDate;
      // Note: search is client-filtered since backend doesn't have text search yet

      const res = await fetchTransactions(params);
      if (res.data?.success) {
        let data = res.data.data;
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase();
          data = data.filter(
            (tx) =>
              tx.title.toLowerCase().includes(q) ||
              tx.category.toLowerCase().includes(q) ||
              (tx.notes && tx.notes.toLowerCase().includes(q))
          );
        }
        setTransactions(data);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
        setCurrentPage(res.data.currentPage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter, startDate, endDate, debouncedSearch]);

  useEffect(() => { load(1); }, [load]);

  const handleSave = async (data, id) => {
    if (id) {
      await editTransaction(id, data);
      setToast({ message: "Transaction updated successfully.", type: "success" });
    } else {
      await addTransaction(data);
      setToast({ message: "Transaction added successfully.", type: "success" });
    }
    setModalTx(null);
    load(currentPage);
  };

  const handleDelete = async (tx) => {
    if (!window.confirm(`Delete "${tx.title}"?`)) return;
    try {
      await removeTransaction(tx._id);
      setToast({ message: "Transaction deleted.", type: "success" });
      load(currentPage);
    } catch {
      setToast({ message: "Failed to delete transaction.", type: "error" });
    }
  };

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("");
    setCategoryFilter("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = typeFilter || categoryFilter || startDate || endDate || search;

  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  const visiblePages = pageNumbers.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  return (
    <div>
      {/* ── Page Header ─────────────────────────────── */}
      <div className="page-header">
        <div>
          <p className="page-header__greeting">Finance Hub</p>
          <h1 className="page-header__title">
            All <span>Transactions.</span>
          </h1>
          <p className="page-header__subtitle">
            {total > 0 ? `${total} transaction${total !== 1 ? "s" : ""} recorded` : "No transactions yet"}
          </p>
        </div>
        <button
          id="add-transaction-btn"
          onClick={() => setModalTx(false)}
          className="btn btn--ghost"
        >
          <Plus size={14} />
          Add Transaction
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────────── */}
      <div style={{ marginBottom: "24px" }}>
        <div className="filter-bar">
          {/* Search */}
          <div className="filter-bar__search" style={{ flex: "1 1 240px" }}>
            <Search size={14} className="filter-bar__search-icon" />
            <input
              id="tx-search"
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "36px" }}
            />
          </div>

          {/* Type */}
          <select
            id="filter-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="form-select filter-bar__select"
            style={{ width: "auto", minWidth: "130px" }}
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          {/* Category */}
          <select
            id="filter-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-select filter-bar__select"
            style={{ width: "auto", minWidth: "140px" }}
          >
            <option value="">All Categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Advanced filters toggle */}
          <button
            id="toggle-filters-btn"
            onClick={() => setShowFilters((v) => !v)}
            className="btn btn--ghost"
            style={{ padding: "9px 14px", gap: "6px" }}
          >
            <SlidersHorizontal size={14} />
            {showFilters ? "Hide" : "Date Range"}
          </button>

          {/* Clear */}
          {hasActiveFilters && (
            <button
              id="clear-filters-btn"
              onClick={resetFilters}
              className="btn btn--danger"
              style={{ padding: "9px 14px", gap: "6px" }}
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>

        {/* Date Range (collapsed by default) */}
        {showFilters && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              padding: "16px",
              background: "var(--surface-elevated)",
              border: "1px solid rgba(134,143,151,0.12)",
              borderRadius: "var(--radius-small)",
              animation: "fadeIn 0.15s ease",
            }}
          >
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">From</label>
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">To</label>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Transactions Table ───────────────────────── */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div className="empty-state__icon">🔍</div>
                      <p className="empty-state__title">No transactions found.</p>
                      <p className="empty-state__body">
                        {hasActiveFilters
                          ? "Try adjusting or clearing the filters."
                          : "Click \"Add Transaction\" to record your first entry."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>
                      <p className="tx-title">{tx.title}</p>
                      {tx.notes && <p className="tx-notes">{tx.notes}</p>}
                    </td>
                    <td>
                      <span className={`badge badge--${tx.type}`}>{tx.category}</span>
                    </td>
                    <td>
                      <span className={`badge badge--${tx.type}`} style={{ textTransform: "capitalize" }}>
                        {tx.type}
                      </span>
                    </td>
                    <td>
                      <span className="tx-date">
                        {new Date(tx.date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </td>
                    <td>
                      <span className={`tx-amount tx-amount--${tx.type}`}>
                        {tx.type === "income" ? "+" : "-"}{sym}{tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          id={`edit-${tx._id}`}
                          onClick={() => setModalTx(tx)}
                          className="btn btn--edit"
                          title="Edit transaction"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          id={`delete-${tx._id}`}
                          onClick={() => handleDelete(tx)}
                          className="btn btn--danger"
                          title="Delete transaction"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="pagination">
            <span className="pagination__info">
              Page {currentPage} of {totalPages} &middot; {total} entries
            </span>
            <div className="pagination__controls">
              <button
                id="page-prev-btn"
                onClick={() => load(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination__btn"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>

              {visiblePages.map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span key={`gap-${p}`} style={{ color: "var(--color-fey-graphite)", fontSize: 13, padding: "0 4px" }}>…</span>
                  )}
                  <button
                    key={p}
                    id={`page-${p}-btn`}
                    onClick={() => load(p)}
                    className={`pagination__btn${currentPage === p ? " active" : ""}`}
                  >
                    {p}
                  </button>
                </>
              ))}

              <button
                id="page-next-btn"
                onClick={() => load(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination__btn"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────── */}
      {modalTx !== null && (
        <TransactionModal
          tx={modalTx || null}
          currency={user?.currency}
          onSave={handleSave}
          onClose={() => setModalTx(null)}
        />
      )}

      {/* ── Toast ────────────────────────────────────── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </div>
  );
}

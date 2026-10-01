import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Percent,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import {
  fetchSummary,
  fetchTransactions,
  addTransaction,
  editTransaction,
  removeTransaction,
} from "../api/transactionApi";
import { useAuth } from "../hooks/useAuth";
import TransactionModal from "../components/ui/TransactionModal";

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", INR: "₹", GBP: "£" };
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Category colors mapping for horizontal bar charts
const CAT_COLORS = {
  "Food & Dining": "#ff7c78",
  Shopping: "#b388ff",
  Housing: "#479ffa",
  Utilities: "#ffb74d",
  Transportation: "#4ebe96",
  Entertainment: "#f48fb1",
  Healthcare: "#80cbc4",
  Education: "#ce93d8",
  Salary: "#4ebe96",
  Investments: "#479ffa",
  Freelance: "#ffb74d",
  Other: "#868f97",
};

// Build 12-month trend array from API monthlyTrend
function buildMonthlyData(monthlyTrend) {
  const map = {};
  (monthlyTrend || []).forEach(({ _id, totalAmount }) => {
    const m = _id.month - 1;
    if (!map[m]) map[m] = { income: 0, expense: 0 };
    map[m][_id.type] = totalAmount;
  });
  return Array.from({ length: 12 }, (_, i) => ({
    name: MONTH_SHORT[i],
    fullName: MONTH_NAMES[i],
    monthNum: i + 1,
    income: map[i]?.income || 0,
    expense: map[i]?.expense || 0,
    net: (map[i]?.income || 0) - (map[i]?.expense || 0),
  }));
}

function MiniSparkline({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height={52}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#sg-${color.replace("#", "")})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`toast toast--${type}`}>
      {type === "success"
        ? <CheckCircle2 size={16} className="toast__icon--success" />
        : <TrendingUp size={16} className="toast__icon--error" />}
      {message}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const sym = CURRENCY_SYMBOLS[user?.currency] || "$";

  const currentDate = new Date();
  const [periodMode, setPeriodMode] = useState("monthly"); // "monthly" | "yearly"
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1); // 1-12

  const [summary, setSummary] = useState(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTx, setModalTx] = useState(null); // null = closed, false = add, {...} = edit
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const summaryParams = { year: selectedYear };
      if (periodMode === "monthly") {
        summaryParams.month = selectedMonth;
      }

      const [sumRes, txRes] = await Promise.all([
        fetchSummary(summaryParams),
        fetchTransactions({ page: 1, limit: 6, sort: "-date" }),
      ]);

      if (sumRes.data?.success) {
        setSummary(sumRes.data.data.totals);
        setCategoryBreakdown(sumRes.data.data.categoryBreakdown || []);
        setMonthlyData(buildMonthlyData(sumRes.data.data.monthlyTrend));
      }
      if (txRes.data?.success) setRecentTx(txRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [periodMode, selectedYear, selectedMonth]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrevPeriod = () => {
    if (periodMode === "monthly") {
      if (selectedMonth === 1) {
        setSelectedMonth(12);
        setSelectedYear((y) => y - 1);
      } else {
        setSelectedMonth((m) => m - 1);
      }
    } else {
      setSelectedYear((y) => y - 1);
    }
  };

  const handleNextPeriod = () => {
    if (periodMode === "monthly") {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear((y) => y + 1);
      } else {
        setSelectedMonth((m) => m + 1);
      }
    } else {
      setSelectedYear((y) => y + 1);
    }
  };

  const handleSave = async (data, id) => {
    if (id) {
      await editTransaction(id, data);
      setToast({ message: "Transaction updated.", type: "success" });
    } else {
      await addTransaction(data);
      setToast({ message: "Transaction added.", type: "success" });
    }
    setModalTx(null);
    load();
  };

  const handleDelete = async (tx) => {
    if (!window.confirm(`Delete "${tx.title}"?`)) return;
    try {
      await removeTransaction(tx._id);
      setToast({ message: "Transaction deleted.", type: "success" });
      load();
    } catch {
      setToast({ message: "Failed to delete.", type: "error" });
    }
  };

  const income = summary?.income ?? 0;
  const expense = summary?.expense ?? 0;
  const net = summary?.netSavings ?? 0;
  const rate = summary?.savingsRate ?? 0;

  // Build sparkline series
  const incomeSparkline = monthlyData.map((d) => ({ value: d.income }));
  const expenseSparkline = monthlyData.map((d) => ({ value: d.expense }));
  const netSparkline = monthlyData.map((d) => ({ value: Math.max(0, d.net) }));

  // Find max category spend for bar percentage calculation
  const maxCatAmount = categoryBreakdown.reduce((max, c) => Math.max(max, c.totalAmount), 0);

  // Period title text
  const periodLabelText = periodMode === "monthly"
    ? `${MONTH_SHORT[selectedMonth - 1]} ${selectedYear}`
    : `${selectedYear}`;

  return (
    <div>
      {/* ── Page Header & Dashboard Controls ──────────────────── */}
      <div className="page-header" style={{ marginBottom: "var(--spacing-32)" }}>
        <div>
          <p className="page-header__greeting">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="page-header__title">
            Welcome back, <span>{user?.name}.</span>
          </h1>
          <div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span className={`period-badge period-badge--${periodMode}`}>
              <Calendar size={12} />
              {periodMode === "monthly" ? `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` : `${selectedYear} Annual Overview`}
            </span>
          </div>
        </div>

        <div className="dashboard-controls">
          {/* Monthly | Yearly Pill Toggle */}
          <div className="period-toggle">
            <button
              className={`period-toggle__btn ${periodMode === "monthly" ? "active" : ""}`}
              onClick={() => setPeriodMode("monthly")}
            >
              Monthly
            </button>
            <button
              className={`period-toggle__btn ${periodMode === "yearly" ? "active" : ""}`}
              onClick={() => setPeriodMode("yearly")}
            >
              Yearly
            </button>
          </div>

          {/* Navigator arrows ‹ Sep 2026 › */}
          <div className="period-nav">
            <button className="period-nav__btn" onClick={handlePrevPeriod} title="Previous Period">
              <ChevronLeft size={16} />
            </button>
            <span className={`period-nav__label ${periodMode === "yearly" ? "period-nav__label--sm" : ""}`}>
              {periodLabelText}
            </span>
            <button className="period-nav__btn" onClick={handleNextPeriod} title="Next Period">
              <ChevronRight size={16} />
            </button>
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
      </div>

      {loading ? (
        <div className="loader"><div className="loader__spinner" /></div>
      ) : (
        <>
          {/* ── Metric Cards ─────────────────────────────────────── */}
          <div className="stat-grid">
            {/* Net Balance */}
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Net Savings</span>
                <div className="stat-card__icon stat-card__icon--signal">
                  <Wallet size={15} />
                </div>
              </div>
              <div className={`stat-card__value${net < 0 ? " stat-card__value--loss" : ""}`}>
                {net < 0 ? "-" : ""}{sym}{Math.abs(net).toLocaleString()}
              </div>
              <div style={{ marginTop: "12px" }}>
                <MiniSparkline data={netSparkline} color={net >= 0 ? "#479ffa" : "#f06070"} />
              </div>
              <p style={{ fontSize: "11px", color: "var(--color-fey-graphite)", marginTop: "4px" }}>
                {periodMode === "monthly" ? `${MONTH_SHORT[selectedMonth - 1]} ${selectedYear}` : `${selectedYear} Year-to-Date`}
              </p>
            </div>

            {/* Total Inflow */}
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Total Income</span>
                <div className="stat-card__icon stat-card__icon--growth">
                  <ArrowUpRight size={15} />
                </div>
              </div>
              <div className="stat-card__value stat-card__value--growth">
                +{sym}{income.toLocaleString()}
              </div>
              <div style={{ marginTop: "12px" }}>
                <MiniSparkline data={incomeSparkline} color="#4ebe96" />
              </div>
              <p style={{ fontSize: "11px", color: "var(--color-fey-graphite)", marginTop: "4px" }}>
                Inflow for selected period
              </p>
            </div>

            {/* Total Outflow */}
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Total Expenses</span>
                <div className="stat-card__icon stat-card__icon--loss">
                  <ArrowDownRight size={15} />
                </div>
              </div>
              <div className="stat-card__value stat-card__value--loss">
                -{sym}{expense.toLocaleString()}
              </div>
              <div style={{ marginTop: "12px" }}>
                <MiniSparkline data={expenseSparkline} color="#f06070" />
              </div>
              <p style={{ fontSize: "11px", color: "var(--color-fey-graphite)", marginTop: "4px" }}>
                Outflow for selected period
              </p>
            </div>

            {/* Savings Rate */}
            <div className="stat-card">
              <div className="stat-card__header">
                <span className="stat-card__label">Savings Rate</span>
                <div className="stat-card__icon stat-card__icon--ember">
                  <Percent size={15} />
                </div>
              </div>
              <div className="stat-card__value">{rate}%</div>
              {/* Progress Bar */}
              <div style={{
                marginTop: "20px",
                height: "4px",
                background: "rgba(134,143,151,0.12)",
                borderRadius: "2px",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(0, rate))}%`,
                  background: rate >= 20
                    ? "var(--color-fey-growth)"
                    : rate >= 10
                    ? "var(--color-fey-ember)"
                    : "var(--color-fey-loss)",
                  borderRadius: "2px",
                  transition: "width 0.6s ease",
                }} />
              </div>
              <p style={{ fontSize: "11px", color: "var(--color-fey-graphite)", marginTop: "8px" }}>
                {rate >= 20 ? "On track — great job!" : rate >= 10 ? "Getting there." : "Try to save more."}
              </p>
            </div>
          </div>

          {/* ── Period View Breakdowns (Monthly Horizontal Bars or Yearly 12-Month Matrix) ── */}
          {periodMode === "monthly" ? (
            <div className="monthly-breakdown-grid">
              {/* Category Spending Breakdown */}
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card__header">
                  <h3 className="card__title" style={{ fontSize: "14px" }}>
                    Category Breakdown — {MONTH_SHORT[selectedMonth - 1]} {selectedYear}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--color-fey-graphite)" }}>
                    {categoryBreakdown.length} categories
                  </span>
                </div>
                {categoryBreakdown.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--color-fey-graphite)", padding: "16px 0", textAlign: "center" }}>
                    No expenses recorded in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
                  </p>
                ) : (
                  <div className="hbar-list">
                    {categoryBreakdown.map((cat) => {
                      const pct = maxCatAmount > 0 ? (cat.totalAmount / maxCatAmount) * 100 : 0;
                      const catColor = CAT_COLORS[cat._id] || CAT_COLORS.Other;
                      return (
                        <div key={cat._id} className="hbar-item">
                          <div className="hbar-item__top">
                            <span className="hbar-item__label">{cat._id} ({cat.count})</span>
                            <span className="hbar-item__amount">{sym}{cat.totalAmount.toLocaleString()}</span>
                          </div>
                          <div className="hbar-item__track">
                            <div
                              className="hbar-item__fill"
                              style={{ width: `${pct}%`, background: catColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Monthly Overview Card */}
              <div className="card" style={{ marginBottom: 0 }}>
                <div className="card__header">
                  <h3 className="card__title" style={{ fontSize: "14px" }}>
                    Month Performance
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--color-fey-graphite)" }}>
                    Summary
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(134,143,151,0.08)", paddingBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "var(--color-fey-mist)" }}>Total Income</span>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-fey-growth)" }}>
                      +{sym}{income.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(134,143,151,0.08)", paddingBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "var(--color-fey-mist)" }}>Total Expenses</span>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-fey-loss)" }}>
                      -{sym}{expense.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(134,143,151,0.08)", paddingBottom: "12px" }}>
                    <span style={{ fontSize: "13px", color: "var(--color-fey-mist)" }}>Net Cash Flow</span>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: net >= 0 ? "var(--color-fey-growth)" : "var(--color-fey-loss)" }}>
                      {net >= 0 ? "+" : ""}{sym}{net.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "var(--color-fey-mist)" }}>Savings Rate</span>
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-fey-signal)" }}>
                      {rate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Yearly Mode — 12-Month Grid Matrix */
            <div className="card" style={{ marginBottom: "var(--spacing-24)" }}>
              <div className="card__header">
                <h3 className="card__title" style={{ fontSize: "14px" }}>
                  12-Month Net Performance Matrix — {selectedYear}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--color-fey-graphite)" }}>
                  Click a month to view details
                </span>
              </div>
              <div className="month-matrix">
                {monthlyData.map((m) => {
                  const isActive = selectedMonth === m.monthNum;
                  const isPos = m.net > 0;
                  const isNeg = m.net < 0;
                  return (
                    <div
                      key={m.name}
                      className={`month-cell ${isActive ? "is-active" : ""}`}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedMonth(m.monthNum);
                        setPeriodMode("monthly");
                      }}
                    >
                      <div className="month-cell__name">{m.name}</div>
                      <div className={`month-cell__net ${isPos ? "month-cell__net--pos" : isNeg ? "month-cell__net--neg" : "month-cell__net--zero"}`}>
                        {m.net === 0 ? `${sym}0` : `${m.net > 0 ? "+" : ""}${sym}${m.net.toLocaleString()}`}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--color-fey-graphite)", marginTop: "4px" }}>
                        In: {sym}{m.income.toLocaleString()} | Out: {sym}{m.expense.toLocaleString()}
                      </div>
                      <div
                        className="month-cell__bar"
                        style={{
                          background: isPos ? "var(--color-fey-growth)" : isNeg ? "var(--color-fey-loss)" : "rgba(134,143,151,0.2)",
                          width: `${Math.min(100, Math.max(10, (Math.abs(m.net) / Math.max(1, income || 1)) * 100))}%`
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Recent Transactions Table ─────────────────────────── */}
          <div className="card">
            <div className="card__header">
              <div>
                <h2 className="card__title">Recent Transactions</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="badge badge--default" style={{ fontSize: "10px" }}>
                  Latest Entries
                </span>
                <Link
                  to="/transactions"
                  style={{
                    fontSize: "12px",
                    color: "var(--color-fey-signal)",
                    fontWeight: 500,
                    textDecoration: "none",
                    transition: "opacity 0.15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.opacity = 0.75)}
                  onMouseOut={(e) => (e.currentTarget.style.opacity = 1)}
                >
                  View all →
                </Link>
              </div>
            </div>

            {recentTx.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">💳</div>
                <p className="empty-state__title">No transactions yet.</p>
                <p className="empty-state__body">
                  Click &ldquo;Add Transaction&rdquo; to record your first entry.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTx.map((tx) => (
                      <tr key={tx._id}>
                        <td>
                          <p className="tx-title">{tx.title}</p>
                          {tx.notes && <p className="tx-notes">{tx.notes}</p>}
                        </td>
                        <td>
                          <span className={`badge badge--${tx.type}`}>{tx.category}</span>
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
                              title="Edit"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              id={`delete-${tx._id}`}
                              onClick={() => handleDelete(tx)}
                              className="btn btn--danger"
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modal ─────────────────────────────────────────────── */}
      {modalTx !== null && (
        <TransactionModal
          tx={modalTx || null}
          currency={user?.currency}
          onSave={handleSave}
          onClose={() => setModalTx(null)}
        />
      )}

      {/* ── Toast ─────────────────────────────────────────────── */}
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

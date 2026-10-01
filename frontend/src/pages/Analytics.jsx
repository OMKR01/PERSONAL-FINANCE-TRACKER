import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { fetchSummary } from "../api/transactionApi";
import { useAuth } from "../hooks/useAuth";
import { TrendingUp } from "lucide-react";

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", INR: "₹", GBP: "£" };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Fey palette for category slices
const CAT_COLORS = [
  "#479ffa",  // signal blue
  "#4ebe96",  // growth green
  "#ffa16c",  // ember
  "#f06070",  // loss red
  "#b6d6ff",  // frost
  "#d6fe51",  // volt
  "#cccccc",  // mist
  "#868f97",  // graphite
  "#79e2c0",  // teal
  "#ffcc70",  // warm yellow
];

function buildMonthlyData(monthlyTrend) {
  const map = {};
  (monthlyTrend || []).forEach(({ _id, totalAmount }) => {
    const m = _id.month - 1;
    if (!map[m]) map[m] = { income: 0, expense: 0 };
    map[m][_id.type] = totalAmount;
  });
  return MONTHS.map((name, i) => ({
    name,
    Income: map[i]?.income || 0,
    Expense: map[i]?.expense || 0,
    Net: (map[i]?.income || 0) - (map[i]?.expense || 0),
  }));
}

function buildCategoryData(categoryBreakdown) {
  return (categoryBreakdown || []).map((c, i) => ({
    name: c._id,
    value: c.totalAmount,
    count: c.count,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }));
}

// Custom tooltip for bar chart
function BarTooltip({ active, payload, label, sym }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="chart-tooltip__row" style={{ marginBottom: 4 }}>
          <span className="chart-tooltip__dot" style={{ background: p.color }} />
          <span style={{ color: "var(--color-fey-graphite)", fontSize: 12, marginRight: 6 }}>
            {p.dataKey}:
          </span>
          <span style={{ color: p.color }}>
            {sym}{p.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// Custom tooltip for pie
function PieTooltip({ active, payload, sym }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{d.name}</p>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__dot" style={{ background: d.payload.color }} />
        <span style={{ color: d.payload.color }}>{sym}{d.value.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const sym = CURRENCY_SYMBOLS[user?.currency] || "$";

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSummary({ year });
      if (res.data?.success) setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="loader"><div className="loader__spinner" /></div>;
  }

  const totals = data?.totals || { income: 0, expense: 0, netSavings: 0, savingsRate: 0 };
  const monthlyChartData = buildMonthlyData(data?.monthlyTrend);
  const categoryData = buildCategoryData(data?.categoryBreakdown);
  const totalExpense = totals.expense || 1; // avoid divide-by-zero
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div>
      {/* ── Page Header ──────────────────────────────── */}
      <div className="page-header">
        <div>
          <p className="page-header__greeting">Finance Hub</p>
          <h1 className="page-header__title">
            Analytics &amp; <span>Insights.</span>
          </h1>
          <p className="page-header__subtitle">
            Visual breakdown of your {year} financial activity.
          </p>
        </div>
        {/* Year selector */}
        <div className="year-tabs">
          {yearOptions.map((y) => (
            <button
              key={y}
              id={`year-tab-${y}`}
              onClick={() => setYear(y)}
              className={`year-tab${year === y ? " active" : ""}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* ── Insight Summary Cards ────────────────────── */}
      <div className="insight-grid">
        <div className="insight-card">
          <p className="insight-card__label">Total Income</p>
          <p className="insight-card__value insight-card__value--growth">
            {sym}{totals.income.toLocaleString()}
          </p>
          <p className="insight-card__sub">Earned in {year}</p>
        </div>
        <div className="insight-card">
          <p className="insight-card__label">Total Expenses</p>
          <p className="insight-card__value insight-card__value--loss">
            {sym}{totals.expense.toLocaleString()}
          </p>
          <p className="insight-card__sub">Spent in {year}</p>
        </div>
        <div className="insight-card">
          <p className="insight-card__label">Net Savings</p>
          <p className={`insight-card__value${totals.netSavings < 0 ? " insight-card__value--loss" : ""}`}>
            {totals.netSavings < 0 ? "-" : ""}{sym}{Math.abs(totals.netSavings).toLocaleString()}
          </p>
          <p className="insight-card__sub">{totals.savingsRate}% savings rate</p>
        </div>
      </div>

      {/* ── Chart Row 1: Monthly Bar + Category Donut ─── */}
      <div className="chart-grid" style={{ marginBottom: "24px" }}>
        {/* Monthly Income vs Expense */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <p className="chart-card__title">Income vs Expenses</p>
              <p className="chart-card__subtitle">Monthly comparison for {year}</p>
            </div>
          </div>
          <div className="chart-card__body">
            {monthlyChartData.every((d) => d.Income === 0 && d.Expense === 0) ? (
              <div className="no-data">
                <TrendingUp size={28} style={{ opacity: 0.2 }} />
                <span>No data for {year}</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={monthlyChartData}
                  barGap={4}
                  margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(134,143,151,0.1)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#868f97" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#868f97" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip content={<BarTooltip sym={sym} />} cursor={{ fill: "rgba(134,143,151,0.05)" }} />
                  <Bar dataKey="Income" fill="#4ebe96" radius={[3, 3, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Expense" fill="#f06070" radius={[3, 3, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Donut */}
        <div className="chart-card">
          <div className="chart-card__header">
            <div>
              <p className="chart-card__title">Expense Breakdown</p>
              <p className="chart-card__subtitle">By category</p>
            </div>
          </div>
          <div className="chart-card__body">
            {categoryData.length === 0 ? (
              <div className="no-data">
                <TrendingUp size={28} style={{ opacity: 0.2 }} />
                <span>No expense data</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip sym={sym} />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Category legend with progress bars */}
                <div className="cat-legend">
                  {categoryData.slice(0, 6).map((cat) => (
                    <div key={cat.name} className="cat-legend__item">
                      <div className="cat-legend__dot-label" style={{ flex: "0 0 120px" }}>
                        <span className="cat-legend__dot" style={{ background: cat.color }} />
                        <span style={{ fontSize: 12 }}>{cat.name}</span>
                      </div>
                      <div className="cat-legend__bar-wrap">
                        <div
                          className="cat-legend__bar"
                          style={{
                            width: `${((cat.value / totalExpense) * 100).toFixed(1)}%`,
                            background: cat.color,
                          }}
                        />
                      </div>
                      <span className="cat-legend__amount">
                        {sym}{cat.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Chart Row 2: Net Savings Line Chart ──────── */}
      <div className="chart-card">
        <div className="chart-card__header">
          <div>
            <p className="chart-card__title">Net Savings Trend</p>
            <p className="chart-card__subtitle">Monthly net (income − expenses) for {year}</p>
          </div>
        </div>
        <div className="chart-card__body">
          {monthlyChartData.every((d) => d.Net === 0) ? (
            <div className="no-data">
              <TrendingUp size={28} style={{ opacity: 0.2 }} />
              <span>No data for {year}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={monthlyChartData}
                margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#479ffa" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#479ffa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(134,143,151,0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#868f97" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#868f97" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip content={<BarTooltip sym={sym} />} cursor={{ stroke: "rgba(71,159,250,0.2)", strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="Net"
                  stroke="#479ffa"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#479ffa", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#479ffa", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

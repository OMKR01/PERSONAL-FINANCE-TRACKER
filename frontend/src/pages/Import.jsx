import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import {
  Upload,
  FileText,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  RefreshCw,
  Info,
} from "lucide-react";
import { bulkImportTransactions } from "../api/transactionApi";
import { useAuth } from "../hooks/useAuth";

// ─── Auto-categorisation engine ─────────────────────────────
const CATEGORY_RULES = [
  { keywords: ["salary","payroll","pay credit","employer","ctc","hike","stipend"], category: "Salary", type: "income" },
  { keywords: ["freelance","invoice","client payment","project payment","consulting","upwork","fiverr","toptal"], category: "Freelance", type: "income" },
  { keywords: ["dividend","mutual fund","redemption","nse","bse","stock","share","investment return","fd interest","interest credit"], category: "Investments", type: "income" },
  { keywords: ["rental income","rent received","tenant","deposit received","flat"], category: "Investments", type: "income" },
  { keywords: ["advance credit","bonus","incentive","reimbursement"], category: "Salary", type: "income" },

  { keywords: ["rent","home loan","emi","housing","pg rent","dormitory","maintenance"], category: "Housing", type: "expense" },
  { keywords: ["swiggy","zomato","dominos","mcd","mcdonalds","kfc","pizza","blinkit","bigbasket","grocery","dmart","market","restaurant","cafe","food","dunzo","zepto"], category: "Food", type: "expense" },
  { keywords: ["uber","ola","rapido","metro","bus","irctc","train","flight","indigo","spicejet","air","cab","auto","fuel","petrol","diesel"], category: "Transport", type: "expense" },
  { keywords: ["electricity","bses","tata power","bescom","msedcl","broadband","jio","airtel","bsnl","phone bill","mobile","wifi","internet","water bill","gas","lpg","utility","mcd","property tax"], category: "Utilities", type: "expense" },
  { keywords: ["netflix","prime","spotify","bookmyshow","pvr","inox","hotstar","youtube premium","gaming","playstation","xbox","steam","movie","concert","event","entertainment"], category: "Entertainment", type: "expense" },
  { keywords: ["hospital","apollo","fortis","max hospital","pharmacy","medic","doctor","clinic","health","lybrate","practo","1mg","cult fit","gym","yoga","fitness"], category: "Health", type: "expense" },
  { keywords: ["amazon","flipkart","myntra","nykaa","lenskart","ajio","meesho","snapdeal","sugar","shopping","clothes","clothing","footwear","electronics","mobile purchase","laptop","book","byjus","course"], category: "Other", type: "expense" },
  { keywords: ["credit card","hdfc card","sbi card","icici card","cc payment","card payment","axis bank"], category: "Other", type: "expense" },
];

function autoClassify(description) {
  const lower = (description || "").toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { category: rule.category, type: rule.type };
    }
  }
  return { category: "Other", type: "expense" }; // safe default
}

// Parse DD-MM-YYYY or YYYY-MM-DD or other common formats to ISO
function parseDate(rawDate) {
  if (!rawDate) return new Date().toISOString().split("T")[0];
  const str = rawDate.toString().trim();

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmy = str.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.split("T")[0];

  // Try JS Date parse
  const d = new Date(str);
  if (d && !isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return new Date().toISOString().split("T")[0];
}

// Parse amount — remove currency symbols, commas, and handle strings
function parseAmount(val) {
  if (val === undefined || val === null || val === "") return 0;
  const cleaned = val.toString().replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

const VALID_CATEGORIES = [
  "Salary","Freelance","Investments","Housing","Food",
  "Transport","Utilities","Entertainment","Health","Other",
];

const STEPS = ["Upload File", "Map Columns", "Review & Edit", "Done"];

// Sample download template
const SAMPLE_CSV_URL = "/sample_upi_statement.csv";

export default function Import() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);  // 0=upload, 1=map, 2=review, 3=done
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);        // raw parsed CSV rows
  const [headers, setHeaders] = useState([]);        // CSV column headers
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState("");
  const fileRef = useRef(null);

  // Column mapping
  const [colMap, setColMap] = useState({
    date: "",
    description: "",
    credit: "",
    debit: "",
    amount: "",      // unified amount col (optional — used when no credit/debit split)
    typeCol: "",     // optional column that directly says credit/debit
  });

  // Preview rows after processing
  const [preview, setPreview] = useState([]);

  // Import result
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);  // { imported, failed, errors, message }

  // ── Step 0: File upload ──────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.match(/\.(csv|CSV)$/)) {
      setParseError("Please upload a CSV file (.csv)");
      return;
    }
    setParseError("");
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setParseError("The file appears to be empty or could not be parsed.");
          return;
        }
        const cols = Object.keys(results.data[0]);
        setHeaders(cols);
        setRawRows(results.data);

        // Auto-detect common column names
        const find = (candidates) =>
          cols.find((c) => candidates.some((k) => c.toLowerCase().includes(k))) || "";

        const detected = {
          date:        find(["date","time","txn date","transaction date","value date"]),
          description: find(["description","narration","particular","remark","txn desc","merchant"]),
          credit:      find(["credit","credited","cr","deposit","received"]),
          debit:       find(["debit","debited","dr","withdrawal","paid"]),
          amount:      find(["amount","amt"]),
          typeCol:     find(["type","cr/dr","transaction type"]),
        };
        setColMap(detected);
        setStep(1);
      },
      error: (err) => {
        setParseError(`Parse error: ${err.message}`);
      },
    });
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── Step 1 → 2: Build preview from column mapping ────────
  const buildPreview = () => {
    const rows = rawRows.map((row, idx) => {
      const rawDesc  = row[colMap.description] || "";
      const rawDate  = row[colMap.date] || "";
      const rawCredit = colMap.credit ? parseAmount(row[colMap.credit]) : 0;
      const rawDebit  = colMap.debit  ? parseAmount(row[colMap.debit])  : 0;
      const rawAmt    = colMap.amount ? parseAmount(row[colMap.amount])  : 0;

      let amount = 0;
      let inferredType = "";

      if (rawCredit > 0 || rawDebit > 0) {
        // Split credit/debit columns
        if (rawCredit > 0 && rawDebit === 0) {
          amount = rawCredit;
          inferredType = "income";
        } else if (rawDebit > 0 && rawCredit === 0) {
          amount = rawDebit;
          inferredType = "expense";
        } else {
          // both filled — treat net
          amount = rawCredit > rawDebit ? rawCredit : rawDebit;
          inferredType = rawCredit > rawDebit ? "income" : "expense";
        }
      } else if (rawAmt > 0) {
        amount = rawAmt;
        // Check type column if exists
        const typeVal = (row[colMap.typeCol] || "").toLowerCase();
        if (typeVal.includes("cr") || typeVal.includes("credit") || typeVal.includes("in")) {
          inferredType = "income";
        } else {
          inferredType = "expense";
        }
      }

      // Skip rows with no amount
      if (!amount) return null;

      // Auto-categorise from description
      const classified = autoClassify(rawDesc);
      // Override type if we inferred it from columns
      const finalType = inferredType || classified.type;

      return {
        _idx: idx,
        title: rawDesc.substring(0, 80) || `Transaction ${idx + 1}`,
        amount,
        type: finalType,
        category: classified.category,
        date: parseDate(rawDate),
        notes: "",
        skip: false,
      };
    }).filter(Boolean);

    setPreview(rows);
    setStep(2);
  };

  const updatePreviewRow = (idx, field, value) => {
    setPreview((prev) =>
      prev.map((r) => (r._idx === idx ? { ...r, [field]: value } : r))
    );
  };

  const toggleSkip = (idx) => {
    setPreview((prev) =>
      prev.map((r) => (r._idx === idx ? { ...r, skip: !r.skip } : r))
    );
  };

  // ── Step 3: Import ────────────────────────────────────────
  const handleImport = async () => {
    const toImport = preview.filter((r) => !r.skip).map(({ title, amount, type, category, date, notes }) => ({
      title, amount, type, category, date, notes,
    }));

    if (toImport.length === 0) {
      alert("No transactions selected for import.");
      return;
    }

    setImporting(true);
    try {
      const res = await bulkImportTransactions(toImport);
      setResult(res.data);
      setStep(3);
    } catch (err) {
      setResult({
        success: false,
        imported: 0,
        failed: toImport.length,
        errors: [{ message: err.response?.data?.message || "Import failed. Please try again." }],
        message: "Import failed",
      });
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(0);
    setFileName("");
    setRawRows([]);
    setHeaders([]);
    setPreview([]);
    setResult(null);
    setParseError("");
    setColMap({ date:"", description:"", credit:"", debit:"", amount:"", typeCol:"" });
  };

  const activeCount = preview.filter((r) => !r.skip).length;

  return (
    <div>
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="page-header">
        <div>
          <p className="page-header__greeting">Finance Hub</p>
          <h1 className="page-header__title">
            Import <span>Transactions.</span>
          </h1>
          <p className="page-header__subtitle">
            Upload your bank or UPI statement CSV to bulk-import transactions.
          </p>
        </div>
        <a
          href={`/sample_upi_statement.csv`}
          download="sample_upi_statement.csv"
          className="btn btn--ghost"
          style={{ padding: "8px 20px", gap: "8px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
        >
          <Download size={14} />
          Download Sample CSV
        </a>
      </div>

      {/* ── Progress Steps ───────────────────────────────── */}
      <div className="import-steps" style={{ marginBottom: "32px" }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div className={`import-step${step === i ? " active" : step > i ? " done" : ""}`}>
              <span className="import-step__num">
                {step > i ? <CheckCircle2 size={12} /> : i + 1}
              </span>
              <span style={{ fontSize: "12px" }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="import-step__connector" />}
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* STEP 0 — Upload                                   */}
      {/* ══════════════════════════════════════════════════ */}
      {step === 0 && (
        <div>
          {/* Drop zone */}
          <div
            id="dropzone"
            className={`dropzone${dragOver ? " drag-over" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          >
            <span className="dropzone__icon">📂</span>
            <p className="dropzone__title">Drop your CSV file here</p>
            <p className="dropzone__sub">
              Supports bank statements, UPI history, Google Pay, PhonePe exports<br />
              or <span onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                browse to upload
              </span> &nbsp;·&nbsp; Max 500 rows per import
            </p>
            {fileName && (
              <div className="dropzone__file-info">
                <FileText size={13} /> {fileName}
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {parseError && (
            <div className="alert--error" style={{ marginTop: "16px" }}>
              <AlertCircle size={13} style={{ display: "inline", marginRight: "6px" }} />
              {parseError}
            </div>
          )}

          {/* Format guide */}
          <div className="format-guide">
            <p className="format-guide__title">
              <Info size={14} /> Supported CSV Formats
            </p>
            <table className="format-guide__table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Required</th>
                  <th>Example Values</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><span className="code-pill">Date</span></td><td>✓</td><td>26-09-2026, 2026-09-26</td><td>DD-MM-YYYY or YYYY-MM-DD</td></tr>
                <tr><td><span className="code-pill">Description</span></td><td>✓</td><td>UPI/SWIGGY/Food Order</td><td>Used as transaction title + auto-categorisation</td></tr>
                <tr><td><span className="code-pill">Credit</span></td><td>either</td><td>5000.00</td><td>Positive inflows (income). Leave blank if 0</td></tr>
                <tr><td><span className="code-pill">Debit</span></td><td>either</td><td>450.00</td><td>Positive outflows (expense). Leave blank if 0</td></tr>
                <tr><td><span className="code-pill">Amount</span></td><td>either</td><td>450.00</td><td>Unified amount — use with a Type column instead of Credit/Debit</td></tr>
                <tr><td><span className="code-pill">Balance</span></td><td>✗</td><td>84550.00</td><td>Ignored — for reference only</td></tr>
                <tr><td><span className="code-pill">Reference</span></td><td>✗</td><td>UPI/TXN/9912837621</td><td>Ignored — for reference only</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* STEP 1 — Column Mapping                           */}
      {/* ══════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Map CSV Columns</h2>
              <p style={{ fontSize: "13px", color: "var(--color-fey-graphite)", marginTop: "4px" }}>
                {rawRows.length} rows detected in <strong style={{ color: "var(--color-fey-mist)" }}>{fileName}</strong>.
                Match each field to the correct column from your file.
              </p>
            </div>
          </div>
          <div style={{ padding: "24px" }}>
            <div className="col-map-grid">
              {[
                { key: "date",        label: "Date Column",        required: true },
                { key: "description", label: "Description Column", required: true },
                { key: "credit",      label: "Credit Column",      required: false },
                { key: "debit",       label: "Debit Column",       required: false },
                { key: "amount",      label: "Amount Column",      required: false },
                { key: "typeCol",     label: "Type Column (Cr/Dr)", required: false },
              ].map(({ key, label, required }) => (
                <div key={key} className="col-map-item">
                  <div className="form-group">
                    <label className="form-label">
                      {label}{required && <span style={{ color: "var(--color-fey-loss)", marginLeft: 4 }}>*</span>}
                    </label>
                    <select
                      id={`col-map-${key}`}
                      value={colMap[key]}
                      onChange={(e) => setColMap((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="form-select"
                    >
                      <option value="">— Skip —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Raw data preview */}
            <p style={{ fontSize: "12px", color: "var(--color-fey-graphite)", marginBottom: "10px" }}>
              Raw preview (first 5 rows):
            </p>
            <div className="preview-table-wrap" style={{ maxHeight: "180px", marginBottom: "24px" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    {headers.map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rawRows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} style={{ fontSize: "12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={reset} className="btn btn--ghost" style={{ padding: "9px 20px" }}>
                ← Back
              </button>
              <button
                id="build-preview-btn"
                onClick={buildPreview}
                disabled={!colMap.date || !colMap.description || (!colMap.credit && !colMap.debit && !colMap.amount)}
                className="btn btn--primary"
                style={{ padding: "9px 20px" }}
              >
                Preview Transactions <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* STEP 2 — Review & Edit                            */}
      {/* ══════════════════════════════════════════════════ */}
      {step === 2 && (
        <div>
          {/* Stats bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: "16px", flexWrap: "wrap", gap: "12px",
          }}>
            <div style={{ display: "flex", gap: "20px" }}>
              <div>
                <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-fey-white)", letterSpacing: "-1px" }}>
                  {activeCount}
                </span>
                <span style={{ fontSize: "12px", color: "var(--color-fey-graphite)", marginLeft: "6px" }}>
                  to import
                </span>
              </div>
              <div>
                <span style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-fey-graphite)", letterSpacing: "-1px" }}>
                  {preview.length - activeCount}
                </span>
                <span style={{ fontSize: "12px", color: "var(--color-fey-graphite)", marginLeft: "6px" }}>
                  skipped
                </span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--color-fey-graphite)" }}>
              Edit <strong style={{ color: "var(--color-fey-mist)" }}>Category</strong> and <strong style={{ color: "var(--color-fey-mist)" }}>Type</strong> before importing. Toggle rows to skip.
            </p>
          </div>

          <div className="card">
            <div className="preview-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: "36px" }}>✓</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr
                      key={row._idx}
                      style={{ opacity: row.skip ? 0.35 : 1, transition: "opacity 0.15s" }}
                    >
                      {/* Toggle */}
                      <td>
                        <input
                          type="checkbox"
                          checked={!row.skip}
                          onChange={() => toggleSkip(row._idx)}
                          style={{ accentColor: "var(--color-fey-signal)", cursor: "pointer", width: "14px", height: "14px" }}
                        />
                      </td>
                      {/* Title */}
                      <td>
                        <p className="tx-title" style={{ maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.title}
                        </p>
                      </td>
                      {/* Date */}
                      <td>
                        <span className="tx-date">{row.date}</span>
                      </td>
                      {/* Type — editable */}
                      <td>
                        <select
                          className="preview-select"
                          value={row.type}
                          onChange={(e) => updatePreviewRow(row._idx, "type", e.target.value)}
                        >
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      </td>
                      {/* Category — editable */}
                      <td>
                        <select
                          className="preview-select"
                          value={row.category}
                          onChange={(e) => updatePreviewRow(row._idx, "category", e.target.value)}
                        >
                          {VALID_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      {/* Amount */}
                      <td>
                        <span className={`tx-amount tx-amount--${row.type}`}>
                          {row.type === "income" ? "+" : "-"}
                          {row.amount.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
            <button onClick={() => setStep(1)} className="btn btn--ghost" style={{ padding: "9px 20px" }}>
              ← Back
            </button>
            <button
              id="confirm-import-btn"
              onClick={handleImport}
              disabled={importing || activeCount === 0}
              className="btn btn--primary"
              style={{ padding: "9px 20px" }}
            >
              {importing
                ? <><RefreshCw size={13} style={{ animation: "spin 0.7s linear infinite" }} /> Importing…</>
                : <>Import {activeCount} Transaction{activeCount !== 1 ? "s" : ""} <ChevronRight size={14} /></>
              }
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* STEP 3 — Done                                     */}
      {/* ══════════════════════════════════════════════════ */}
      {step === 3 && result && (
        <div className={`import-result import-result--${result.failed > 0 ? "partial" : "success"}`}>
          <span className="import-result__icon">
            {result.imported > 0 ? "🎉" : "⚠️"}
          </span>
          <p className="import-result__count">{result.imported}</p>
          <p style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-fey-mist)", marginBottom: "4px" }}>
            Transactions imported
          </p>
          <p className="import-result__label">{result.message}</p>

          {/* Error list */}
          {result.errors?.length > 0 && (
            <div className="import-error-list">
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-fey-loss)", marginBottom: "8px" }}>
                {result.failed} row{result.failed !== 1 ? "s" : ""} skipped:
              </p>
              <ul>
                {result.errors.map((e, i) => (
                  <li key={i}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "32px", flexWrap: "wrap" }}>
            <button
              id="import-again-btn"
              onClick={reset}
              className="btn btn--ghost"
              style={{ padding: "10px 24px" }}
            >
              <Upload size={14} /> Import Another File
            </button>
            <button
              id="goto-dashboard-btn"
              onClick={() => navigate("/dashboard")}
              className="btn btn--primary"
              style={{ padding: "10px 24px" }}
            >
              Go to Dashboard →
            </button>
            <button
              id="goto-transactions-btn"
              onClick={() => navigate("/transactions")}
              className="btn btn--ghost"
              style={{ padding: "10px 24px" }}
            >
              View Transactions →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

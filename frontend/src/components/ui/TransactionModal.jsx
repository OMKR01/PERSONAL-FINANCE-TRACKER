import { useState, useEffect } from "react";
import { X } from "lucide-react";

const CATEGORIES = {
  income: ["Salary", "Freelance", "Investments"],
  expense: ["Housing", "Food", "Transport", "Utilities", "Entertainment", "Health", "Other"],
};

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", INR: "₹", GBP: "£" };

const emptyForm = {
  title: "",
  amount: "",
  type: "expense",
  category: "Food",
  date: new Date().toISOString().split("T")[0],
  notes: "",
};

/**
 * Reusable Add/Edit Transaction Modal
 * @param {object}   tx          - existing transaction (edit mode) or null (add mode)
 * @param {string}   currency    - user currency code
 * @param {Function} onSave      - async fn(formData, id?) called on submit
 * @param {Function} onClose     - fn() to close the modal
 */
export default function TransactionModal({ tx, currency = "USD", onSave, onClose }) {
  const sym = CURRENCY_SYMBOLS[currency] || "$";
  const isEdit = Boolean(tx);

  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (tx) {
      setFormData({
        title: tx.title,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        date: tx.date ? tx.date.split("T")[0] : new Date().toISOString().split("T")[0],
        notes: tx.notes || "",
      });
    } else {
      setFormData(emptyForm);
    }
  }, [tx]);

  const handleTypeChange = (t) => {
    setFormData((prev) => ({ ...prev, type: t, category: CATEGORIES[t][0] }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSave({ ...formData, amount: Number(formData.amount) }, tx?._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
        {/* Header */}
        <div className="modal__header">
          <h2 id="modal-heading" className="modal__title">
            {isEdit ? "Edit Transaction" : "Add Transaction"}
          </h2>
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="modal__close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            {/* Error */}
            {error && <div className="alert--error">{error}</div>}

            {/* Type Toggle */}
            <div className="type-switcher">
              <button
                type="button"
                id="modal-type-expense"
                onClick={() => handleTypeChange("expense")}
                className={`type-switcher__btn${formData.type === "expense" ? " active--expense" : ""}`}
              >
                Expense
              </button>
              <button
                type="button"
                id="modal-type-income"
                onClick={() => handleTypeChange("income")}
                className={`type-switcher__btn${formData.type === "income" ? " active--income" : ""}`}
              >
                Income
              </button>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="modal-title" className="form-label">Description</label>
              <input
                id="modal-title"
                type="text"
                required
                placeholder="e.g. Grocery Store, Client Invoice"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="form-input"
              />
            </div>

            {/* Amount + Category */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="modal-amount" className="form-label">
                  Amount ({sym})
                </label>
                <input
                  id="modal-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="modal-category" className="form-label">Category</label>
                <select
                  id="modal-category"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="form-select"
                >
                  {CATEGORIES[formData.type].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div className="form-group">
              <label htmlFor="modal-date" className="form-label">Date</label>
              <input
                id="modal-date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                className="form-input"
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label htmlFor="modal-notes" className="form-label">
                Notes{" "}
                <span style={{ color: "var(--color-fey-graphite)", textTransform: "none", letterSpacing: 0 }}>
                  (optional)
                </span>
              </label>
              <input
                id="modal-notes"
                type="text"
                placeholder="Extra context or reference number"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="modal__footer">
            <button
              type="button"
              id="modal-cancel-btn"
              onClick={onClose}
              className="btn btn--ghost"
              style={{ padding: "8px 20px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="modal-save-btn"
              disabled={submitting}
              className="btn btn--primary"
              style={{ padding: "8px 20px" }}
            >
              {submitting
                ? isEdit ? "Saving…" : "Adding…"
                : isEdit ? "Save Changes" : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

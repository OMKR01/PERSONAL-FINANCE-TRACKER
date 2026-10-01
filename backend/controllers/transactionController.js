import mongoose from "mongoose";
import { Transaction } from "../models/Transaction.js";

// @desc    Get all transactions for the user (with optional filters & pagination)
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { userId: req.user.id };

    if (type) query.type = type;
    if (category) query.category = category;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const pageNumber = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const skip = (pageNumber - 1) * pageSize;

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Transaction.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / pageSize),
      currentPage: pageNumber,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req, res, next) => {
  try {
    const { title, amount, type, category, date, notes } = req.body;

    if (!title || amount === undefined || !type || !category) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, amount, type, and category",
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number",
      });
    }

    const transaction = await Transaction.create({
      userId: req.user.id,
      title: title.trim(),
      amount: parsedAmount,
      type,
      category,
      date: date ? new Date(date) : Date.now(),
      notes: notes ? notes.trim() : "",
    });

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID format",
      });
    }

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Ownership check
    if (transaction.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this transaction",
      });
    }

    const { title, amount, type, category, date, notes } = req.body;

    if (amount !== undefined) {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be a positive number",
        });
      }
      transaction.amount = parsedAmount;
    }

    if (title) transaction.title = title.trim();
    if (type) transaction.type = type;
    if (category) transaction.category = category;
    if (date) transaction.date = new Date(date);
    if (notes !== undefined) transaction.notes = notes.trim();

    await transaction.save();

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
export const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID format",
      });
    }

    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // Ownership check
    if (transaction.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this transaction",
      });
    }

    await transaction.deleteOne();

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated financial summary (Totals, Category breakdown, Monthly trend)
// @route   GET /api/transactions/summary
// @access  Private
export const getFinancialSummary = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { year = new Date().getFullYear(), month } = req.query;

    const parsedYear = parseInt(year, 10);
    let startDate;
    let endDate;

    if (month) {
      const parsedMonth = parseInt(month, 10) - 1; // 0-indexed
      startDate = new Date(Date.UTC(parsedYear, parsedMonth, 1, 0, 0, 0));
      endDate = new Date(
        Date.UTC(parsedYear, parsedMonth + 1, 0, 23, 59, 59, 999),
      );
    } else {
      startDate = new Date(Date.UTC(parsedYear, 0, 1, 0, 0, 0));
      endDate = new Date(Date.UTC(parsedYear, 11, 31, 23, 59, 59, 999));
    }

    const [aggregationResult] = await Transaction.aggregate([
      {
        $match: {
          userId,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: "$type",
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
          ],
          categoryBreakdown: [
            { $match: { type: "expense" } },
            {
              $group: {
                _id: "$category",
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
            { $sort: { totalAmount: -1 } },
          ],
          monthlyTrend: [
            {
              $group: {
                _id: {
                  month: { $month: "$date" },
                  type: "$type",
                },
                totalAmount: { $sum: "$amount" },
              },
            },
            { $sort: { "_id.month": 1 } },
          ],
        },
      },
    ]);

    let incomeTotal = 0;
    let expenseTotal = 0;

    (aggregationResult?.totals || []).forEach((item) => {
      if (item._id === "income") incomeTotal = item.totalAmount;
      if (item._id === "expense") expenseTotal = item.totalAmount;
    });

    const netSavings = incomeTotal - expenseTotal;
    const savingsRate =
      incomeTotal > 0 ? ((netSavings / incomeTotal) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        totals: {
          income: incomeTotal,
          expense: expenseTotal,
          netSavings,
          savingsRate: Number(savingsRate),
        },
        categoryBreakdown: aggregationResult?.categoryBreakdown || [],
        monthlyTrend: aggregationResult?.monthlyTrend || [],
      },
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Bulk import transactions from CSV/file upload
// @route   POST /api/transactions/import
// @access  Private
export const bulkImportTransactions = async (req, res, next) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a non-empty transactions array",
      });
    }

    if (transactions.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Cannot import more than 500 transactions at once",
      });
    }

    const VALID_TYPES = ["income", "expense"];
    const VALID_CATEGORIES = [
      "Salary",
      "Freelance",
      "Investments",
      "Housing",
      "Food",
      "Transport",
      "Utilities",
      "Entertainment",
      "Health",
      "Other",
    ];

    const toInsert = [];
    const errors = [];

    transactions.forEach((tx, idx) => {
      const row = idx + 1;
      const rawAmount = typeof tx.amount === "string" ? parseFloat(tx.amount.replace(/[^0-9.-]/g, "")) : Number(tx.amount);
      const amount = Math.abs(rawAmount);

      const title = tx.title && tx.title.toString().trim() ? tx.title.toString().trim() : `Imported Tx #${row}`;

      if (isNaN(amount) || amount <= 0) {
        errors.push({ row, field: "amount", message: "Amount must be a positive number" });
        return;
      }

      const type = VALID_TYPES.includes(tx.type) ? tx.type : "expense";
      const category = VALID_CATEGORIES.includes(tx.category) ? tx.category : "Other";

      let parsedDate = tx.date ? new Date(tx.date) : new Date();
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date();
      }

      toInsert.push({
        userId: req.user.id,
        title,
        amount,
        type,
        category,
        date: parsedDate,
        notes: tx.notes ? tx.notes.toString().trim() : "",
      });
    });

    let inserted = [];
    try {
      if (toInsert.length > 0) {
        inserted = await Transaction.insertMany(toInsert, { ordered: false });
      }
    } catch (bulkError) {
      if (bulkError.insertedDocs) {
        inserted = bulkError.insertedDocs;
      }
    }

    res.status(201).json({
      success: true,
      imported: inserted.length,
      failed: errors.length,
      errors: errors.slice(0, 20),
      message: `Successfully imported ${inserted.length} transaction${inserted.length !== 1 ? "s" : ""}${errors.length > 0 ? `, ${errors.length} skipped` : ""}`,
    });
  } catch (error) {
    next(error);
  }
};

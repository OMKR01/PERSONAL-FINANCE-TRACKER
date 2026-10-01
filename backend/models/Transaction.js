import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    category: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    date: { type: Date, default: Date.now, index: true },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);

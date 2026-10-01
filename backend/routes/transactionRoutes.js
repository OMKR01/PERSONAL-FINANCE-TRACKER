import { Router } from "express";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFinancialSummary,
  bulkImportTransactions,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.route("/").get(getTransactions).post(createTransaction);

router.get("/summary", getFinancialSummary);
router.post("/import", bulkImportTransactions);

router.route("/:id").put(updateTransaction).delete(deleteTransaction);

export default router;

import { createContext, useState } from "react";

export const TransactionContext = createContext(null);

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);

  // TODO: Expose CRUD dispatchers & cache state

  return (
    <TransactionContext.Provider
      value={{ transactions, setTransactions, summary, setSummary }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

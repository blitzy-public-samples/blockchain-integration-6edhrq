import React from 'react';
import { useAppSelector } from '@/store';
import { selectTransactions } from '@/store/transactionSlice';
import { formatCurrency, formatDate } from '@/utils/formatters';

interface TransactionListProps {
  vaultId: string;
}

const TransactionList: React.FC<TransactionListProps> = ({ vaultId }) => {
  const transactions = useAppSelector(selectTransactions);

  const filteredTransactions = transactions.filter(
    (transaction) => transaction.vaultId === vaultId
  );

  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="transaction-list">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {sortedTransactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{formatDate(transaction.date)}</td>
              <td>{transaction.description}</td>
              <td>{formatCurrency(transaction.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* HUMAN ASSISTANCE NEEDED */}
      {/* Implement pagination if necessary */}
      {/* Consider adding a "No transactions" message if the list is empty */}
      {/* Add error handling for failed data fetching */}
    </div>
  );
};

export default TransactionList;
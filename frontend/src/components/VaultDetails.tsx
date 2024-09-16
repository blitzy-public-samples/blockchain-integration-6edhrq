import React from 'react';
import { formatCurrency, truncateAddress } from '@/utils/formatters';
import { TransactionList } from '@/components/TransactionList';

interface VaultDetailsProps {
  vault: {
    name: string;
    address: string;
    balance: number;
    blockchain: string;
    transactions: any[]; // HUMAN ASSISTANCE NEEDED: Define proper type for transactions
  };
}

export const VaultDetails: React.FC<VaultDetailsProps> = ({ vault }) => {
  return (
    <div className="vault-details">
      <h2>{vault.name}</h2>
      <p>Address: {truncateAddress(vault.address)}</p>
      <p>Balance: {formatCurrency(vault.balance)}</p>
      <p>Blockchain: {vault.blockchain}</p>
      <h3>Transactions</h3>
      <TransactionList transactions={vault.transactions} />
    </div>
  );
};
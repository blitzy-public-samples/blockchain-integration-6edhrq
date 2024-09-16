import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { VaultList } from '@/components/VaultList';
import { TransactionList } from '@/components/TransactionList';
import { Chart } from '@/components/Chart';
import { api } from '@/services/api';
import { useAppSelector, useAppDispatch } from '@/store';
import { fetchVaults } from '@/store/vaultSlice';
import { fetchTransactions } from '@/store/transactionSlice';

// HUMAN ASSISTANCE NEEDED
// The following component might need additional refinement for production readiness.
// Please review and adjust as necessary.

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const vaults = useAppSelector((state) => state.vault.vaults);
  const transactions = useAppSelector((state) => state.transaction.transactions);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await dispatch(fetchVaults());
      await dispatch(fetchTransactions());
      setIsLoading(false);
    };

    fetchData();
  }, [dispatch]);

  return (
    <div className="dashboard">
      <Header />
      <div className="dashboard-content">
        <Sidebar />
        <main>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <>
              <VaultList vaults={vaults} />
              <TransactionList transactions={transactions} />
              <Chart data={vaults} />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
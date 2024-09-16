import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { selectVaults, fetchVaults } from '@/store/vaultSlice';
import { VaultDetails } from '@/components/VaultDetails';

export const VaultList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { vaults, status } = useAppSelector(selectVaults);

  useEffect(() => {
    dispatch(fetchVaults());
  }, [dispatch]);

  // HUMAN ASSISTANCE NEEDED
  // The following render function needs review for production readiness
  // and potentially implementing pagination for large lists of vaults
  const render = () => {
    if (status === 'loading') {
      return <div>Loading vaults...</div>;
    }

    if (status === 'failed') {
      return <div>Error loading vaults. Please try again later.</div>;
    }

    return (
      <div>
        <h2>Vault List</h2>
        {vaults.map((vault) => (
          <VaultDetails key={vault.id} vault={vault} />
        ))}
      </div>
    );
  };

  return render();
};
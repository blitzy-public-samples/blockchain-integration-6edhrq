import React, { useState } from 'react';
import { useAppDispatch } from '@/store';
import { createTransaction } from '@/store/transactionSlice';
import { isValidEthereumAddress, isValidXRPAddress } from '@/utils/validators';

interface TransactionFormProps {
  vaultId: string;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ vaultId }) => {
  const dispatch = useAppDispatch();
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [error, setError] = useState('');

  // HUMAN ASSISTANCE NEEDED
  // The handleSubmit function needs more robust error handling and validation.
  // Consider adding more specific error messages and handling different types of errors.
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!isValidEthereumAddress(recipientAddress) && !isValidXRPAddress(recipientAddress)) {
      setError('Please enter a valid Ethereum or XRP address');
      return;
    }

    try {
      await dispatch(createTransaction({ vaultId, amount: parseFloat(amount), recipientAddress }));
      // Clear form after successful submission
      setAmount('');
      setRecipientAddress('');
    } catch (err) {
      setError('Failed to create transaction. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="amount">Amount:</label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="recipientAddress">Recipient Address:</label>
        <input
          type="text"
          id="recipientAddress"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          required
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button type="submit">Create Transaction</button>
    </form>
  );
};

export default TransactionForm;
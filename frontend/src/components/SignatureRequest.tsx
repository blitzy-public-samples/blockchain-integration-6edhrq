import React, { useState } from 'react';
import { useAppDispatch } from '@/store';
import { requestSignature, checkSignatureStatus } from '@/store/signatureSlice';
import { truncateAddress } from '@/utils/formatters';

interface SignatureRequestProps {
  vaultId: string;
}

const SignatureRequest: React.FC<SignatureRequestProps> = ({ vaultId }) => {
  const dispatch = useAppDispatch();
  const [signatureStatus, setSignatureStatus] = useState<string>('');
  const [signatureDetails, setSignatureDetails] = useState<any>(null);

  // HUMAN ASSISTANCE NEEDED
  // The following function needs review for production readiness
  const handleSignatureRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const result = await dispatch(requestSignature(vaultId));
      if (requestSignature.fulfilled.match(result)) {
        setSignatureStatus('Signature requested successfully');
        // Start checking signature status
        checkSignatureStatus(result.payload.requestId);
      } else {
        setSignatureStatus('Failed to request signature');
      }
    } catch (error) {
      console.error('Error requesting signature:', error);
      setSignatureStatus('Error occurred while requesting signature');
    }
  };

  const checkSignatureStatus = async (requestId: string) => {
    try {
      const result = await dispatch(checkSignatureStatus(requestId));
      if (checkSignatureStatus.fulfilled.match(result)) {
        setSignatureStatus(result.payload.status);
        if (result.payload.status === 'completed') {
          setSignatureDetails(result.payload.details);
        } else {
          // Continue checking status if not completed
          setTimeout(() => checkSignatureStatus(requestId), 5000);
        }
      }
    } catch (error) {
      console.error('Error checking signature status:', error);
    }
  };

  return (
    <div className="signature-request">
      <h2>Signature Request</h2>
      <form onSubmit={handleSignatureRequest}>
        <button type="submit">Request Signature</button>
      </form>
      {signatureStatus && (
        <div className="signature-status">
          <p>Status: {signatureStatus}</p>
        </div>
      )}
      {signatureDetails && (
        <div className="signature-details">
          <h3>Signature Details</h3>
          <p>Signer: {truncateAddress(signatureDetails.signer)}</p>
          <p>Signature: {truncateAddress(signatureDetails.signature)}</p>
          <p>Timestamp: {new Date(signatureDetails.timestamp).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default SignatureRequest;
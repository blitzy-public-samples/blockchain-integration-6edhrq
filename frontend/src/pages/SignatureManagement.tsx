import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { SignatureRequest } from '@/components/SignatureRequest';
import { api } from '@/services/api';
import { useAppSelector, useAppDispatch } from '@/store';
import { requestSignature, checkSignatureStatus } from '@/store/signatureSlice';

// HUMAN ASSISTANCE NEEDED
// The following component might need additional refinement for production readiness.
// Please review and adjust as necessary.

const SignatureManagement: React.FC = () => {
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const fetchSignatures = async () => {
      try {
        const response = await api.getSignatures();
        setSignatures(response.data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching signatures:', error);
        setIsLoading(false);
      }
    };

    fetchSignatures();
  }, []);

  const handleSignatureRequest = async (requestData: SignatureRequestData) => {
    try {
      await dispatch(requestSignature(requestData));
      // Assuming the requestSignature action updates the store with the new signature
      // We should update the local state to reflect this change
      const updatedSignatures = await api.getSignatures();
      setSignatures(updatedSignatures.data);
    } catch (error) {
      console.error('Error requesting signature:', error);
    }
  };

  return (
    <div className="signature-management">
      <Header />
      <div className="content-wrapper">
        <Sidebar />
        <main>
          <h1>Signature Management</h1>
          <SignatureRequest onSubmit={handleSignatureRequest} />
          {isLoading ? (
            <p>Loading signatures...</p>
          ) : (
            <div className="signatures-list">
              {signatures.map((signature) => (
                <div key={signature.id} className="signature-item">
                  {/* Display signature details here */}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SignatureManagement;
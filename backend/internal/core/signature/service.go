package signature

import (
	"github.com/google/uuid"
	"backend/internal/db"
	"backend/internal/custodian"
	"backend/pkg/utils"
)

type SignatureService struct {
	repo            *db.Repository
	custodianClient custodian.CustodianClient
}

func NewSignatureService(repo *db.Repository, custodianClient custodian.CustodianClient) *SignatureService {
	return &SignatureService{
		repo:            repo,
		custodianClient: custodianClient,
	}
}

// HUMAN ASSISTANCE NEEDED
// This function needs review for production readiness and error handling
func (s *SignatureService) RequestSignature(userID uuid.UUID, vaultID uuid.UUID, dataToSign []byte) (*db.Signature, error) {
	signature := &db.Signature{
		ID:        uuid.New(),
		UserID:    userID,
		VaultID:   vaultID,
		DataToSign: dataToSign,
		Status:    "pending",
	}

	err := s.repo.CreateSignature(signature)
	if err != nil {
		return nil, err
	}

	custodianResp, err := s.custodianClient.RequestSignature(signature.ID, userID, vaultID, dataToSign)
	if err != nil {
		// TODO: Handle error, possibly update signature status
		return nil, err
	}

	// TODO: Update signature with custodian response if needed

	return signature, nil
}

func (s *SignatureService) GetSignature(signatureID uuid.UUID) (*db.Signature, error) {
	return s.repo.GetSignatureByID(signatureID)
}

// HUMAN ASSISTANCE NEEDED
// This function needs review for production readiness, error handling, and potential race conditions
func (s *SignatureService) CheckSignatureStatus(signatureID uuid.UUID) (string, error) {
	signature, err := s.repo.GetSignatureByID(signatureID)
	if err != nil {
		return "", err
	}

	custodianStatus, err := s.custodianClient.CheckSignatureStatus(signatureID)
	if err != nil {
		return "", err
	}

	if custodianStatus != signature.Status {
		signature.Status = custodianStatus
		err = s.repo.UpdateSignature(signature)
		if err != nil {
			return "", err
		}
	}

	return signature.Status, nil
}
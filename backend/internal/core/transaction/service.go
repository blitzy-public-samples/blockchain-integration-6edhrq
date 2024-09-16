package transaction

import (
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"backend/internal/db"
	"backend/internal/blockchain"
	"backend/internal/custodian"
	"backend/pkg/utils"
)

type TransactionService struct {
	repo             *db.Repository
	blockchainClient blockchain.BlockchainClient
	custodianClient  custodian.CustodianClient
}

func NewTransactionService(repo *db.Repository, blockchainClient blockchain.BlockchainClient, custodianClient custodian.CustodianClient) *TransactionService {
	return &TransactionService{
		repo:             repo,
		blockchainClient: blockchainClient,
		custodianClient:  custodianClient,
	}
}

// HUMAN ASSISTANCE NEEDED
// The following function needs review and potential modifications for production readiness.
// Confidence level: 0.6
func (s *TransactionService) CreateTransaction(userID uuid.UUID, vaultID uuid.UUID, toAddress string, amount decimal.Decimal) (*db.Transaction, error) {
	vault, err := s.repo.GetVaultByID(vaultID)
	if err != nil {
		return nil, err
	}

	rawTx, err := s.blockchainClient.CreateRawTransaction(vault.Address, toAddress, amount)
	if err != nil {
		return nil, err
	}

	transaction := &db.Transaction{
		ID:        uuid.New(),
		UserID:    userID,
		VaultID:   vaultID,
		ToAddress: toAddress,
		Amount:    amount,
		Status:    db.TransactionStatusPending,
		RawTx:     rawTx,
	}

	err = s.repo.CreateTransaction(transaction)
	if err != nil {
		return nil, err
	}

	return transaction, nil
}

func (s *TransactionService) GetTransaction(transactionID uuid.UUID) (*db.Transaction, error) {
	return s.repo.GetTransactionByID(transactionID)
}

// HUMAN ASSISTANCE NEEDED
// The following function needs review and potential modifications for production readiness.
// Confidence level: 0.5
func (s *TransactionService) ProcessTransaction(transactionID uuid.UUID) error {
	tx, err := s.repo.GetTransactionByID(transactionID)
	if err != nil {
		return err
	}

	signedTx, err := s.custodianClient.SignTransaction(tx.RawTx)
	if err != nil {
		return err
	}

	txHash, err := s.blockchainClient.BroadcastTransaction(signedTx)
	if err != nil {
		return err
	}

	tx.Status = db.TransactionStatusProcessed
	tx.TxHash = txHash

	return s.repo.UpdateTransaction(tx)
}
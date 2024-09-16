package vault

import (
	"github.com/google/uuid"
	"backend/internal/db"
	"backend/internal/blockchain"
	"backend/pkg/utils"
)

type VaultService struct {
	repo             *db.Repository
	blockchainClient blockchain.BlockchainClient
}

func NewVaultService(repo *db.Repository, blockchainClient blockchain.BlockchainClient) *VaultService {
	return &VaultService{
		repo:             repo,
		blockchainClient: blockchainClient,
	}
}

// HUMAN ASSISTANCE NEEDED
// The CreateVault function needs review for production readiness
func (s *VaultService) CreateVault(organizationID uuid.UUID, name string, blockchainType string) (*db.Vault, error) {
	address, err := s.blockchainClient.GenerateAddress(blockchainType)
	if err != nil {
		return nil, err
	}

	vault := &db.Vault{
		ID:             uuid.New(),
		OrganizationID: organizationID,
		Name:           name,
		BlockchainType: blockchainType,
		Address:        address,
	}

	err = s.repo.CreateVault(vault)
	if err != nil {
		return nil, err
	}

	return vault, nil
}

func (s *VaultService) GetVault(vaultID uuid.UUID) (*db.Vault, error) {
	return s.repo.GetVaultByID(vaultID)
}

func (s *VaultService) ListVaults(organizationID uuid.UUID) ([]*db.Vault, error) {
	return s.repo.GetVaultsByOrganizationID(organizationID)
}
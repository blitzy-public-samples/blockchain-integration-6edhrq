package tests

import (
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/your-username/your-project/db"
)

func TestDatabaseConnection(t *testing.T) {
	conn, err := db.Connect()
	assert.NoError(t, err)
	assert.NotNil(t, conn)
	defer conn.Close()
}

func TestCreateVault(t *testing.T) {
	conn, _ := db.Connect()
	defer conn.Close()

	vault := &db.Vault{
		Name: "Test Vault",
		UserID: "user123",
	}

	err := db.CreateVault(conn, vault)
	assert.NoError(t, err)
	assert.NotEmpty(t, vault.ID)
}

func TestGetVault(t *testing.T) {
	conn, _ := db.Connect()
	defer conn.Close()

	// First, create a vault
	vault := &db.Vault{
		Name: "Test Vault",
		UserID: "user123",
	}
	db.CreateVault(conn, vault)

	// Now, try to get it
	retrievedVault, err := db.GetVault(conn, vault.ID)
	assert.NoError(t, err)
	assert.Equal(t, vault.Name, retrievedVault.Name)
	assert.Equal(t, vault.UserID, retrievedVault.UserID)
}

func TestListVaults(t *testing.T) {
	conn, _ := db.Connect()
	defer conn.Close()

	// Create a few vaults
	db.CreateVault(conn, &db.Vault{Name: "Vault 1", UserID: "user123"})
	db.CreateVault(conn, &db.Vault{Name: "Vault 2", UserID: "user123"})
	db.CreateVault(conn, &db.Vault{Name: "Vault 3", UserID: "user456"})

	// List vaults for user123
	vaults, err := db.ListVaults(conn, "user123")
	assert.NoError(t, err)
	assert.Len(t, vaults, 2)
}

func TestCreateTransaction(t *testing.T) {
	conn, _ := db.Connect()
	defer conn.Close()

	transaction := &db.Transaction{
		VaultID: "vault123",
		Amount: 100.50,
		Description: "Test transaction",
	}

	err := db.CreateTransaction(conn, transaction)
	assert.NoError(t, err)
	assert.NotEmpty(t, transaction.ID)
}

func TestGetTransaction(t *testing.T) {
	conn, _ := db.Connect()
	defer conn.Close()

	// First, create a transaction
	transaction := &db.Transaction{
		VaultID: "vault123",
		Amount: 100.50,
		Description: "Test transaction",
	}
	db.CreateTransaction(conn, transaction)

	// Now, try to get it
	retrievedTransaction, err := db.GetTransaction(conn, transaction.ID)
	assert.NoError(t, err)
	assert.Equal(t, transaction.VaultID, retrievedTransaction.VaultID)
	assert.Equal(t, transaction.Amount, retrievedTransaction.Amount)
	assert.Equal(t, transaction.Description, retrievedTransaction.Description)
}

// HUMAN ASSISTANCE NEEDED
// The following tests might need additional setup or teardown logic to ensure a clean test environment.
// Consider adding helper functions to create and clean up test data.
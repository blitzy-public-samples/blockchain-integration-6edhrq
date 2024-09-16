package db

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Organization struct {
	gorm.Model
	ID        uuid.UUID `gorm:"type:uuid;primary_key"`
	Name      string
	APIKey    string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type User struct {
	gorm.Model
	ID             uuid.UUID `gorm:"type:uuid;primary_key"`
	OrganizationID uuid.UUID
	Username       string
	Email          string
	PasswordHash   string
	Role           string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type Vault struct {
	gorm.Model
	ID             uuid.UUID `gorm:"type:uuid;primary_key"`
	OrganizationID uuid.UUID
	Name           string
	BlockchainType string
	Address        string
	Metadata       gorm.JSONMap
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type Transaction struct {
	gorm.Model
	ID             uuid.UUID `gorm:"type:uuid;primary_key"`
	UserID         uuid.UUID
	VaultID        uuid.UUID
	Status         string
	BlockchainType string
	TxHash         string
	Amount         decimal.Decimal
	Metadata       gorm.JSONMap
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type Signature struct {
	gorm.Model
	ID            uuid.UUID `gorm:"type:uuid;primary_key"`
	UserID        uuid.UUID
	VaultID       uuid.UUID
	Status        string
	RawSignature  string
	Metadata      gorm.JSONMap
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
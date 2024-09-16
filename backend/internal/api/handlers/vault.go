package handlers

import (
	"github.com/gin-gonic/gin"
	"backend/internal/core/vault"
	"backend/pkg/utils"
)

type VaultHandler struct {
	vaultService *vault.VaultService
}

func NewVaultHandler(vaultService *vault.VaultService) *VaultHandler {
	return &VaultHandler{
		vaultService: vaultService,
	}
}

func (h *VaultHandler) GetAllVaults(c *gin.Context) {
	orgID, err := utils.GetOrganizationIDFromContext(c)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid organization ID"})
		return
	}

	vaults, err := h.vaultService.GetAllVaults(orgID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to retrieve vaults"})
		return
	}

	c.JSON(200, vaults)
}

// HUMAN ASSISTANCE NEEDED
// This function may need additional error handling and input validation
func (h *VaultHandler) CreateVault(c *gin.Context) {
	var createVaultRequest vault.CreateVaultRequest
	if err := c.ShouldBindJSON(&createVaultRequest); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	orgID, err := utils.GetOrganizationIDFromContext(c)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid organization ID"})
		return
	}

	createdVault, err := h.vaultService.CreateVault(orgID, createVaultRequest)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create vault"})
		return
	}

	c.JSON(201, createdVault)
}
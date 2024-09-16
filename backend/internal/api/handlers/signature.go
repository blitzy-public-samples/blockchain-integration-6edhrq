package handlers

import (
	"github.com/gin-gonic/gin"
	"backend/internal/core/signature"
	"backend/pkg/utils"
)

type SignatureHandler struct {
	signatureService *signature.SignatureService
}

func NewSignatureHandler(signatureService *signature.SignatureService) *SignatureHandler {
	return &SignatureHandler{
		signatureService: signatureService,
	}
}

// HUMAN ASSISTANCE NEEDED
// The following function needs review and potential modifications for production readiness
func (h *SignatureHandler) GetRawSignature(c *gin.Context) {
	var req struct {
		// Add necessary fields for the request
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	rawSignature, err := h.signatureService.GetRawSignature(/* Add necessary parameters */)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to get raw signature"})
		return
	}

	c.JSON(200, gin.H{"rawSignature": rawSignature})
}

// HUMAN ASSISTANCE NEEDED
// The following function needs review and potential modifications for production readiness
func (h *SignatureHandler) CheckSignatureStatus(c *gin.Context) {
	signatureID := c.Param("id")
	if signatureID == "" {
		c.JSON(400, gin.H{"error": "Missing signature ID"})
		return
	}

	status, err := h.signatureService.CheckSignatureStatus(signatureID)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to check signature status"})
		return
	}

	c.JSON(200, gin.H{"status": status})
}
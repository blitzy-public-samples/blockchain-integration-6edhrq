package handlers

import (
	"github.com/gin-gonic/gin"
	"backend/internal/core/transaction"
	"backend/pkg/utils"
)

type TransactionHandler struct {
	transactionService *transaction.TransactionService
}

func NewTransactionHandler(transactionService *transaction.TransactionService) *TransactionHandler {
	return &TransactionHandler{
		transactionService: transactionService,
	}
}

// HUMAN ASSISTANCE NEEDED
// The following function may need additional error handling and input validation
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
	var req transaction.CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request payload"})
		return
	}

	createdTransaction, err := h.transactionService.CreateTransaction(req)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create transaction"})
		return
	}

	c.JSON(201, createdTransaction)
}

func (h *TransactionHandler) GetTransactionStatus(c *gin.Context) {
	transactionID := c.Param("id")
	if transactionID == "" {
		c.JSON(400, gin.H{"error": "Transaction ID is required"})
		return
	}

	status, err := h.transactionService.GetTransactionStatus(transactionID)
	if err != nil {
		c.JSON(404, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(200, gin.H{"status": status})
}
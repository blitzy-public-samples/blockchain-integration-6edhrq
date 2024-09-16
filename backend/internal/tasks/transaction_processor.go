package tasks

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
	"backend/internal/core/transaction"
	"backend/internal/db"
	"backend/pkg/logger"
)

var transactionCheckInterval time.Duration

func StartTransactionProcessor(ctx context.Context, redisClient *redis.Client, txService *transaction.TransactionService) error {
	ticker := time.NewTicker(transactionCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			err := processTransactions(ctx, redisClient, txService)
			if err != nil {
				logger.Error("Error processing transactions", "error", err)
			}
		}
	}
}

// HUMAN ASSISTANCE NEEDED
// The following function needs review for production readiness and error handling
func processTransactions(ctx context.Context, redisClient *redis.Client, txService *transaction.TransactionService) error {
	pendingTransactions, err := db.GetPendingTransactions(ctx)
	if err != nil {
		return err
	}

	for _, tx := range pendingTransactions {
		result, err := txService.ProcessTransaction(ctx, tx)
		if err != nil {
			// Consider how to handle individual transaction errors
			logger.Error("Error processing transaction", "txID", tx.ID, "error", err)
			continue
		}

		err = db.UpdateTransaction(ctx, tx.ID, result.Status)
		if err != nil {
			logger.Error("Error updating transaction status", "txID", tx.ID, "error", err)
			continue
		}

		// Store result in Redis cache
		err = redisClient.Set(ctx, "tx:"+tx.ID, result, 0).Err()
		if err != nil {
			logger.Error("Error storing transaction result in cache", "txID", tx.ID, "error", err)
		}
	}

	return nil
}
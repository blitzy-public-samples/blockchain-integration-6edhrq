package tasks

import (
	"context"
	"time"

	"github.com/go-redis/redis/v8"
	"backend/internal/core/signature"
	"backend/internal/db"
	"backend/pkg/logger"
)

const signatureCheckInterval = 5 * time.Minute

func StartSignatureProcessor(ctx context.Context, redisClient *redis.Client, sigService *signature.SignatureService) error {
	ticker := time.NewTicker(signatureCheckInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := processSignatures(ctx, redisClient, sigService); err != nil {
				logger.Error("Error processing signatures", "error", err)
			}
		}
	}
}

// HUMAN ASSISTANCE NEEDED
// This function needs more error handling and potentially pagination for large numbers of pending signatures
func processSignatures(ctx context.Context, redisClient *redis.Client, sigService *signature.SignatureService) error {
	pendingSignatures, err := db.GetPendingSignatures(ctx)
	if err != nil {
		return err
	}

	for _, sig := range pendingSignatures {
		status, err := sigService.CheckSignatureStatus(ctx, sig.ID)
		if err != nil {
			logger.Error("Error checking signature status", "error", err, "signatureID", sig.ID)
			continue
		}

		if status == signature.StatusReady {
			if err := db.UpdateSignature(ctx, sig.ID, signature.StatusReady); err != nil {
				logger.Error("Error updating signature status", "error", err, "signatureID", sig.ID)
				continue
			}

			if err := redisClient.Set(ctx, "signature:"+sig.ID, sig, 24*time.Hour).Err(); err != nil {
				logger.Error("Error storing signature in Redis", "error", err, "signatureID", sig.ID)
			}
		} else if status == signature.StatusFailed {
			if err := db.UpdateSignature(ctx, sig.ID, signature.StatusFailed); err != nil {
				logger.Error("Error updating signature status", "error", err, "signatureID", sig.ID)
			}
		}
	}

	return nil
}
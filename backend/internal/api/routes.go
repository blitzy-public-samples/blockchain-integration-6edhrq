package api

import (
	"github.com/gin-gonic/gin"
	"backend/internal/api/handlers"
	"backend/internal/api/middleware"
)

func SetupRouter() *gin.Engine {
	router := gin.New()

	// Set up middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Authentication routes
	auth := router.Group("/auth")
	{
		auth.POST("/login", handlers.AuthHandler.Login)
		auth.POST("/register", handlers.AuthHandler.Register)
		auth.POST("/logout", middleware.AuthMiddleware(), handlers.AuthHandler.Logout)
	}

	// Vault management routes
	vault := router.Group("/vault", middleware.AuthMiddleware())
	{
		vault.POST("/create", handlers.VaultHandler.CreateVault)
		vault.GET("/list", handlers.VaultHandler.ListVaults)
		vault.GET("/:id", handlers.VaultHandler.GetVault)
		vault.PUT("/:id", handlers.VaultHandler.UpdateVault)
		vault.DELETE("/:id", handlers.VaultHandler.DeleteVault)
	}

	// Transaction routes
	tx := router.Group("/transactions", middleware.AuthMiddleware())
	{
		tx.POST("/create", handlers.TransactionHandler.CreateTransaction)
		tx.GET("/list", handlers.TransactionHandler.ListTransactions)
		tx.GET("/:id", handlers.TransactionHandler.GetTransaction)
		tx.PUT("/:id", handlers.TransactionHandler.UpdateTransaction)
		tx.DELETE("/:id", handlers.TransactionHandler.DeleteTransaction)
	}

	// Signature routes
	sig := router.Group("/signatures", middleware.AuthMiddleware())
	{
		sig.POST("/create", handlers.SignatureHandler.CreateSignature)
		sig.GET("/list", handlers.SignatureHandler.ListSignatures)
		sig.GET("/:id", handlers.SignatureHandler.GetSignature)
		sig.PUT("/:id", handlers.SignatureHandler.UpdateSignature)
		sig.DELETE("/:id", handlers.SignatureHandler.DeleteSignature)
	}

	return router
}
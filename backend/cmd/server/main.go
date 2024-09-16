package main

import (
	"github.com/gin-gonic/gin"
	"backend/internal/api"
	"backend/internal/config"
	"backend/internal/db"
	"backend/internal/blockchain"
	"backend/internal/custodian"
	"backend/pkg/logger"
	"backend/internal/tasks"
	"backend/internal/api/middleware"
)

var router *gin.Engine

func main() {
	// HUMAN ASSISTANCE NEEDED
	// The following code may need additional error handling and graceful shutdown mechanisms
	
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		logger.Fatal("Failed to load configuration", err)
	}

	// Initialize logger
	logger.Init(cfg.LogLevel)

	// Connect to database
	dbConn, err := db.InitDB(cfg.DatabaseURL)
	if err != nil {
		logger.Fatal("Failed to connect to database", err)
	}
	defer dbConn.Close()

	// Initialize blockchain clients
	blockchainClients, err := blockchain.InitBlockchainClients(cfg.BlockchainConfigs)
	if err != nil {
		logger.Fatal("Failed to initialize blockchain clients", err)
	}

	// Initialize custodian client
	custodianClient, err := custodian.InitCustodianClient(cfg.CustodianConfig)
	if err != nil {
		logger.Fatal("Failed to initialize custodian client", err)
	}

	// Set up API router
	router = gin.New()
	setupMiddleware(router)
	api.SetupRouter(router, dbConn, blockchainClients, custodianClient)

	// Start background tasks
	go tasks.StartSignatureProcessor(dbConn, blockchainClients, custodianClient)
	go tasks.StartTransactionProcessor(dbConn, blockchainClients, custodianClient)

	// Start the server
	logger.Info("Starting server on", cfg.ServerAddress)
	if err := router.Run(cfg.ServerAddress); err != nil {
		logger.Fatal("Failed to start server", err)
	}
}

func setupMiddleware(router *gin.Engine) {
	// Add logging middleware
	router.Use(gin.Logger())

	// Add recovery middleware
	router.Use(gin.Recovery())

	// Add CORS middleware
	// TODO: Implement CORS middleware

	// Add authentication middleware
	router.Use(middleware.AuthMiddleware())
}
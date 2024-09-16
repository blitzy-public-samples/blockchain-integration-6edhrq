package handlers

import (
	"github.com/gin-gonic/gin"
	"backend/internal/core/auth"
	"backend/pkg/utils"
)

type AuthHandler struct {
	authService *auth.AuthService
}

func NewAuthHandler(authService *auth.AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// HUMAN ASSISTANCE NEEDED
// The Login function needs more error handling and input validation for production readiness
func (h *AuthHandler) Login(c *gin.Context) {
	var loginRequest struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginRequest); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request payload"})
		return
	}

	token, err := h.authService.Login(loginRequest.Username, loginRequest.Password)
	if err != nil {
		c.JSON(401, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(200, gin.H{"token": token})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	err := h.authService.Logout(userID.(string))
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to logout"})
		return
	}

	c.JSON(200, gin.H{"message": "Logged out successfully"})
}
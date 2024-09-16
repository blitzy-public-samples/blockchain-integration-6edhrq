package db

import (
	"context"
	"github.com/go-redis/redis/v8"
	"backend/internal/config"
)

var redisClient *redis.Client

func InitRedis() error {
	cfg := config.GetConfig()
	
	redisClient = redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Address,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	ctx := context.Background()
	_, err := redisClient.Ping(ctx).Result()
	if err != nil {
		return err
	}

	return nil
}

func CloseRedis() error {
	if redisClient != nil {
		return redisClient.Close()
	}
	return nil
}
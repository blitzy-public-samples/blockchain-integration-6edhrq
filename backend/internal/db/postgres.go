package db

import (
	"database/sql"
	_ "github.com/lib/pq"
	"github.com/jmoiron/sqlx"
	"backend/internal/config"
)

var db *sqlx.DB

func InitDB() error {
	cfg := config.GetConfig()
	
	connStr := "host=" + cfg.DBHost + " port=" + cfg.DBPort + " user=" + cfg.DBUser + " password=" + cfg.DBPassword + " dbname=" + cfg.DBName + " sslmode=disable"
	
	var err error
	db, err = sqlx.Connect("postgres", connStr)
	if err != nil {
		return err
	}
	
	db.SetMaxOpenConns(cfg.DBMaxOpenConns)
	db.SetMaxIdleConns(cfg.DBMaxIdleConns)
	db.SetConnMaxLifetime(cfg.DBConnMaxLifetime)
	
	err = db.Ping()
	if err != nil {
		return err
	}
	
	return nil
}

func CloseDB() error {
	if db != nil {
		return db.Close()
	}
	return nil
}
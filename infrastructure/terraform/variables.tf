variable "aws_region" {
  description = "The AWS region to deploy resources"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "The deployment environment (e.g., dev, staging, prod)"
  type        = string
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "List of CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.3.0/24", "10.0.4.0/24"]
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the application servers"
  type        = string
  default     = "t3.micro"
}

variable "rds_instance_type" {
  description = "RDS instance type for the database"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_engine" {
  description = "RDS database engine"
  type        = string
  default     = "postgres"
}

variable "rds_engine_version" {
  description = "RDS database engine version"
  type        = string
  default     = "13.7"
}

variable "rds_database_name" {
  description = "Name of the RDS database"
  type        = string
}

variable "rds_username" {
  description = "Username for the RDS database"
  type        = string
}

variable "rds_password" {
  description = "Password for the RDS database"
  type        = string
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_engine_version" {
  description = "ElastiCache Redis engine version"
  type        = string
  default     = "6.x"
}

variable "kafka_instance_type" {
  description = "MSK Kafka broker instance type"
  type        = string
  default     = "kafka.t3.small"
}

variable "kafka_version" {
  description = "MSK Kafka version"
  type        = string
  default     = "2.8.1"
}

variable "kafka_number_of_broker_nodes" {
  description = "Number of MSK Kafka broker nodes"
  type        = number
  default     = 3
}

# HUMAN ASSISTANCE NEEDED
# Consider adding more specific variables for your use case, such as:
# - Application-specific configurations
# - Monitoring and logging settings
# - Backup and retention policies
# - Security group rules
# - IAM roles and policies
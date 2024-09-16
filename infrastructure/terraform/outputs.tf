output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = module.rds.this_db_instance_endpoint
}

output "elasticache_endpoint" {
  description = "The DNS name of the ElastiCache cluster without the port appended"
  value       = module.elasticache.cluster_address
}

output "msk_bootstrap_servers" {
  description = "A comma separated list of one or more MSK broker endpoints"
  value       = module.msk.bootstrap_brokers
}

output "s3_bucket_names" {
  description = "Names of the S3 buckets created"
  value = {
    raw_data     = module.s3_bucket_raw_data.s3_bucket_id
    processed    = module.s3_bucket_processed.s3_bucket_id
    analytics    = module.s3_bucket_analytics.s3_bucket_id
  }
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer"
  value       = module.alb.this_lb_dns_name
}
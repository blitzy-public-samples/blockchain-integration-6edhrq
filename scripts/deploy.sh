#!/bin/bash

set -e

# Build and push frontend
echo "Building and pushing frontend..."
cd frontend
docker build -t myapp-frontend:latest .
docker tag myapp-frontend:latest your-ecr-repo-url/myapp-frontend:latest
docker push your-ecr-repo-url/myapp-frontend:latest
cd ..

# Build and push backend
echo "Building and pushing backend..."
cd backend
docker build -t myapp-backend:latest .
docker tag myapp-backend:latest your-ecr-repo-url/myapp-backend:latest
docker push your-ecr-repo-url/myapp-backend:latest
cd ..

# Update ECS services
echo "Updating ECS services..."
aws ecs update-service --cluster your-cluster-name --service frontend-service --force-new-deployment
aws ecs update-service --cluster your-cluster-name --service backend-service --force-new-deployment

echo "Deployment completed successfully!"
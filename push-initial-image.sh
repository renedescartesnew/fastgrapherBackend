
#!/bin/bash

# Script to push initial Docker image to ECR before ECS service starts

set -e

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-infrastructure"

echo "📦 Getting ECR repository URI..."
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text \
    --region $AWS_REGION)

if [ -z "$ECR_URI" ]; then
    echo "❌ Could not get ECR URI. Make sure the CloudFormation stack is deployed."
    exit 1
fi

echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

echo "🏗️ Building Docker image for AMD64 platform..."
docker build --platform linux/amd64 -f Dockerfile.aws -t $ECR_URI:latest .

echo "📤 Pushing image to ECR..."
docker push $ECR_URI:latest

echo "✅ Initial image pushed successfully!"
echo "ECR URI: $ECR_URI"

# Wait a moment for the image to be available
echo "⏳ Waiting for image to be available..."
sleep 10

# Force ECS service to update with new image
echo "🔄 Forcing ECS service update..."
aws ecs update-service \
    --cluster ${PROJECT_NAME}-cluster \
    --service ${PROJECT_NAME}-backend-service \
    --force-new-deployment \
    --region $AWS_REGION || echo "Service update will happen after stack creation"

echo "✅ Deployment process completed!"

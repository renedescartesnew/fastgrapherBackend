
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

echo "🏗️ Building Docker image..."
docker build -f Dockerfile.aws -t $ECR_URI:latest .

echo "📤 Pushing image to ECR..."
docker push $ECR_URI:latest

echo "✅ Initial image pushed successfully!"
echo "ECR URI: $ECR_URI"

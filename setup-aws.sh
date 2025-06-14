
#!/bin/bash

# FastGrapher AWS Infrastructure Setup Script

set -e

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-infrastructure"

echo "🚀 Setting up FastGrapher AWS Infrastructure..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Please configure AWS CLI with 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Check if stack exists and its status
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_STATUS" = "ROLLBACK_FAILED" ] || [ "$STACK_STATUS" = "CREATE_FAILED" ] || [ "$STACK_STATUS" = "UPDATE_ROLLBACK_FAILED" ]; then
    echo "🧹 Found failed stack in $STACK_STATUS state. Cleaning up..."
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION
    echo "⏳ Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $AWS_REGION
    echo "✅ Failed stack cleaned up successfully"
fi

# Deploy CloudFormation stack
echo "📦 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file aws-infrastructure.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides ProjectName=$PROJECT_NAME \
    --capabilities CAPABILITY_IAM \
    --region $AWS_REGION

echo "✅ CloudFormation stack deployed successfully"

# Get ECR repository URI
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text \
    --region $AWS_REGION)

# Get Load Balancer DNS
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region $AWS_REGION)

echo "🎉 Infrastructure setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add these secrets to your GitHub repository:"
echo "   - AWS_ACCESS_KEY_ID: Your AWS access key"
echo "   - AWS_SECRET_ACCESS_KEY: Your AWS secret key"
echo ""
echo "2. Push your code to the main branch to trigger deployment"
echo ""
echo "📊 Resources created:"
echo "   - ECR Repository: $ECR_URI"
echo "   - Load Balancer: http://$ALB_DNS"
echo "   - ECS Cluster: ${PROJECT_NAME}-cluster"
echo "   - ECS Service: ${PROJECT_NAME}-backend-service"
echo ""
echo "🔧 To view your application once deployed:"
echo "   curl http://$ALB_DNS/api/health"


#!/bin/bash

# FastGrapher AWS Infrastructure Setup Script - Fixed Version

set -e

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-stack"

echo "🚀 Setting up FastGrapher AWS Infrastructure (Fixed Version)..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Please configure AWS CLI with 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Function to wait for stack deletion
wait_for_stack_deletion() {
    echo "⏳ Waiting for stack deletion to complete..."
    while true; do
        STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
        if [ "$STACK_STATUS" = "DOES_NOT_EXIST" ]; then
            echo "✅ Stack deletion completed"
            break
        fi
        echo "   Stack status: $STACK_STATUS"
        sleep 30
    done
}

# Check if stack exists and clean up if needed
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_STATUS" != "DOES_NOT_EXIST" ]; then
    echo "⚠️  Existing stack found in $STACK_STATUS state. Cleaning up..."
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION
    wait_for_stack_deletion
fi

# Also clean up the old infrastructure stack if it exists
OLD_STACK_STATUS=$(aws cloudformation describe-stacks --stack-name fastgrapher-infrastructure --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
if [ "$OLD_STACK_STATUS" != "DOES_NOT_EXIST" ]; then
    echo "🧹 Cleaning up old fastgrapher-infrastructure stack..."
    aws cloudformation delete-stack --stack-name fastgrapher-infrastructure --region $AWS_REGION
    
    echo "⏳ Waiting for old stack deletion to complete..."
    while true; do
        OLD_STACK_STATUS=$(aws cloudformation describe-stacks --stack-name fastgrapher-infrastructure --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
        if [ "$OLD_STACK_STATUS" = "DOES_NOT_EXIST" ]; then
            echo "✅ Old stack deletion completed"
            break
        fi
        echo "   Old stack status: $OLD_STACK_STATUS"
        sleep 30
    done
fi

# Step 1: Deploy CloudFormation stack with ECS service desired count = 0
echo "📦 Step 1: Deploying infrastructure with ECS service scaled to 0..."
aws cloudformation deploy \
    --template-file aws-infrastructure-fixed.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides ProjectName=$PROJECT_NAME \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION \
    --no-fail-on-empty-changeset

if [ $? -ne 0 ]; then
    echo "❌ CloudFormation deployment failed. Check the events:"
    echo "aws cloudformation describe-stack-events --stack-name $STACK_NAME"
    exit 1
fi

echo "✅ Infrastructure deployed successfully (ECS service at 0 capacity)"

# Step 2: Build and push Docker image
echo "🐳 Step 2: Building and pushing Docker image..."
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text \
    --region $AWS_REGION)

if [ -z "$ECR_URI" ]; then
    echo "❌ Could not get ECR URI from CloudFormation outputs."
    exit 1
fi

echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

echo "🏗️ Building Docker image for AMD64 platform..."
docker build --platform linux/amd64 -f Dockerfile.aws -t $ECR_URI:latest .

echo "📤 Pushing image to ECR..."
docker push $ECR_URI:latest

echo "✅ Image pushed successfully!"

# Step 3: Scale up the ECS service
echo "🔄 Step 3: Scaling up ECS service..."
aws ecs update-service \
    --cluster ${PROJECT_NAME}-cluster \
    --service ${PROJECT_NAME}-backend-service \
    --desired-count 1 \
    --region $AWS_REGION

echo "⏳ Waiting for service to become stable..."
aws ecs wait services-stable \
    --cluster ${PROJECT_NAME}-cluster \
    --services ${PROJECT_NAME}-backend-service \
    --region $AWS_REGION

# Get outputs
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region $AWS_REGION)

echo "🎉 Infrastructure setup complete!"
echo ""
echo "📊 Resources created:"
echo "   - ECR Repository: $ECR_URI"
echo "   - Load Balancer: http://$ALB_DNS"
echo "   - ECS Cluster: ${PROJECT_NAME}-cluster"
echo "   - ECS Service: ${PROJECT_NAME}-backend-service"
echo ""
echo "🔧 To test your application:"
echo "   curl http://$ALB_DNS/api/health"
echo ""
echo "🚀 Your application will be available at:"
echo "   http://$ALB_DNS"
echo ""
echo "⚠️  Note: It may take a few minutes for the load balancer to show the application as healthy."

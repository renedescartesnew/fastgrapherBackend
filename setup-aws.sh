
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
    if [[ "$STACK_STATUS" =~ ^(ROLLBACK_FAILED|CREATE_FAILED|UPDATE_ROLLBACK_FAILED|ROLLBACK_COMPLETE|UPDATE_ROLLBACK_COMPLETE)$ ]]; then
        echo "🧹 Found failed stack in $STACK_STATUS state. Cleaning up..."
        aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION
        wait_for_stack_deletion
    elif [[ "$STACK_STATUS" =~ ^(CREATE_IN_PROGRESS|UPDATE_IN_PROGRESS|DELETE_IN_PROGRESS)$ ]]; then
        echo "⚠️  Stack is currently in $STACK_STATUS state. Please wait for it to complete and try again."
        exit 1
    else
        echo "⚠️  Stack already exists in $STACK_STATUS state. Updating..."
    fi
fi

# Deploy CloudFormation stack
echo "📦 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file aws-infrastructure.yml \
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

echo "✅ CloudFormation stack deployed successfully"

# Push initial Docker image
echo "🐳 Pushing initial Docker image..."
chmod +x push-initial-image.sh
./push-initial-image.sh

if [ $? -ne 0 ]; then
    echo "❌ Failed to push initial Docker image"
    exit 1
fi

# Get outputs
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text \
    --region $AWS_REGION)

ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region $AWS_REGION)

echo "🎉 Infrastructure setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Move .github/workflows/aws-deploy.yml to your project root .github/workflows/ directory"
echo "2. Add these secrets to your GitHub repository settings:"
echo "   - AWS_ACCESS_KEY_ID: Your AWS access key"
echo "   - AWS_SECRET_ACCESS_KEY: Your AWS secret key"
echo ""
echo "3. Push your code to the main branch to trigger deployment:"
echo "   git add ."
echo "   git commit -m 'Add AWS deployment'"
echo "   git push origin main"
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

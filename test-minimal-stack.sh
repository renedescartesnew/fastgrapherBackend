
#!/bin/bash

set -e

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-minimal-test"

echo "🧪 Testing minimal CloudFormation template..."

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

# Clean up any existing test stack
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [ "$STACK_STATUS" != "DOES_NOT_EXIST" ]; then
    echo "🧹 Cleaning up existing test stack..."
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION
    
    echo "⏳ Waiting for deletion..."
    while true; do
        STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
        if [ "$STACK_STATUS" = "DOES_NOT_EXIST" ]; then
            echo "✅ Test stack deleted"
            break
        fi
        echo "   Status: $STACK_STATUS"
        sleep 15
    done
fi

# Deploy minimal test stack
echo "📦 Deploying minimal test stack..."
aws cloudformation deploy \
    --template-file aws-infrastructure-minimal.yml \
    --stack-name $STACK_NAME \
    --parameter-overrides ProjectName=$PROJECT_NAME \
    --region $AWS_REGION \
    --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
    echo "✅ Minimal stack deployed successfully!"
    echo "📋 Outputs:"
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs' \
        --region $AWS_REGION
    
    echo ""
    echo "🧹 Cleaning up test stack..."
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION
    echo "✅ Test completed successfully. You can now try the full deployment."
else
    echo "❌ Minimal stack failed. Getting error details..."
    aws cloudformation describe-stack-events \
        --stack-name $STACK_NAME \
        --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[Timestamp,LogicalResourceId,ResourceStatusReason]' \
        --output table
fi

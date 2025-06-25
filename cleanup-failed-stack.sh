
#!/bin/bash

# Comprehensive cleanup script for DELETE_FAILED CloudFormation stack

set -e

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-infrastructure"

echo "🧹 Comprehensive AWS Infrastructure Cleanup..."

# Function to wait for stack deletion
wait_for_deletion() {
    echo "⏳ Waiting for stack deletion to complete..."
    while true; do
        STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
        if [ "$STACK_STATUS" = "DOES_NOT_EXIST" ]; then
            echo "✅ Stack completely deleted!"
            break
        fi
        echo "   Current status: $STACK_STATUS"
        sleep 30
    done
}

# Step 1: Check current stack status
echo "📋 Checking current stack status..."
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
echo "Current status: $STACK_STATUS"

if [ "$STACK_STATUS" = "DOES_NOT_EXIST" ]; then
    echo "✅ Stack already deleted. Ready for fresh deployment!"
    exit 0
fi

# Step 2: Stop any remaining ECS tasks one by one
echo "🛑 Stopping ECS tasks individually..."
TASK_ARNS=$(aws ecs list-tasks --cluster fastgrapher-cluster --region $AWS_REGION --query 'taskArns' --output text 2>/dev/null || echo "")

if [ ! -z "$TASK_ARNS" ] && [ "$TASK_ARNS" != "None" ]; then
    echo "Found tasks to stop..."
    for TASK_ARN in $TASK_ARNS; do
        echo "Stopping task: $(basename $TASK_ARN)"
        aws ecs stop-task \
            --cluster fastgrapher-cluster \
            --task $TASK_ARN \
            --reason "Cleanup for stack deletion" \
            --region $AWS_REGION || echo "Task may already be stopped"
    done
    
    # Wait for tasks to stop
    echo "⏳ Waiting for tasks to stop..."
    sleep 60
else
    echo "No tasks found to stop"
fi

# Step 3: Try to delete ECS services manually
echo "🗑️  Attempting to delete ECS services..."
aws ecs update-service \
    --cluster fastgrapher-cluster \
    --service fastgrapher-backend-service \
    --desired-count 0 \
    --region $AWS_REGION 2>/dev/null || echo "Service update failed or doesn't exist"

sleep 30

aws ecs delete-service \
    --cluster fastgrapher-cluster \
    --service fastgrapher-backend-service \
    --region $AWS_REGION 2>/dev/null || echo "Service deletion failed or doesn't exist"

# Step 4: Wait a bit more for everything to settle
echo "⏳ Waiting for services to fully terminate..."
sleep 60

# Step 5: Try normal delete first
echo "🔧 Attempting normal stack deletion..."
aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION

# Wait a moment to see if it starts deleting
sleep 30
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")

if [[ "$STACK_STATUS" == "DELETE_IN_PROGRESS" ]]; then
    echo "✅ Stack deletion in progress!"
    wait_for_deletion
elif [[ "$STACK_STATUS" == "DELETE_FAILED" ]]; then
    echo "⚠️  Normal deletion failed. Using force delete with retain..."
    
    # Step 6: Force delete with retain
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION --retain-resources
    
    # Wait for completion
    wait_for_deletion
    
    # Step 7: Clean up any retained resources manually
    echo "🧹 Cleaning up any retained resources..."
    
    # Delete ECS cluster manually if it still exists
    aws ecs delete-cluster --cluster fastgrapher-cluster --region $AWS_REGION 2>/dev/null || echo "ECS cluster already deleted or doesn't exist"
    
    # Delete any remaining ECR images and repository
    aws ecr delete-repository \
        --repository-name fastgrapher-backend \
        --force \
        --region $AWS_REGION 2>/dev/null || echo "ECR repository already deleted or doesn't exist"
    
elif [[ "$STACK_STATUS" == "DOES_NOT_EXIST" ]]; then
    echo "✅ Stack deleted successfully!"
else
    echo "⚠️  Unexpected status: $STACK_STATUS"
    echo "Manual intervention may be required"
fi

echo ""
echo "🎉 Cleanup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Run './server/setup-aws.sh' to deploy fresh infrastructure"
echo "2. The new deployment will create clean resources"
echo ""

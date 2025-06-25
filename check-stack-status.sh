
#!/bin/bash

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-stack"

echo "🔍 Checking CloudFormation Stack Status..."

# Get stack status
STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].StackStatus' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "DOES_NOT_EXIST")

echo "Current Stack Status: $STACK_STATUS"

# Get recent events
echo ""
echo "📋 Recent Stack Events:"
aws cloudformation describe-stack-events \
    --stack-name $STACK_NAME \
    --query 'StackEvents[0:10].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
    --output table \
    --region $AWS_REGION

# Handle DELETE_FAILED state specifically
if [[ "$STACK_STATUS" == "DELETE_FAILED" ]]; then
    echo ""
    echo "🚨 Stack is in DELETE_FAILED state - this requires special handling!"
    echo ""
    echo "📋 Resources that failed to delete:"
    aws cloudformation describe-stack-events \
        --stack-name $STACK_NAME \
        --query 'StackEvents[?ResourceStatus==`DELETE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
        --output table \
        --region $AWS_REGION
    echo ""
    echo "💡 To fix this, you need to:"
    echo "1. Manually delete the failed resources (or retain them)"
    echo "2. Force delete the stack"
    echo ""
    echo "🔧 Run this command to force delete and retain failed resources:"
    echo "aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION --retain-resources"
    echo ""
    echo "🔧 Or try force delete without retaining (may fail again):"
    echo "aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION"
    echo ""
    echo "⚠️  If the above fails, you may need to manually delete resources in AWS console"
    echo "   then delete the stack."
    
# If stack is in other failed states, suggest cleanup
elif [[ "$STACK_STATUS" =~ ^(ROLLBACK_FAILED|CREATE_FAILED|UPDATE_ROLLBACK_FAILED|ROLLBACK_COMPLETE|UPDATE_ROLLBACK_COMPLETE|UPDATE_FAILED)$ ]]; then
    echo ""
    echo "⚠️  Stack is in a failed state: $STACK_STATUS"
    echo "💡 Recommended action: Clean up and redeploy"
    echo ""
    echo "Run this to clean up:"
    echo "aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION"
    echo ""
    echo "Then redeploy with:"
    echo "./setup-aws-fixed.sh"
    
elif [[ "$STACK_STATUS" =~ ^(DELETE_IN_PROGRESS)$ ]]; then
    echo ""
    echo "⏳ Stack deletion is in progress. Please wait..."
    echo "You can monitor progress with:"
    echo "watch -n 30 'aws cloudformation describe-stacks --stack-name $STACK_NAME --query \"Stacks[0].StackStatus\" --output text 2>/dev/null || echo \"DELETED\"'"
    
elif [[ "$STACK_STATUS" == "DOES_NOT_EXIST" ]]; then
    echo ""
    echo "✅ No stack exists. You can proceed with deployment:"
    echo "./setup-aws-fixed.sh"
    
else
    echo ""
    echo "✅ Stack is in normal state: $STACK_STATUS"
fi


#!/bin/bash

set -e

echo "🔧 Quick fix for ECS service issues..."

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"

# Stop all running tasks to force a clean restart
echo "🛑 Stopping current tasks..."
TASK_ARNS=$(aws ecs list-tasks \
    --cluster ${PROJECT_NAME}-cluster \
    --service-name ${PROJECT_NAME}-backend-service \
    --region $AWS_REGION \
    --query 'taskArns' \
    --output text)

if [ ! -z "$TASK_ARNS" ]; then
    for TASK_ARN in $TASK_ARNS; do
        echo "Stopping task: $TASK_ARN"
        aws ecs stop-task \
            --cluster ${PROJECT_NAME}-cluster \
            --task $TASK_ARN \
            --reason "Manual restart for configuration fix" \
            --region $AWS_REGION
    done
fi

# Get the correct task role ARN from CloudFormation
echo "🔍 Getting correct task role ARN..."
TASK_ROLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name ${PROJECT_NAME}-infrastructure \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ECSTaskRole`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$TASK_ROLE_ARN" ]; then
    # If not found in outputs, get it from the stack resources
    TASK_ROLE_ARN=$(aws cloudformation describe-stack-resources \
        --stack-name ${PROJECT_NAME}-infrastructure \
        --region $AWS_REGION \
        --query 'StackResources[?LogicalResourceId==`ECSTaskRole`].PhysicalResourceId' \
        --output text)
    
    if [ ! -z "$TASK_ROLE_ARN" ]; then
        TASK_ROLE_ARN="arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/$TASK_ROLE_ARN"
    fi
fi

echo "📋 Task Role ARN: $TASK_ROLE_ARN"

# Download current task definition
aws ecs describe-task-definition \
    --task-definition ${PROJECT_NAME}-task-def \
    --region $AWS_REGION \
    --query 'taskDefinition' > current-task-def.json

# Get execution role ARN
EXECUTION_ROLE_ARN=$(cat current-task-def.json | jq -r '.executionRoleArn')

echo "📋 Execution Role ARN: $EXECUTION_ROLE_ARN"

# Create new task definition with correct roles
cat > fixed-task-def.json << EOF
{
  "family": "${PROJECT_NAME}-task-def",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "${PROJECT_NAME}-backend",
      "image": "479623627289.dkr.ecr.us-east-1.amazonaws.com/${PROJECT_NAME}-backend:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "8080"
        },
        {
          "name": "HOST",
          "value": "0.0.0.0"
        },
        {
          "name": "MONGO_URI",
          "value": "mongodb+srv://renedescartesnew:FHUwCVuj5y6SL8nW@breakroomcupcluster.uudts.mongodb.net/fastgrapher?retryWrites=true&w=majority"
        },
        {
          "name": "JWT_SECRET",
          "value": "f/lXkHROS/yCC3fEGsubXkxfcWe3XnT29/CfUgV5kHs="
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fastgrapher",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

echo "🚀 Registering corrected task definition..."
aws ecs register-task-definition \
    --cli-input-json file://fixed-task-def.json \
    --region $AWS_REGION

echo "🔄 Updating service with corrected task definition..."
aws ecs update-service \
    --cluster ${PROJECT_NAME}-cluster \
    --service ${PROJECT_NAME}-backend-service \
    --task-definition ${PROJECT_NAME}-task-def \
    --force-new-deployment \
    --region $AWS_REGION

echo "⏳ Waiting a bit for deployment to start..."
sleep 30

echo "📊 Current service status:"
aws ecs describe-services \
    --cluster ${PROJECT_NAME}-cluster \
    --services ${PROJECT_NAME}-backend-service \
    --region $AWS_REGION \
    --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,PendingCount:pendingCount,TaskDefinition:taskDefinition}'

echo "🔍 Recent task events:"
aws ecs describe-services \
    --cluster ${PROJECT_NAME}-cluster \
    --services ${PROJECT_NAME}-backend-service \
    --region $AWS_REGION \
    --query 'services[0].events[0:3]'

# Clean up
rm -f current-task-def.json fixed-task-def.json

echo "✅ Service update initiated. Check the logs in CloudWatch for container startup issues."
echo "📊 Monitor progress with: aws ecs describe-services --cluster ${PROJECT_NAME}-cluster --services ${PROJECT_NAME}-backend-service --region $AWS_REGION"
EOF

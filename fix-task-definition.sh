
#!/bin/bash

set -e

echo "🔧 Fixing ECS Task Definition directly..."

# Get current task definition
echo "📥 Downloading current task definition..."
aws ecs describe-task-definition \
    --task-definition fastgrapher-task-def \
    --region us-east-1 \
    --query 'taskDefinition' > task-def-raw.json

# Get the actual role ARNs from the current task definition
EXECUTION_ROLE_ARN=$(cat task-def-raw.json | jq -r '.executionRoleArn')
TASK_ROLE_ARN=$(cat task-def-raw.json | jq -r '.taskRoleArn')

echo "📋 Using Role ARNs:"
echo "  Execution Role: $EXECUTION_ROLE_ARN"
echo "  Task Role: $TASK_ROLE_ARN"

# Create a clean task definition with CORRECTED environment variables
echo "✏️  Creating updated task definition with proper MongoDB URI..."
cat > task-def-fixed.json << 'EOF'
{
  "family": "fastgrapher-task-def",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "PLACEHOLDER_EXECUTION_ROLE",
  "taskRoleArn": "PLACEHOLDER_TASK_ROLE",
  "containerDefinitions": [
    {
      "name": "fastgrapher-backend",
      "image": "479623627289.dkr.ecr.us-east-1.amazonaws.com/fastgrapher-backend:latest",
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

# Update the task definition with correct role ARNs
jq --arg exec_role "$EXECUTION_ROLE_ARN" --arg task_role "$TASK_ROLE_ARN" \
   '.executionRoleArn = $exec_role | .taskRoleArn = $task_role' \
   task-def-fixed.json > task-def-final.json

echo "📝 Final task definition preview:"
echo "MongoDB URI: mongodb+srv://renedescartesnew:***@breakroomcupcluster.uudts.mongodb.net/fastgrapher?retryWrites=true&w=majority"
echo "JWT Secret: Set (hidden)"

echo "🚀 Registering new task definition..."
aws ecs register-task-definition \
    --cli-input-json file://task-def-final.json \
    --region us-east-1

echo "🔄 Updating ECS service to use new task definition..."
aws ecs update-service \
    --cluster fastgrapher-cluster \
    --service fastgrapher-backend-service \
    --task-definition fastgrapher-task-def \
    --force-new-deployment \
    --region us-east-1

echo "⏳ Waiting for service to stabilize..."
aws ecs wait services-stable \
    --cluster fastgrapher-cluster \
    --services fastgrapher-backend-service \
    --region us-east-1

echo "✅ Task definition updated successfully!"
echo "🧹 Cleaning up temporary files..."
rm -f task-def-raw.json task-def-fixed.json task-def-final.json

echo "🎉 Done! Your backend should now be running with the correct environment variables."

# Test the health endpoint
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name fastgrapher-infrastructure \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region us-east-1)

echo "🔍 Testing health endpoint..."
sleep 60  # Give it more time to start up
curl "http://$ALB_DNS/api/health" || echo "⚠️  Service may still be starting up..."

echo "📊 Checking service status:"
aws ecs describe-services \
    --cluster fastgrapher-cluster \
    --services fastgrapher-backend-service \
    --region us-east-1 \
    --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,PendingCount:pendingCount}'

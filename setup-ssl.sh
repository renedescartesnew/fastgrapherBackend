
#!/bin/bash

set -e

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-infrastructure"

echo "🔐 Setting up SSL Certificate for FastGrapher..."

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

# Get the current load balancer DNS name
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$ALB_DNS" ]; then
    echo "❌ Could not find load balancer DNS. Make sure your infrastructure is deployed."
    exit 1
fi

echo "📋 Current Load Balancer DNS: $ALB_DNS"
echo ""
echo "🎯 To enable HTTPS, you have two options:"
echo ""
echo "Option 1: Use a custom domain (Recommended)"
echo "1. Purchase a domain (e.g., yourdomain.com)"
echo "2. Create a hosted zone in Route 53"
echo "3. Request an SSL certificate for your domain"
echo "4. Update DNS to point to your load balancer"
echo ""
echo "Option 2: Use AWS Certificate Manager with the load balancer DNS"
echo "⚠️  Note: You cannot get an SSL certificate for AWS ELB DNS names directly"
echo ""

read -p "Do you have a custom domain you want to use? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your domain name (e.g., api.yourdomain.com): " DOMAIN_NAME
    
    echo "📋 Steps to complete SSL setup:"
    echo "1. Request SSL certificate:"
    echo "   aws acm request-certificate \\"
    echo "     --domain-name $DOMAIN_NAME \\"
    echo "     --validation-method DNS \\"
    echo "     --region $AWS_REGION"
    echo ""
    echo "2. Validate the certificate through DNS"
    echo "3. Get the certificate ARN and update the stack:"
    echo "   aws cloudformation deploy \\"
    echo "     --template-file aws-infrastructure.yml \\"
    echo "     --stack-name $STACK_NAME \\"
    echo "     --parameter-overrides ProjectName=$PROJECT_NAME SSLCertificateArn=YOUR_CERT_ARN \\"
    echo "     --capabilities CAPABILITY_NAMED_IAM \\"
    echo "     --region $AWS_REGION"
    echo ""
    echo "4. Create a CNAME record in your DNS pointing $DOMAIN_NAME to $ALB_DNS"
    
else
    echo "🔧 For now, let's configure your app to work with mixed content:"
    echo ""
    echo "The updated API configuration will:"
    echo "1. Try HTTPS first when your frontend is on HTTPS"
    echo "2. Fall back to HTTP if HTTPS fails"
    echo "3. Handle mixed content issues gracefully"
    echo ""
    echo "✅ Your app should now work, but for production you should:"
    echo "1. Get a custom domain"
    echo "2. Set up proper SSL certificate"
    echo "3. Update your infrastructure to use HTTPS"
fi

echo ""
echo "🧪 Testing current connection..."
echo "curl -f http://$ALB_DNS/api/health"
curl -f "http://$ALB_DNS/api/health" && echo "✅ HTTP connection working!" || echo "❌ HTTP connection failed"

echo ""
echo "💡 Your app should now handle the mixed content issue better."
echo "📱 Try refreshing your frontend application."

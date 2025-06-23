
#!/bin/bash

set -e

PROJECT_NAME="fastgrapher"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-infrastructure"

echo "🔐 Setting up SSL Certificate for FastGrapher Backend..."

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

# Option 1: Use a custom domain (Recommended)
echo "🎯 RECOMMENDED: Use a custom domain for SSL certificate"
echo ""
read -p "Do you have a custom domain you want to use? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your API domain name (e.g., api.yourdomain.com): " DOMAIN_NAME
    
    echo ""
    echo "📋 Step 1: Request SSL certificate for your domain"
    echo "Run this command:"
    echo ""
    echo "aws acm request-certificate \\"
    echo "  --domain-name $DOMAIN_NAME \\"
    echo "  --validation-method DNS \\"
    echo "  --region $AWS_REGION"
    echo ""
    
    read -p "Have you run the above command and got a certificate ARN? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter the certificate ARN: " CERT_ARN
        
        echo ""
        echo "📋 Step 2: Validate the certificate"
        echo "1. Go to AWS Certificate Manager console"
        echo "2. Find your certificate and click on it"
        echo "3. Follow the DNS validation steps"
        echo "4. Add the CNAME record to your domain's DNS"
        echo ""
        
        read -p "Have you completed DNS validation? (y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo "📋 Step 3: Update infrastructure with SSL certificate"
            echo "Updating CloudFormation stack with SSL certificate..."
            
            aws cloudformation deploy \
                --template-file aws-infrastructure.yml \
                --stack-name $STACK_NAME \
                --parameter-overrides ProjectName=$PROJECT_NAME SSLCertificateArn=$CERT_ARN \
                --capabilities CAPABILITY_NAMED_IAM \
                --region $AWS_REGION
            
            if [ $? -eq 0 ]; then
                echo "✅ Infrastructure updated successfully!"
                echo ""
                echo "📋 Step 4: Update DNS"
                echo "Create a CNAME record in your DNS:"
                echo "  Name: $DOMAIN_NAME"
                echo "  Value: $ALB_DNS"
                echo ""
                echo "🧪 Test your HTTPS endpoint:"
                echo "  curl https://$DOMAIN_NAME/api/health"
                echo ""
                echo "🎉 Once DNS propagates, your API will be available at:"
                echo "  https://$DOMAIN_NAME/api"
            else
                echo "❌ Failed to update infrastructure"
                exit 1
            fi
        else
            echo "⚠️  Please complete DNS validation first, then run this script again."
        fi
    else
        echo "⚠️  Please request a certificate first, then run this script again."
    fi
else
    echo ""
    echo "🔧 Alternative: Use AWS-provided domain with CloudFront"
    echo ""
    echo "Since you don't have a custom domain, here are your options:"
    echo ""
    echo "1. Purchase a domain from Route 53 or any domain registrar"
    echo "2. Use CloudFront distribution (more complex setup)"
    echo ""
    echo "For production, we strongly recommend getting a custom domain."
    echo "Domains typically cost around $12/year."
    echo ""
    echo "Would you like to:"
    echo "a) Purchase a domain through Route 53"
    echo "b) Set up CloudFront (advanced)"
    echo "c) Keep using HTTP for now (not recommended for production)"
    echo ""
    read -p "Choose option (a/b/c): " -n 1 -r
    echo
    
    case $REPLY in
        a|A)
            echo ""
            echo "📋 To purchase a domain through Route 53:"
            echo "1. Go to Route 53 console"
            echo "2. Click 'Register Domain'"
            echo "3. Search for available domains"
            echo "4. Complete the purchase"
            echo "5. Run this script again with your new domain"
            ;;
        b|B)
            echo ""
            echo "📋 CloudFront setup is more complex and requires:"
            echo "1. Creating a CloudFront distribution"
            echo "2. Using CloudFront's default SSL certificate"
            echo "3. Updating your frontend to use CloudFront URL"
            echo ""
            echo "This is beyond the scope of this script."
            echo "Consider purchasing a domain instead."
            ;;
        c|C)
            echo ""
            echo "⚠️  WARNING: Using HTTP in production is not secure!"
            echo "Your users' data will not be encrypted in transit."
            echo ""
            echo "For now, you can update your frontend to use HTTP,"
            echo "but please get SSL certificate as soon as possible."
            ;;
        *)
            echo "Invalid option. Please run the script again."
            ;;
    esac
fi

echo ""
echo "💡 For more information, see:"
echo "   - SSL_SETUP_GUIDE.md"
echo "   - https://docs.aws.amazon.com/acm/"

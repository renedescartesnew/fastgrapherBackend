
# AWS Deployment Guide

This guide will help you deploy the FastGrapher backend to AWS using ECS Fargate with automatic GitHub Actions deployment.

## Prerequisites

1. AWS CLI installed and configured
2. GitHub repository with admin access
3. Basic understanding of AWS services

## Quick Setup

### 1. Deploy AWS Infrastructure

```bash
chmod +x setup-aws.sh
./setup-aws.sh
```

This will create:
- VPC with public subnets
- ECR repository for Docker images
- ECS cluster with Fargate
- Application Load Balancer
- Security groups and IAM roles
- CloudWatch log groups

### 2. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `AWS_ACCESS_KEY_ID`: Your AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key

### 3. Deploy

Push your code to the `main` branch:

```bash
git add .
git commit -m "Add AWS deployment"
git push origin main
```

The GitHub Action will automatically:
1. Build your Docker image
2. Push it to ECR
3. Update the ECS service
4. Deploy the new version

## Environment Variables

The following environment variables are automatically set in the ECS task:
- `NODE_ENV=production`
- `PORT=8080`

To add more environment variables:
1. Update the ECS task definition in `aws-infrastructure.yml`
2. Redeploy the CloudFormation stack

## Monitoring

- **Logs**: View in CloudWatch under `/ecs/fastgrapher`
- **Health Check**: `http://your-load-balancer-dns/api/health`
- **ECS Console**: Monitor service status and scaling

## Scaling

To adjust the number of running instances:
1. Go to ECS Console
2. Select your service
3. Update the "Desired count"

## Custom Domain (Optional)

To use a custom domain:
1. Create a certificate in AWS Certificate Manager
2. Update the ALB listener to use HTTPS
3. Add Route 53 records pointing to the ALB

## Costs

Estimated monthly cost for minimal setup:
- ALB: ~$16/month
- ECS Fargate (1 task): ~$15/month
- ECR: ~$1/month
- Data transfer: Variable

## Troubleshooting

### Build Failures
- Check GitHub Actions logs
- Ensure AWS credentials are correct
- Verify ECR repository permissions

### Service Won't Start
- Check ECS task logs in CloudWatch
- Verify health check endpoint is responding
- Check security group rules

### Can't Access Application
- Verify ALB security group allows port 80/443
- Check if ECS tasks are running and healthy
- Confirm target group health checks are passing

## Cleanup

To remove all AWS resources:

```bash
aws cloudformation delete-stack --stack-name fastgrapher-infrastructure --region us-east-1
```

## Support

If you encounter issues:
1. Check CloudWatch logs
2. Review ECS service events
3. Verify GitHub Actions workflow logs

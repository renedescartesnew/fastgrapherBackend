
# SSL Certificate Setup Guide

This guide will help you set up HTTPS for your FastGrapher backend on AWS.

## Current Status

Your app currently has a mixed content issue:
- Frontend: HTTPS (Firebase Hosting)
- Backend: HTTP (AWS Load Balancer)

Browsers block HTTP requests from HTTPS pages for security.

## Quick Fix (Already Applied)

The API configuration has been updated to:
1. Detect if your frontend is on HTTPS
2. Try HTTPS connection first
3. Fall back to HTTP if HTTPS fails
4. Handle mixed content gracefully

## Proper SSL Setup

### Option 1: Custom Domain (Recommended)

1. **Get a domain** (e.g., from Route 53, GoDaddy, etc.)

2. **Request SSL Certificate:**
   ```bash
   aws acm request-certificate \
     --domain-name api.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

3. **Validate Certificate:**
   - Go to AWS Certificate Manager console
   - Follow DNS validation steps
   - Add CNAME record to your domain's DNS

4. **Update Infrastructure:**
   ```bash
   # Get certificate ARN from ACM console
   aws cloudformation deploy \
     --template-file aws-infrastructure.yml \
     --stack-name fastgrapher-infrastructure \
     --parameter-overrides ProjectName=fastgrapher SSLCertificateArn=YOUR_CERT_ARN \
     --capabilities CAPABILITY_NAMED_IAM \
     --region us-east-1
   ```

5. **Update DNS:**
   - Create CNAME record: `api.yourdomain.com` → `your-load-balancer-dns.elb.amazonaws.com`

### Option 2: CloudFront (Alternative)

If you can't get a custom domain:

1. Set up CloudFront distribution
2. Use CloudFront's SSL certificate
3. Point CloudFront to your load balancer
4. Update your API URL to use CloudFront

## Testing

After SSL setup:
```bash
curl https://your-domain.com/api/health
```

## Update Frontend

Once HTTPS is working, update your API URL in the code to always use HTTPS.

## Costs

- Custom Domain: ~$12/year
- SSL Certificate: Free (AWS Certificate Manager)
- No additional AWS costs for HTTPS

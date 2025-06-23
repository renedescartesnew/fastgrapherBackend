
# SSL Certificate Setup Guide for FastGrapher

This guide will walk you through setting up HTTPS for your FastGrapher backend on AWS.

## Prerequisites

- AWS CLI configured with appropriate permissions
- Domain name (recommended) or willingness to use CloudFront
- Access to your domain's DNS settings

## Step 1: Choose Your Approach

### Option A: Custom Domain (Recommended)
- Purchase a domain (e.g., yourdomain.com)
- Use AWS Certificate Manager for free SSL certificate
- Point your domain to your load balancer

### Option B: CloudFront Distribution
- Use AWS CloudFront with default SSL certificate
- More complex setup but works without custom domain

## Step 2: Request SSL Certificate (Option A)

1. **Request certificate using AWS CLI:**
   ```bash
   aws acm request-certificate \
     --domain-name api.yourdomain.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Note the Certificate ARN** from the output.

## Step 3: Validate Certificate

1. Go to [AWS Certificate Manager Console](https://console.aws.amazon.com/acm/)
2. Find your certificate and click on it
3. You'll see DNS validation records to add
4. Add the CNAME record to your domain's DNS:
   - **Name**: `_validation-string.api.yourdomain.com`
   - **Value**: `_validation-value.acm-validations.aws.`

5. Wait for validation (can take up to 30 minutes)

## Step 4: Update Infrastructure

Run the SSL setup script:
```bash
cd server
chmod +x setup-ssl-certificate.sh
./setup-ssl-certificate.sh
```

Or manually update the CloudFormation stack:
```bash
aws cloudformation deploy \
  --template-file aws-infrastructure.yml \
  --stack-name fastgrapher-infrastructure \
  --parameter-overrides ProjectName=fastgrapher SSLCertificateArn=YOUR_CERT_ARN \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

## Step 5: Update DNS

Create a CNAME record in your domain's DNS:
- **Name**: `api.yourdomain.com`
- **Value**: `your-load-balancer-dns.elb.amazonaws.com`

## Step 6: Test HTTPS

Test your new HTTPS endpoint:
```bash
curl https://api.yourdomain.com/api/health
```

## Step 7: Update Frontend

Update your frontend API configuration to use the new HTTPS URL:
```typescript
// In src/lib/api.ts
const httpsApiUrl = "https://api.yourdomain.com/api";
```

## Troubleshooting

### Certificate Validation Issues
- Check DNS records are correct
- Wait up to 30 minutes for DNS propagation
- Ensure you're using the exact validation records from ACM

### Load Balancer Issues
- Verify security groups allow port 443
- Check that certificate is in "Issued" status
- Ensure certificate ARN is correct in CloudFormation

### DNS Issues
- Use `dig` or `nslookup` to verify DNS records
- Check TTL settings (lower TTL for faster propagation during setup)

## Cost Information

- **Domain**: ~$12/year (varies by TLD)
- **SSL Certificate**: Free (AWS Certificate Manager)
- **Load Balancer**: No additional cost for HTTPS

## Security Best Practices

1. **HTTP to HTTPS Redirect**: Automatically configured in the infrastructure
2. **Security Headers**: Consider adding security headers in your application
3. **Regular Certificate Renewal**: ACM handles this automatically

## Alternative: CloudFront Setup

If you can't use a custom domain:

1. Create CloudFront distribution
2. Set origin to your load balancer
3. Use CloudFront's default SSL certificate
4. Update frontend to use CloudFront URL

This is more complex but works without a custom domain.

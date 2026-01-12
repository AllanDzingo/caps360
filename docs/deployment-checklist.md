# CAPS360 Azure Deployment Checklist

## Pre-Deployment Setup

### Azure Account & Permissions
- [ ] Azure subscription created and active
- [ ] Appropriate Azure permissions assigned (Contributor or Owner role)
- [ ] Azure CLI installed and logged in (`az login`)
- [ ] Resource quotas verified in target region

### Environment Configuration
- [ ] Environment variables defined for the target environment (dev/staging/prod)
- [ ] `.env.prod`, `.env.staging`, or `.env.dev` file created with:
  - [ ] `NODE_ENV` set correctly
  - [ ] `JWT_SECRET` defined (generate with: `openssl rand -base64 32`)
  - [ ] `SUPABASE_URL` and keys configured
  - [ ] API keys for Gemini, Paystack configured
  - [ ] Database connection strings validated
  - [ ] Storage configuration (if using Azure Blob Storage)

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No console errors in local development
- [ ] Dependencies security audit passed (`npm audit`)
- [ ] Code review completed
- [ ] All changes committed to version control

### Frontend Preparation
- [ ] `VITE_API_URL` environment variable correct for target environment
- [ ] `staticwebapp.config.json` reviewed
- [ ] Security headers configured
- [ ] Build optimization verified
- [ ] Asset optimization complete (images compressed, etc.)
- [ ] PWA configuration updated (if applicable)

### Backend Preparation
- [ ] Database schema migrations prepared
- [ ] API endpoints tested
- [ ] Error handling comprehensive
- [ ] Rate limiting configured
- [ ] Security middleware enabled
- [ ] Logging configuration appropriate
- [ ] Health check endpoint (`/health`) implemented

## Deployment Execution

### Pre-Deployment Commands

#### Azure Setup
- [ ] Verify Azure subscription: `az account show`
- [ ] Check region availability: `az account list-locations`
- [ ] Verify quotas: `az vm usage list --location eastus`

#### Resource Group
- [ ] Resource group will be created or verified by script
- [ ] Naming convention followed: `caps360-<environment>`

#### Backend Deployment
- [ ] Backend builds successfully: `npm run build`
- [ ] `dist` directory created and contains compiled code
- [ ] App Service Plan created with appropriate SKU
- [ ] Web App created with Node.js 20 runtime
- [ ] Environment variables set in Web App configuration
- [ ] Application deployed via zip deployment
- [ ] Backend is accessible and responding to requests

#### Frontend Deployment
- [ ] Frontend builds successfully: `npm run build`
- [ ] `dist` directory created with optimized assets
- [ ] Static Web App created
- [ ] Frontend deployed via Static Web Apps CLI
- [ ] Frontend is accessible and loads correctly
- [ ] API calls route to correct backend

#### Database (if using Azure PostgreSQL)
- [ ] PostgreSQL server created
- [ ] Firewall rules configured
- [ ] Database created and schema applied
- [ ] Connection string stored securely
- [ ] Backups enabled and tested
- [ ] High availability configured (if prod)

### Monitoring & Health Checks
- [ ] Application Insights instance created
- [ ] Instrumentation key configured in backend
- [ ] Backend health endpoint responding: `curl https://[backend-url]/health`
- [ ] Frontend loading without errors
- [ ] API endpoint responding: `curl https://[backend-url]/api/health`
- [ ] Static assets loading correctly
- [ ] CORS properly configured

## Post-Deployment Verification

### Functional Testing
- [ ] Backend API endpoints tested
- [ ] Frontend UI renders correctly
- [ ] Authentication flow works
- [ ] User registration functional
- [ ] Payment flow tested (Paystack/PayFast)
- [ ] Content delivery working
- [ ] Progress tracking functional
- [ ] Analytics capturing correctly

### Performance Testing
- [ ] Page load times acceptable (< 3s)
- [ ] API response times acceptable (< 500ms)
- [ ] Database queries optimized
- [ ] Static assets served efficiently
- [ ] No memory leaks detected
- [ ] CPU usage within limits

### Security Verification
- [ ] HTTPS enforced on all endpoints
- [ ] Security headers present and correct:
  - [ ] Content-Security-Policy
  - [ ] X-Content-Type-Options
  - [ ] X-Frame-Options
  - [ ] X-XSS-Protection
- [ ] CORS configured correctly
- [ ] JWT tokens validated
- [ ] API keys not exposed in logs
- [ ] Secrets stored in Key Vault
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled

### Logging & Monitoring
- [ ] Application Insights receiving data
- [ ] Logs visible in Azure portal
- [ ] Error tracking working
- [ ] Performance metrics collected
- [ ] Custom metrics configured
- [ ] Alerts configured for errors

### Database Verification (if applicable)
- [ ] Connection string validated
- [ ] Schema created successfully
- [ ] Test data loaded
- [ ] Backups confirmed
- [ ] Replication working (if configured)
- [ ] Read replicas responding (if configured)

## Domain & SSL Configuration

### Custom Domain (if applicable)
- [ ] Custom domain DNS records configured
- [ ] CNAME/A record pointing to Azure resource
- [ ] SSL certificate provisioned automatically
- [ ] Certificate auto-renewal configured
- [ ] Domain accessible without errors
- [ ] Redirect from www handled

### CDN Configuration (optional)
- [ ] Azure CDN created and configured
- [ ] Origin configured correctly
- [ ] Cache rules optimized
- [ ] Geo-distribution enabled
- [ ] Compression enabled

## CI/CD Pipeline Setup

### GitHub Actions (optional)
- [ ] `.github/workflows/deploy-azure.yml` created
- [ ] `AZURE_CREDENTIALS` secret configured
- [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN` secret configured
- [ ] Workflow tested manually
- [ ] Automatic deployments triggering correctly
- [ ] Notifications configured

### Azure DevOps (alternative)
- [ ] Pipeline yaml file created
- [ ] Service connections configured
- [ ] Build artifacts generated
- [ ] Release pipeline created
- [ ] Approval gates configured
- [ ] Scheduled releases working

## Cost & Quotas

### Azure Resources
- [ ] App Service Plan SKU appropriate for environment
- [ ] Static Web App tier meets requirements
- [ ] Database SKU sized correctly
- [ ] Storage quotas allocated
- [ ] Reserved instances evaluated for prod
- [ ] Cost estimates reviewed

### Monitoring Costs
- [ ] Application Insights sampling configured
- [ ] Data retention policies set
- [ ] Cost alerts configured
- [ ] Budget limits in place

## Backup & Disaster Recovery

### Backups Configured
- [ ] App Service backups enabled
- [ ] Database automated backups enabled
- [ ] Backup retention period set (min 7 days)
- [ ] Backup restoration tested
- [ ] Geographic redundancy enabled (prod)

### Disaster Recovery Plan
- [ ] Failover procedures documented
- [ ] RTO/RPO targets defined
- [ ] Failover tested
- [ ] Runbooks created for common issues

## Documentation & Knowledge Transfer

### Deployment Documentation
- [ ] Deployment guide completed
- [ ] Architecture diagrams updated
- [ ] Environment configuration documented
- [ ] Known issues documented
- [ ] Troubleshooting guide completed

### Team Knowledge
- [ ] Team trained on deployment process
- [ ] On-call runbooks shared
- [ ] Alert handling procedures documented
- [ ] Escalation process defined

## Post-Deployment Monitoring (First 24 Hours)

### Real-time Monitoring
- [ ] Error rates stable and low
- [ ] Performance metrics within acceptable range
- [ ] No unusual database activity
- [ ] Logs reviewed for warnings
- [ ] User reports monitored

### Scheduled Checks
- [ ] Daily review of Application Insights
- [ ] Database performance monitored
- [ ] API latency acceptable
- [ ] User feedback collected
- [ ] Incident response tested if issues found

## Sign-off

- [ ] Deployment lead: _________________ Date: _______
- [ ] QA verification: _________________ Date: _______
- [ ] Operations approval: _________________ Date: _______
- [ ] Product manager: _________________ Date: _______

## Notes

```
[Space for deployment notes, issues encountered, and resolutions]
```

## Rollback Plan

If issues are found post-deployment:

1. **Immediate Actions**
   - [ ] Notify team and stakeholders
   - [ ] Document issue details
   - [ ] Check recent code changes

2. **Rollback Procedure**
   - [ ] Identify last known good deployment
   - [ ] Run deployment script with previous version
   - [ ] Verify rollback successful
   - [ ] Update stakeholders

3. **Post-Rollback**
   - [ ] Analyze root cause
   - [ ] Plan fixes
   - [ ] Schedule redeployment
   - [ ] Document lessons learned

## Contact Information

- **Azure Subscription Owner**: _______________________
- **DevOps Lead**: _______________________
- **Backend Lead**: _______________________
- **Frontend Lead**: _______________________
- **Database Administrator**: _______________________
- **On-call Engineer**: _______________________

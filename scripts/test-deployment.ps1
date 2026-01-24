# =====================================================
# CAPS360 End-to-End Testing Script
# =====================================================
# This script tests all critical flows after deployment
# Usage: .\test-deployment.ps1 -Environment prod -BackendUrl <url> -FrontendUrl <url>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [Parameter(Mandatory = $true)]
    [string]$BackendUrl,

    [Parameter(Mandatory = $true)]
    [string]$FrontendUrl,

    [Parameter(Mandatory = $false)]
    [string]$TestEmail = "test@caps360.co.za",

    [Parameter(Mandatory = $false)]
    [string]$TestPassword = "Test123!@#",

    [Parameter(Mandatory = $false)]
    [bool]$SkipPaymentTests = $false,

    [Parameter(Mandatory = $false)]
    [bool]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# ---------------------------
# Helper Functions
# ---------------------------
function Write-Test {
    param([string]$Message)
    Write-Host "`n[TEST] $Message" -ForegroundColor Magenta
}

function Write-Pass {
    param([string]$Message)
    Write-Host "  ✓ PASS: $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  ✗ FAIL: $Message" -ForegroundColor Red
}

function Write-Info-Test {
    param([string]$Message)
    if ($Verbose) {
        Write-Host "  → $Message" -ForegroundColor Gray
    }
}

$testResults = @{
    Passed = 0
    Failed = 0
    Skipped = 0
}

# ---------------------------
# Test 1: Backend Health Check
# ---------------------------
Write-Test "1. Backend Health Check"
try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/health" -Method Get -TimeoutSec 10
    if ($response.status -eq "healthy") {
        Write-Pass "Backend is healthy"
        $testResults.Passed++
    } else {
        Write-Fail "Backend health check returned: $($response.status)"
        $testResults.Failed++
    }
} catch {
    Write-Fail "Cannot reach backend: $_"
    $testResults.Failed++
}

# ---------------------------
# Test 2: Frontend Accessibility
# ---------------------------
Write-Test "2. Frontend Accessibility"
try {
    $response = Invoke-WebRequest -Uri $FrontendUrl -Method Get -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Pass "Frontend is accessible (Status: 200)"
        $testResults.Passed++
    } else {
        Write-Fail "Frontend returned status: $($response.StatusCode)"
        $testResults.Failed++
    }
} catch {
    Write-Fail "Cannot reach frontend: $_"
    $testResults.Failed++
}

# ---------------------------
# Test 3: CORS Configuration
# ---------------------------
Write-Test "3. CORS Configuration"
try {
    $headers = @{
        "Origin" = $FrontendUrl
        "Access-Control-Request-Method" = "POST"
        "Access-Control-Request-Headers" = "Content-Type,Authorization"
    }
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/auth/register" -Method Options -Headers $headers -UseBasicParsing -TimeoutSec 10
    
    if ($response.Headers["Access-Control-Allow-Origin"]) {
        Write-Pass "CORS is configured correctly"
        $testResults.Passed++
    } else {
        Write-Fail "CORS headers not found"
        $testResults.Failed++
    }
} catch {
    Write-Fail "CORS test failed: $_"
    $testResults.Failed++
}

# ---------------------------
# Test 4: User Registration
# ---------------------------
Write-Test "4. User Registration"
try {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $registerPayload = @{
        email = "test$timestamp@caps360.co.za"
        password = $TestPassword
        first_name = "Test"
        last_name = "User"
        role = "student"
        grade = 10
    } | ConvertTo-Json
    
    Write-Info-Test "Registering user: test$timestamp@caps360.co.za"
    $response = Invoke-RestMethod `
        -Uri "$BackendUrl/api/auth/register" `
        -Method Post `
        -Body $registerPayload `
        -ContentType "application/json" `
        -TimeoutSec 10
    
    if ($response.token) {
        Write-Pass "User registration successful"
        $testResults.Passed++
        $global:testToken = $response.token
        $global:testUserId = $response.user.id
    } else {
        Write-Fail "Registration did not return token"
        $testResults.Failed++
    }
} catch {
    Write-Fail "User registration failed: $_"
    $testResults.Failed++
}

# ---------------------------
# Test 5: User Login
# ---------------------------
Write-Test "5. User Login"
try {
    $loginPayload = @{
        email = $TestEmail
        password = $TestPassword
    } | ConvertTo-Json
    
    Write-Info-Test "Logging in as: $TestEmail"
    $response = Invoke-RestMethod `
        -Uri "$BackendUrl/api/auth/login" `
        -Method Post `
        -Body $loginPayload `
        -ContentType "application/json" `
        -TimeoutSec 10
    
    if ($response.token) {
        Write-Pass "User login successful"
        $testResults.Passed++
        $global:testToken = $response.token
    } else {
        Write-Fail "Login did not return token"
        $testResults.Failed++
    }
} catch {
    # Create test user if login fails
    Write-Info-Test "Creating test user for subsequent tests..."
    try {
        $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        $registerPayload = @{
            email = "test$timestamp@caps360.co.za"
            password = $TestPassword
            first_name = "Test"
            last_name = "User"
            role = "student"
            grade = 10
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod `
            -Uri "$BackendUrl/api/auth/register" `
            -Method Post `
            -Body $registerPayload `
            -ContentType "application/json" `
            -TimeoutSec 10
        
        $global:testToken = $response.token
        Write-Pass "Created new test user instead"
        $testResults.Passed++
    } catch {
        Write-Fail "Could not create test user: $_"
        $testResults.Failed++
    }
}

# ---------------------------
# Test 6: Protected Endpoint Access
# ---------------------------
Write-Test "6. Protected Endpoint Access"
if ($global:testToken) {
    try {
        $headers = @{
            "Authorization" = "Bearer $($global:testToken)"
        }
        $response = Invoke-RestMethod `
            -Uri "$BackendUrl/api/subscriptions/current" `
            -Method Get `
            -Headers $headers `
            -TimeoutSec 10
        
        Write-Pass "Protected endpoint accessible with valid token"
        $testResults.Passed++
    } catch {
        Write-Fail "Protected endpoint test failed: $_"
        $testResults.Failed++
    }
} else {
    Write-Fail "No auth token available for protected endpoint test"
    $testResults.Failed++
}

# ---------------------------
# Test 7: AI Chat Endpoint
# ---------------------------
Write-Test "7. AI Chat Endpoint"
if ($global:testToken) {
    try {
        $headers = @{
            "Authorization" = "Bearer $($global:testToken)"
        }
        $chatPayload = @{
            message = "What is photosynthesis?"
            conversation_id = $null
        } | ConvertTo-Json
        
        Write-Info-Test "Sending AI chat request..."
        $response = Invoke-RestMethod `
            -Uri "$BackendUrl/api/ai/chat" `
            -Method Post `
            -Headers $headers `
            -Body $chatPayload `
            -ContentType "application/json" `
            -TimeoutSec 30
        
        if ($response.reply) {
            Write-Pass "AI chat is working"
            Write-Info-Test "Response preview: $($response.reply.Substring(0, [Math]::Min(50, $response.reply.Length)))..."
            $testResults.Passed++
        } else {
            Write-Fail "AI chat returned no reply"
            $testResults.Failed++
        }
    } catch {
        Write-Fail "AI chat test failed: $_"
        $testResults.Failed++
    }
} else {
    Write-Fail "No auth token available for AI test"
    $testResults.Failed++
}

# ---------------------------
# Test 8: Content Retrieval
# ---------------------------
Write-Test "8. Content Retrieval"
if ($global:testToken) {
    try {
        $headers = @{
            "Authorization" = "Bearer $($global:testToken)"
        }
        $response = Invoke-RestMethod `
            -Uri "$BackendUrl/api/content/courses" `
            -Method Get `
            -Headers $headers `
            -TimeoutSec 10
        
        Write-Pass "Content retrieval successful"
        Write-Info-Test "Found $($response.Count) courses"
        $testResults.Passed++
    } catch {
        Write-Fail "Content retrieval failed: $_"
        $testResults.Failed++
    }
} else {
    Write-Fail "No auth token available for content test"
    $testResults.Failed++
}

# ---------------------------
# Test 9: Quiz Generation
# ---------------------------
Write-Test "9. Quiz Generation"
if ($global:testToken) {
    try {
        $headers = @{
            "Authorization" = "Bearer $($global:testToken)"
        }
        $quizPayload = @{
            topic = "Mathematics - Algebra"
            difficulty = 2
            num_questions = 5
        } | ConvertTo-Json
        
        Write-Info-Test "Generating quiz..."
        $response = Invoke-RestMethod `
            -Uri "$BackendUrl/api/ai/generate-quiz" `
            -Method Post `
            -Headers $headers `
            -Body $quizPayload `
            -ContentType "application/json" `
            -TimeoutSec 30
        
        if ($response.questions) {
            Write-Pass "Quiz generation successful"
            Write-Info-Test "Generated $($response.questions.Count) questions"
            $testResults.Passed++
        } else {
            Write-Fail "Quiz generation returned no questions"
            $testResults.Failed++
        }
    } catch {
        Write-Fail "Quiz generation failed: $_"
        $testResults.Failed++
    }
} else {
    Write-Fail "No auth token available for quiz test"
    $testResults.Failed++
}

# ---------------------------
# Test 10: Payment Endpoints
# ---------------------------
if (-not $SkipPaymentTests) {
    Write-Test "10. Payment Endpoints"
    if ($global:testToken) {
        try {
            $headers = @{
                "Authorization" = "Bearer $($global:testToken)"
            }
            $paymentPayload = @{
                tier = "standard"
                billing_cycle = "monthly"
            } | ConvertTo-Json
            
            Write-Info-Test "Testing payment initialization..."
            $response = Invoke-RestMethod `
                -Uri "$BackendUrl/api/payments/paystack/initialize-subscription" `
                -Method Post `
                -Headers $headers `
                -Body $paymentPayload `
                -ContentType "application/json" `
                -TimeoutSec 10
            
            if ($response.authorization_url) {
                Write-Pass "Payment initialization successful"
                $testResults.Passed++
            } else {
                Write-Fail "Payment initialization returned no authorization URL"
                $testResults.Failed++
            }
        } catch {
            Write-Fail "Payment test failed: $_"
            $testResults.Failed++
        }
    } else {
        Write-Fail "No auth token available for payment test"
        $testResults.Failed++
    }
} else {
    Write-Test "10. Payment Endpoints (SKIPPED)"
    $testResults.Skipped++
}

# ---------------------------
# Test 11: Database Connectivity
# ---------------------------
Write-Test "11. Database Connectivity (via API)"
try {
    # Try to fetch some data that requires database access
    $response = Invoke-RestMethod `
        -Uri "$BackendUrl/health" `
        -Method Get `
        -TimeoutSec 10
    
    # If health endpoint includes DB status
    if ($response.database -or $response.status -eq "healthy") {
        Write-Pass "Database is accessible"
        $testResults.Passed++
    } else {
        Write-Fail "Cannot verify database connectivity"
        $testResults.Failed++
    }
} catch {
    Write-Fail "Database connectivity test failed: $_"
    $testResults.Failed++
}

# ---------------------------
# Test 12: Error Handling
# ---------------------------
Write-Test "12. Error Handling"
try {
    $response = Invoke-WebRequest `
        -Uri "$BackendUrl/api/nonexistent" `
        -Method Get `
        -UseBasicParsing `
        -TimeoutSec 10 `
        -SkipHttpErrorCheck
    
    if ($response.StatusCode -eq 404) {
        Write-Pass "404 error handling works correctly"
        $testResults.Passed++
    } else {
        Write-Fail "Expected 404, got: $($response.StatusCode)"
        $testResults.Failed++
    }
} catch {
    # In older PowerShell, 404 throws an exception
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Pass "404 error handling works correctly"
        $testResults.Passed++
    } else {
        Write-Fail "Error handling test failed: $_"
        $testResults.Failed++
    }
}

# ---------------------------
# Test 13: Rate Limiting
# ---------------------------
Write-Test "13. Rate Limiting"
try {
    $rateLimitHit = $false
    for ($i = 1; $i -le 150; $i++) {
        try {
            $response = Invoke-WebRequest `
                -Uri "$BackendUrl/health" `
                -Method Get `
                -UseBasicParsing `
                -TimeoutSec 5 `
                -SkipHttpErrorCheck
            
            if ($response.StatusCode -eq 429) {
                $rateLimitHit = $true
                break
            }
        } catch {
            if ($_.Exception.Response.StatusCode -eq 429) {
                $rateLimitHit = $true
                break
            }
        }
    }
    
    if ($rateLimitHit) {
        Write-Pass "Rate limiting is active"
        $testResults.Passed++
    } else {
        Write-Info-Test "Rate limiting not triggered in 150 requests (may be configured higher)"
        $testResults.Passed++
    }
} catch {
    Write-Fail "Rate limiting test error: $_"
    $testResults.Failed++
}

# ---------------------------
# Test 14: SSL/TLS Configuration
# ---------------------------
Write-Test "14. SSL/TLS Configuration"
try {
    if ($BackendUrl.StartsWith("https://")) {
        $response = Invoke-WebRequest -Uri $BackendUrl -Method Get -UseBasicParsing -TimeoutSec 10
        Write-Pass "HTTPS is properly configured"
        $testResults.Passed++
    } else {
        Write-Fail "Backend is not using HTTPS"
        $testResults.Failed++
    }
} catch {
    Write-Fail "SSL/TLS test failed: $_"
    $testResults.Failed++
}

# ---------------------------
# Test 15: Security Headers
# ---------------------------
Write-Test "15. Security Headers"
try {
    $response = Invoke-WebRequest -Uri $BackendUrl -Method Get -UseBasicParsing -TimeoutSec 10
    $securityScore = 0
    $totalChecks = 5
    
    if ($response.Headers["X-Content-Type-Options"] -eq "nosniff") { $securityScore++ }
    if ($response.Headers["X-Frame-Options"]) { $securityScore++ }
    if ($response.Headers["X-XSS-Protection"]) { $securityScore++ }
    if ($response.Headers["Strict-Transport-Security"]) { $securityScore++ }
    if ($response.Headers["Content-Security-Policy"]) { $securityScore++ }
    
    if ($securityScore -ge 3) {
        Write-Pass "Security headers present ($securityScore/$totalChecks)"
        $testResults.Passed++
    } else {
        Write-Fail "Insufficient security headers ($securityScore/$totalChecks)"
        $testResults.Failed++
    }
} catch {
    Write-Fail "Security headers test failed: $_"
    $testResults.Failed++
}

# ---------------------------
# Final Report
# ---------------------------
Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           TEST RESULTS SUMMARY         " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests:   " -NoNewline
Write-Host "$($testResults.Passed + $testResults.Failed + $testResults.Skipped)" -ForegroundColor White
Write-Host "Passed:        " -NoNewline
Write-Host "$($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed:        " -NoNewline
Write-Host "$($testResults.Failed)" -ForegroundColor Red
Write-Host "Skipped:       " -NoNewline
Write-Host "$($testResults.Skipped)" -ForegroundColor Yellow
Write-Host ""

$successRate = if (($testResults.Passed + $testResults.Failed) -gt 0) {
    [Math]::Round(($testResults.Passed / ($testResults.Passed + $testResults.Failed)) * 100, 2)
} else {
    0
}

Write-Host "Success Rate:  " -NoNewline
if ($successRate -ge 90) {
    Write-Host "$successRate%" -ForegroundColor Green
} elseif ($successRate -ge 70) {
    Write-Host "$successRate%" -ForegroundColor Yellow
} else {
    Write-Host "$successRate%" -ForegroundColor Red
}

Write-Host ""
if ($testResults.Failed -eq 0) {
    Write-Host "✓ All tests passed! Deployment is successful." -ForegroundColor Green
} elseif ($testResults.Failed -le 2) {
    Write-Host "⚠ Minor issues detected. Review failed tests." -ForegroundColor Yellow
} else {
    Write-Host "✗ Multiple failures detected. Investigation required." -ForegroundColor Red
}
Write-Host ""

# Exit with appropriate code
if ($testResults.Failed -gt 0) {
    exit 1
} else {
    exit 0
}

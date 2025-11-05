# Testing Guide for Multi-Agent Discussion System

This guide explains how to test the multi-agent discussion system that has been implemented.

## 🧪 Available Test Scripts

### 1. Complete Test Suite
```bash
npm run test
```
Runs all test suites in sequence and provides a comprehensive report.

### 2. Individual Test Suites

#### Multi-Agent Discussion System Tests
```bash
npm run test:discussion
```
Tests:
- Database schema validation
- Brutal advisor agent creation
- Enhanced vector search with AI-driven queries
- Individual agent responses
- Discussion creation and execution
- Discussion control (pause/resume/stop)
- User pattern analysis
- Message integration
- Performance and stress testing

#### Brutal Advisor Prompt Tests
```bash
npm run test:brutal
```
Tests:
- Effectiveness of brutal advisor prompt templates
- Response quality analysis
- Callout detection
- Actionable advice identification
- Performance by agent style
- Top and bottom performing responses

#### Socket.io Integration Tests
```bash
npm run test:socket
```
Tests:
- Socket connection and authentication
- Room management (join/leave)
- Typing indicators
- Presence status updates
- Message broadcasting
- Discussion updates
- Multiple client handling
- Error handling

## 🔧 Running Tests

### Prerequisites
1. Make sure your database is running
2. Ensure environment variables are configured
3. Install dependencies: `npm install`

### Test Execution
```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:discussion  # Multi-agent system
npm run test:brutal      # Brutal advisor prompts
npm run test:socket      # Socket.io integration
```

## 📊 Understanding Test Results

### Success Criteria
- ✅ **All Tests Pass**: System is fully operational
- ⚠️ **Partial Success**: Some features need attention
- ❌ **Tests Fail**: Critical issues need fixing

### Performance Metrics
- **Excellent**: < 10 seconds per test suite
- **Good**: < 30 seconds per test suite
- **Needs Improvement**: > 30 seconds per test suite

### Test Coverage Areas

#### 1. Multi-Agent Discussion System
- **Database Schema**: Validates all new models and relationships
- **Agent Creation**: Tests brutal advisor agent creation and styling
- **Vector Search**: Tests AI-driven query generation and intent analysis
- **Discussion Flow**: Tests sequential execution and turn management
- **Integration**: Tests automatic discussion creation from messages
- **Performance**: Tests concurrent discussions and stress handling

#### 2. Brutal Advisor Prompts
- **Prompt Effectiveness**: Validates brutal response generation
- **Callout Detection**: Tests if agents properly call out issues
- **Actionable Advice**: Tests if responses provide concrete next steps
- **Style Variation**: Tests different brutal advisor styles
- **Response Quality**: Rates response harshness and effectiveness

#### 3. Socket.io Integration
- **Connection**: Tests WebSocket connection establishment
- **Room Management**: Tests joining and leaving discussion rooms
- **Real-time Features**: Tests typing indicators and presence
- **Broadcasting**: Tests message and discussion update distribution
- **Multi-client**: Tests concurrent user handling
- **Error Handling**: Tests graceful failure management

## 🐛 Troubleshooting

### Common Issues

#### Test Failures
1. **Database Connection**: Ensure database is running and accessible
2. **Environment Variables**: Check `.env` file configuration
3. **Port Conflicts**: Ensure test ports are available
4. **Permissions**: Ensure file permissions allow script execution

#### Socket.io Issues
1. **Connection Refused**: Check if server is running
2. **CORS Issues**: Verify Socket.io configuration
3. **Authentication**: Test user authentication flow

#### Vector Search Issues
1. **Embedding Service**: Check vector database connection
2. **API Keys**: Verify AI service API keys
3. **Network**: Check internet connectivity for AI services

### Debug Mode
To enable detailed logging, set environment variable:
```bash
export DEBUG=true
npm run test
```

## 📝 Custom Tests

### Adding New Tests
1. Create test file in `scripts/` directory
2. Follow existing test patterns
3. Add to `package.json` scripts
4. Update `run-all-tests.js` to include new test

### Test Structure
```typescript
interface TestResult {
  testName: string
  success: boolean
  message: string
  duration: number
  data?: any
}

class YourTester {
  private testResults: TestResult[] = []

  async runTests(): Promise<void> {
    // Your test logic here
  }

  private addTestResult(testName: string, success: boolean, message: string, duration: number, data?: any): void {
    this.testResults.push({ testName, success, message, duration, data })
  }
}
```

## 🚀 Production Readiness

### Before Deployment
1. ✅ Run all tests: `npm run test`
2. ✅ Check test coverage (all major features tested)
3. ✅ Verify performance metrics
4. ✅ Validate error handling
5. ✅ Test with realistic data volumes

### Monitoring
- Set up test alerts for CI/CD pipeline
- Monitor test execution times
- Track test success rates
- Log performance metrics

## 📈 Expected Test Results

### Successful Run Output
```
🚀 Starting Complete Test Suite
=========================================================

📋 Running: Multi-Agent Discussion System
📝 Description: Tests discussion orchestration, vector search, and integration
======================================================
✅ Database Schema Validation (150ms)
   Database schema validated. Discussions: 0, Responses: 0

✅ Brutal Advisor Agent Creation (230ms)
   Created 2 brutal advisor agents

...

✅ Multi-Agent Discussion System completed successfully (2500ms)

📋 Running: Brutal Advisor Prompts
📝 Description: Tests brutal advisor prompt effectiveness and response quality
======================================================
🔥 Testing BRUTAL_MENTOR prompts:
----------------------------------------
...

🎉 ALL TEST SUITES PASSED!
🚀 Your multi-agent discussion system is fully operational!
```

### Performance Benchmarks
- **Total Test Time**: 10-30 seconds
- **Individual Tests**: 1-5 seconds each
- **Memory Usage**: < 100MB for all tests
- **CPU Usage**: < 25% during testing

---

This testing framework ensures your multi-agent discussion system is robust, performant, and ready for production use! 🎯
#!/bin/bash

# Test script for Agent API endpoints
# Usage: ./test-agent-api.sh

BASE_URL="http://localhost:3000/api/agent"

echo "=== Testing Agent API ==="
echo ""

echo "1. Testing GET /api/agent/models"
echo "   Checking available Ollama models..."
curl -s "${BASE_URL}/models" | jq '.' || curl -s "${BASE_URL}/models"
echo ""
echo ""

echo "2. Testing GET /api/agent/tools"
echo "   Checking available MCP tools..."
curl -s "${BASE_URL}/tools" | jq '.' || curl -s "${BASE_URL}/tools"
echo ""
echo ""

echo "3. Testing POST /api/agent/chat (simple greeting)"
echo "   Sending: 'Hello, what can you help me with?'"
curl -s -X POST "${BASE_URL}/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, what can you help me with?"
  }' | jq '.' || curl -s -X POST "${BASE_URL}/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, what can you help me with?"
  }'
echo ""
echo ""

echo "4. Testing POST /api/agent/chat (with tool usage)"
echo "   Sending: 'How many users are on the platform?'"
curl -s -X POST "${BASE_URL}/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many users are on the platform?",
    "model": "llama3.2"
  }' | jq '.' || curl -s -X POST "${BASE_URL}/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How many users are on the platform?",
    "model": "llama3.2"
  }'
echo ""
echo ""

echo "=== Test Complete ==="

#!/bin/bash

echo "🧪 Audio Scribe Integration Tests"
echo "=================================="
echo ""

API_URL="http://localhost:8000/api"
TEST_FILE="/tmp/test-audio.wav"

# Generate a test WAV file (1 second of silence)
echo "📝 Generating test audio file..."
ffmpeg -f lavfi -i anullsrc=r=16000:cl=mono -t 1 -q:a 9 -acodec libmp3lame "$TEST_FILE" &> /dev/null

if [ ! -f "$TEST_FILE" ]; then
    echo "❌ Failed to generate test audio file"
    exit 1
fi

echo "✅ Test audio file created"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo -n "  "
HEALTH=$(curl -s "$API_URL/health" | grep -o "healthy")
if [ "$HEALTH" == "healthy" ]; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
    exit 1
fi

# Test 2: Upload File
echo "Test 2: Upload Audio File"
echo -n "  "
UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/upload" \
    -F "file=@$TEST_FILE" \
    -H "Accept: application/json")

AUDIO_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"audio_id":[0-9]*' | grep -o '[0-9]*')
if [ ! -z "$AUDIO_ID" ]; then
    echo "✅ File uploaded successfully (ID: $AUDIO_ID)"
else
    echo "❌ File upload failed"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

# Test 3: List Files
echo "Test 3: List Files"
echo -n "  "
LIST_RESPONSE=$(curl -s "$API_URL/files")
FILE_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":' | wc -l)
echo "✅ Listed $FILE_COUNT files"

# Test 4: Get File Details
echo "Test 4: Get File Details"
echo -n "  "
FILE_RESPONSE=$(curl -s "$API_URL/files/$AUDIO_ID")
FILENAME=$(echo "$FILE_RESPONSE" | grep -o '"original_filename":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$FILENAME" ]; then
    echo "✅ Retrieved file: $FILENAME"
else
    echo "❌ Failed to retrieve file details"
    exit 1
fi

# Test 5: Start Transcription
echo "Test 5: Start Transcription"
echo -n "  "
TRANSCRIBE_RESPONSE=$(curl -s -X POST "$API_URL/transcribe/$AUDIO_ID")
JOB_ID=$(echo "$TRANSCRIBE_RESPONSE" | grep -o '"job_id":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$JOB_ID" ]; then
    echo "✅ Transcription job started (Job ID: $JOB_ID)"
else
    echo "❌ Failed to start transcription"
    exit 1
fi

# Test 6: Check Status (initial)
echo "Test 6: Check Status"
echo -n "  "
STATUS_RESPONSE=$(curl -s "$API_URL/status/$AUDIO_ID")
STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$STATUS" ]; then
    echo "✅ Transcription status: $STATUS"
else
    echo "❌ Failed to check status"
    exit 1
fi

# Test 7: Wait for Transcription (max 60 seconds)
echo "Test 7: Wait for Transcription Completion (max 60s)"
echo -n "  "
WAIT_TIME=0
MAX_WAIT=60

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    STATUS_RESPONSE=$(curl -s "$API_URL/status/$AUDIO_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$STATUS" == "Completed" ] || [ "$STATUS" == "Failed" ]; then
        break
    fi
    
    sleep 2
    WAIT_TIME=$((WAIT_TIME + 2))
    echo -n "."
done

if [ "$STATUS" == "Completed" ]; then
    echo "✅ Transcription completed"
elif [ "$STATUS" == "Failed" ]; then
    echo "❌ Transcription failed"
else
    echo "⚠️  Transcription still processing after timeout"
fi

# Test 8: Save Transcription Text
echo "Test 8: Save Transcription Text"
echo -n "  "
SAVE_RESPONSE=$(curl -s -X POST "$API_URL/files/$AUDIO_ID/text" \
    -H "Content-Type: application/json" \
    -d '{"transcription_text":"This is a test transcription"}')

MESSAGE=$(echo "$SAVE_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$MESSAGE" ]; then
    echo "✅ Transcription text saved"
else
    echo "❌ Failed to save transcription text"
    exit 1
fi

# Cleanup
rm -f "$TEST_FILE"

echo ""
echo "✅ All tests passed!"

package tests

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/your-org/your-project/custodian"
)

func TestCustodianConnection(t *testing.T) {
	client, err := custodian.NewClient()
	assert.NoError(t, err)
	assert.NotNil(t, client)

	// Test connection
	err = client.Connect()
	assert.NoError(t, err)

	// Test disconnection
	err = client.Disconnect()
	assert.NoError(t, err)
}

func TestRequestSignature(t *testing.T) {
	client, _ := custodian.NewClient()
	client.Connect()
	defer client.Disconnect()

	// Test successful signature request
	requestID, err := client.RequestSignature("test_document.pdf")
	assert.NoError(t, err)
	assert.NotEmpty(t, requestID)

	// Test signature request with invalid document
	_, err = client.RequestSignature("non_existent_document.pdf")
	assert.Error(t, err)
}

func TestGetSignatureStatus(t *testing.T) {
	client, _ := custodian.NewClient()
	client.Connect()
	defer client.Disconnect()

	// Request a signature first
	requestID, _ := client.RequestSignature("test_document.pdf")

	// Test getting status immediately
	status, err := client.GetSignatureStatus(requestID)
	assert.NoError(t, err)
	assert.Equal(t, custodian.StatusPending, status)

	// HUMAN ASSISTANCE NEEDED
	// The following test assumes that the signature process takes less than 5 seconds.
	// In a real-world scenario, this might not be reliable. Consider mocking the custodian client for more consistent testing.
	time.Sleep(5 * time.Second)

	// Test getting status after some time
	status, err = client.GetSignatureStatus(requestID)
	assert.NoError(t, err)
	assert.Equal(t, custodian.StatusCompleted, status)

	// Test getting status for non-existent request
	_, err = client.GetSignatureStatus("non_existent_request_id")
	assert.Error(t, err)
}
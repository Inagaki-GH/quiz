const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function importConfig() {
  try {
    const configPath = path.join(__dirname, 'game-config.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    const tableName = process.env.CHAPTERS_TABLE;
    
    if (!tableName) {
      throw new Error('CHAPTERS_TABLE environment variable is required');
    }
    
    const command = new PutCommand({
      TableName: tableName,
      Item: configData
    });
    
    await docClient.send(command);
    console.log('Game configuration imported successfully');
    
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.error('Error: DynamoDB table not found. Please deploy infrastructure first:');
      console.error('Run: ./deploy-infra.sh');
    } else {
      console.error('Error importing config:', error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  importConfig();
}

module.exports = { importConfig };
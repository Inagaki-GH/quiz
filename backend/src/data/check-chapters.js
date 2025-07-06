const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function checkChapters() {
  try {
    const tableName = process.env.CHAPTERS_TABLE;
    
    if (!tableName) {
      throw new Error('CHAPTERS_TABLE environment variable is required');
    }
    
    console.log(`Checking table: ${tableName}`);
    
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'attribute_exists(chapterId) AND chapterId <> :configId',
      ExpressionAttributeValues: {
        ':configId': 'game-settings'
      }
    });
    
    const result = await docClient.send(command);
    
    console.log(`Found ${result.Items.length} chapters:`);
    result.Items.forEach(item => {
      console.log(`- ${item.chapterId}: category=${item.category || 'NONE'}, title=${item.title || 'NONE'}`);
    });
    
  } catch (error) {
    console.error('Error checking chapters:', error);
  }
}

if (require.main === module) {
  checkChapters();
}

module.exports = { checkChapters };
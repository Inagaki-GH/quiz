const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const categoryMapping = {
  'chapter1': { category: 'basic', order: 1 },
  'chapter2': { category: 'basic', order: 2 },
  'chapter3': { category: 'basic', order: 3 },
  'chapter4': { category: 'basic', order: 4 },
  'html-basics': { category: 'frontend', order: 1 },
  'css-basics': { category: 'frontend', order: 2 },
  'javascript-basics': { category: 'frontend', order: 3 },
  'react-basics': { category: 'frontend', order: 4 },
  'nodejs-basics': { category: 'backend', order: 1 },
  'api-design': { category: 'backend', order: 2 },
  'sql-basics': { category: 'database', order: 1 },
  'nosql-basics': { category: 'database', order: 2 }
};

async function addMissingCategories() {
  const tableName = process.env.CHAPTERS_TABLE;
  
  if (!tableName) {
    throw new Error('CHAPTERS_TABLE environment variable is required');
  }
  
  console.log(`Using table: ${tableName}`);
  
  for (const [chapterId, info] of Object.entries(categoryMapping)) {
    try {
      const command = new UpdateCommand({
        TableName: tableName,
        Key: { chapterId },
        UpdateExpression: 'SET category = :category, #order = :order',
        ExpressionAttributeNames: {
          '#order': 'order'
        },
        ExpressionAttributeValues: {
          ':category': info.category,
          ':order': info.order
        }
      });
      
      await docClient.send(command);
      console.log(`✓ Updated ${chapterId}: ${info.category} (order: ${info.order})`);
    } catch (error) {
      console.error(`✗ Failed to update ${chapterId}:`, error.message);
    }
  }
  
  console.log('Category update completed!');
}

if (require.main === module) {
  addMissingCategories();
}

module.exports = { addMissingCategories };
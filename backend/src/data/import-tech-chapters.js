const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function importTechChapters() {
  try {
    const chaptersPath = path.join(__dirname, 'chapters-structure.json');
    const chaptersData = JSON.parse(fs.readFileSync(chaptersPath, 'utf8'));
    
    const tableName = process.env.CHAPTERS_TABLE;
    
    if (!tableName) {
      throw new Error('CHAPTERS_TABLE environment variable is required');
    }
    
    console.log(`Using table: ${tableName}`);
    
    for (const [chapterId, chapterData] of Object.entries(chaptersData)) {
      const command = new PutCommand({
        TableName: tableName,
        Item: chapterData
      });
      
      await docClient.send(command);
      console.log(`Imported chapter: ${chapterData.title}`);
    }
    
    console.log('All tech chapters imported successfully');
    
  } catch (error) {
    console.error('Error importing tech chapters:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  importTechChapters();
}

module.exports = { importTechChapters };
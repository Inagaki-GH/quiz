const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function importAllCategories() {
  try {
    const tableName = process.env.CHAPTERS_TABLE;
    
    if (!tableName) {
      throw new Error('CHAPTERS_TABLE environment variable is required');
    }
    
    console.log(`Using table: ${tableName}`);
    
    const categoriesDir = path.join(__dirname, 'categories');
    const categories = fs.readdirSync(categoriesDir);
    
    for (const category of categories) {
      const chaptersFile = path.join(categoriesDir, category, 'chapters.json');
      
      if (fs.existsSync(chaptersFile)) {
        console.log(`Importing ${category} chapters...`);
        
        const chaptersData = JSON.parse(fs.readFileSync(chaptersFile, 'utf8'));
        
        for (const [chapterId, chapterData] of Object.entries(chaptersData)) {
          const command = new PutCommand({
            TableName: tableName,
            Item: chapterData
          });
          
          await docClient.send(command);
          console.log(`  - ${chapterData.title}`);
        }
      }
    }
    
    console.log('All categories imported successfully');
    
  } catch (error) {
    console.error('Error importing categories:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  importAllCategories();
}

module.exports = { importAllCategories };
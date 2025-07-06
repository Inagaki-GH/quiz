const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const chapterTitles = {
  'chapter1': '第1章: 基本構文',
  'chapter2': '第2章: 制御構造', 
  'chapter3': '第3章: 関数',
  'chapter4': '第4章: プログラミング実践'
};

async function updateChapterTitles() {
  const tableName = process.env.CHAPTERS_TABLE;
  
  if (!tableName) {
    console.error('CHAPTERS_TABLE environment variable is required');
    console.log('Usage: CHAPTERS_TABLE=YourTableName npm run update-titles');
    process.exit(1);
  }
  
  console.log(`Using table: ${tableName}`);
  
  for (const [chapterId, title] of Object.entries(chapterTitles)) {
    try {
      const command = new UpdateCommand({
        TableName: tableName,
        Key: { chapterId },
        UpdateExpression: 'SET title = :title',
        ExpressionAttributeValues: {
          ':title': title
        }
      });
      
      await docClient.send(command);
      console.log(`Updated ${chapterId}: ${title}`);
    } catch (error) {
      console.error(`Failed to update ${chapterId}:`, error);
    }
  }
}

if (require.main === module) {
  updateChapterTitles();
}

module.exports = { updateChapterTitles };
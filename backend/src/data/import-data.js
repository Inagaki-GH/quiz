const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function importChapterData(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const command = new PutCommand({
      TableName: 'QuizStack-ChaptersTable4735C94E-NL1SYVL5XRBR',
      Item: data
    });
    
    await docClient.send(command);
    console.log(`✓ Imported: ${data.chapterId} - ${data.title}`);
  } catch (error) {
    console.error(`✗ Error importing ${filePath}:`, error.message);
  }
}

async function importAllChapters() {
  const chaptersDir = path.join(__dirname, 'chapters');
  const files = fs.readdirSync(chaptersDir).filter(file => file.endsWith('.json'));
  
  for (const file of files) {
    await importChapterData(path.join(chaptersDir, file));
  }
  
  console.log(`\nImport completed! ${files.length} chapters processed.`);
}

// コマンドライン引数の処理
const args = process.argv.slice(2);

if (args.length === 0) {
  // 引数なしの場合は全章をインポート
  importAllChapters();
} else {
  // 引数がある場合は指定されたファイルをインポート
  args.forEach(async (filePath) => {
    if (fs.existsSync(filePath)) {
      await importChapterData(filePath);
    } else {
      console.error(`✗ File not found: ${filePath}`);
    }
  });
}
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const path = require('path');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function importChapterData(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const tableName = process.env.CHAPTERS_TABLE || 'QuizStack-ChaptersTable4735C94E-NL1SYVL5XRBR';
    
    const command = new PutCommand({
      TableName: tableName,
      Item: data
    });
    
    await docClient.send(command);
    console.log(`✓ Imported: ${data.chapterId} - ${data.title} (${data.category || 'no category'})`);
  } catch (error) {
    console.error(`✗ Error importing ${filePath}:`, error.message);
  }
}

async function importAllChapters() {
  const categoriesDir = path.join(__dirname, 'categories');
  let totalFiles = 0;
  
  // カテゴリディレクトリを走査
  const categories = fs.readdirSync(categoriesDir);
  
  for (const category of categories) {
    const categoryPath = path.join(categoriesDir, category);
    
    if (fs.statSync(categoryPath).isDirectory()) {
      console.log(`\n📁 Processing category: ${category}`);
      
      const files = fs.readdirSync(categoryPath).filter(file => file.endsWith('.json'));
      
      for (const file of files) {
        await importChapterData(path.join(categoryPath, file));
        totalFiles++;
      }
    }
  }
  
  console.log(`\n🎉 Import completed! ${totalFiles} chapters processed from ${categories.length} categories.`);
}

async function importSpecificCategory(categoryName) {
  const categoryPath = path.join(__dirname, 'categories', categoryName);
  
  if (!fs.existsSync(categoryPath)) {
    console.error(`✗ Category not found: ${categoryName}`);
    return;
  }
  
  console.log(`\n📁 Processing category: ${categoryName}`);
  const files = fs.readdirSync(categoryPath).filter(file => file.endsWith('.json'));
  
  for (const file of files) {
    await importChapterData(path.join(categoryPath, file));
  }
  
  console.log(`\n✅ Category ${categoryName} completed! ${files.length} chapters processed.`);
}

// コマンドライン引数の処理
const args = process.argv.slice(2);

if (args.length === 0) {
  // 引数なしの場合は全章をインポート
  importAllChapters();
} else if (args[0] === '--category' && args[1]) {
  // --category オプションで特定カテゴリをインポート
  importSpecificCategory(args[1]);
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
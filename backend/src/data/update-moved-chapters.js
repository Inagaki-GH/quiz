const fs = require('fs');
const path = require('path');

function updateMovedChapters() {
  const basicDir = path.join(__dirname, 'categories/basic');
  const chapterFiles = ['chapter1.json', 'chapter2.json', 'chapter3.json', 'chapter4.json'];
  
  chapterFiles.forEach((filename, index) => {
    const filePath = path.join(basicDir, filename);
    
    if (fs.existsSync(filePath)) {
      const chapterData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // カテゴリとオーダーを追加
      chapterData.category = 'basic';
      chapterData.order = index + 1;
      chapterData.description = chapterData.description || `プログラミングの基本的な概念について学習します`;
      
      // ファイルを更新
      fs.writeFileSync(filePath, JSON.stringify(chapterData, null, 2));
      console.log(`Updated ${filename} with category and order`);
    }
  });
  
  console.log('All moved chapters updated successfully');
}

if (require.main === module) {
  updateMovedChapters();
}

module.exports = { updateMovedChapters };
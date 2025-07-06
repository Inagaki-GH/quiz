const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Quiz-Origin'
  };

  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    // CloudFront経由チェック
    const customHeader = event.headers['X-Quiz-Origin'] || event.headers['x-quiz-origin'];
    if (!customHeader || customHeader !== process.env.CUSTOM_HEADER_VALUE) {
      console.log('Unauthorized access attempt - missing or invalid custom header');
      return { 
        statusCode: 403, 
        headers, 
        body: JSON.stringify({ error: 'Access denied' }) 
      };
    }
    
    // GET /api/chapters (章一覧取得)
    if (event.httpMethod === 'GET' && event.path === '/api/chapters') {
      return await getChaptersList(headers);
    }
    
    // GET /api/chapter/{chapterId}
    if (event.httpMethod === 'GET' && event.path.startsWith('/api/chapter/')) {
      const chapterId = event.path.split('/')[3];
      return await getChapter(chapterId, headers);
    }
    
    // GET /api/config
    if (event.httpMethod === 'GET' && event.path === '/api/config') {
      return await getConfig(headers);
    }
    
    // POST /api/answer
    if (event.httpMethod === 'POST' && event.path === '/api/answer') {
      return await postAnswer(JSON.parse(event.body || '{}'), headers);
    }

    return { 
      statusCode: 404, 
      headers, 
      body: JSON.stringify({ 
        error: 'Not found', 
        path: event.path, 
        method: event.httpMethod 
      }) 
    };
  } catch (error) {
    console.error('Error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Internal server error', details: error.message }) 
    };
  }
};

async function getChapter(chapterId, headers) {
  try {
    const command = new GetCommand({
      TableName: process.env.CHAPTERS_TABLE,
      Key: { chapterId }
    });
    
    const result = await docClient.send(command);
    if (!result.Item) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chapter not found' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    console.error('DynamoDB Error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Database error', details: error.message }) 
    };
  }
}

async function postAnswer(request, headers) {
  try {
    const [chapter, config] = await Promise.all([
      getChapterById(request.chapterId),
      getGameConfig()
    ]);
    
    if (!chapter) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chapter not found' }) };
    }

    const mission = chapter.missions.find(m => m.id === request.missionId);
    if (!mission) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mission not found' }) };
    }

    let correct = false;
    
    if (request.type === 'code') {
      correct = await validateCodeAnswer(request.answer, mission);
    } else if (request.type === 'input') {
      const userAnswer = String(request.answer).toLowerCase().trim();
      const correctAnswer = String(mission.correctAnswer).toLowerCase().trim();
      correct = userAnswer === correctAnswer;
    } else {
      correct = request.answer === mission.correctAnswer;
    }

    const timeTaken = Date.now() - request.timestamp;
    const timeBonus = Math.max(0, config.scoring.timeMultiplier * Math.floor((mission.timeLimit - timeTaken / 1000)));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        correct,
        timeBonus,
        correctAnswer: mission.correctAnswer || 'コードが正しく実行されました'
      })
    };
  } catch (error) {
    console.error('Answer processing error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Answer processing failed', details: error.message }) 
    };
  }
}

async function validateCodeAnswer(userCode, mission) {
  try {
    // 簡単な検証：関数名が含まれているかチェック
    if (!userCode.includes(mission.funcName)) {
      return false;
    }
    
    // より厳密な検証が必要な場合はここで実装
    // セキュリティ上の理由でサーバーサイドでのコード実行は避ける
    
    return true; // フロントエンドでテスト済みなので基本的に正解
  } catch (error) {
    console.error('Code validation error:', error);
    return false;
  }
}

async function getChapterById(chapterId) {
  const command = new GetCommand({
    TableName: process.env.CHAPTERS_TABLE,
    Key: { chapterId }
  });
  
  const result = await docClient.send(command);
  return result.Item || null;
}

async function getGameConfig() {
  const command = new GetCommand({
    TableName: process.env.CHAPTERS_TABLE,
    Key: { chapterId: 'game-settings' }
  });
  
  const result = await docClient.send(command);
  return result.Item || {
    scoring: { baseScore: 100, timeMultiplier: 2, maxComboMultiplier: 10 },
    timing: { defaultTimeLimit: 30 },
    gameplay: { questionsPerChapter: 4 }
  };
}

async function getConfig(headers) {
  try {
    const config = await getGameConfig();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(config)
    };
  } catch (error) {
    console.error('Config error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Failed to get config' }) 
    };
  }
}

async function getChaptersList(headers) {
  try {
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: process.env.CHAPTERS_TABLE,
      FilterExpression: 'attribute_exists(chapterId) AND chapterId <> :configId',
      ExpressionAttributeValues: {
        ':configId': 'game-settings'
      }
    });
    
    const result = await docClient.send(command);
    const chapters = result.Items.sort((a, b) => a.chapterId.localeCompare(b.chapterId));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ chapters })
    };
  } catch (error) {
    console.error('Chapters list error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Failed to get chapters list' }) 
    };
  }
}

function getRandomMissions(missions, count = 4) {
  const shuffled = [...missions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
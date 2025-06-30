const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    // GET /chapter/{chapterId}
    if (event.httpMethod === 'GET' && event.path.startsWith('/chapter/')) {
      const chapterId = event.path.split('/')[2];
      return await getChapter(chapterId, headers);
    }
    
    // POST /answer
    if (event.httpMethod === 'POST' && event.path === '/answer') {
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

    const randomMissions = getRandomMissions(result.Item.missions, 4);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ...result.Item, missions: randomMissions })
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
    const chapter = await getChapterById(request.chapterId);
    if (!chapter) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chapter not found' }) };
    }

    const mission = chapter.missions.find(m => m.id === request.missionId);
    if (!mission) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mission not found' }) };
    }

    const correct = request.answer === mission.correctAnswer;
    const timeTaken = Date.now() - request.timestamp;
    const timeBonus = Math.max(0, 10 - Math.floor(timeTaken / 1000));
    const score = correct ? mission.points + timeBonus : 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        correct,
        score,
        timeBonus,
        correctAnswer: mission.correctAnswer
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

async function getChapterById(chapterId) {
  const command = new GetCommand({
    TableName: process.env.CHAPTERS_TABLE,
    Key: { chapterId }
  });
  
  const result = await docClient.send(command);
  return result.Item || null;
}

function getRandomMissions(missions, count = 4) {
  const shuffled = [...missions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
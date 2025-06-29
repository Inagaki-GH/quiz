import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { AnswerRequest, AnswerResponse } from '../models/types';

const dbService = new DynamoDBService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    if (event.httpMethod === 'GET' && event.pathParameters?.chapterId) {
      return await getChapter(event.pathParameters.chapterId, headers);
    }
    
    if (event.httpMethod === 'POST' && event.path === '/answer') {
      return await postAnswer(JSON.parse(event.body || '{}'), headers);
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

async function getChapter(chapterId: string, headers: any): Promise<APIGatewayProxyResult> {
  const chapter = await dbService.getChapter(chapterId);
  if (!chapter) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Chapter not found' }) };
  }

  const randomMissions = dbService.getRandomMissions(chapter.missions, 4);
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ...chapter, missions: randomMissions })
  };
}

async function postAnswer(request: AnswerRequest, headers: any): Promise<APIGatewayProxyResult> {
  const chapter = await dbService.getChapter(request.chapterId);
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

  const response: AnswerResponse = {
    correct,
    score,
    timeBonus,
    correctAnswer: mission.correctAnswer
  };

  return { statusCode: 200, headers, body: JSON.stringify(response) };
}
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Chapter, Mission } from '../models/types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export class DynamoDBService {
  async getChapter(chapterId: string): Promise<Chapter | null> {
    const command = new GetCommand({
      TableName: process.env.CHAPTERS_TABLE,
      Key: { chapterId }
    });
    
    const result = await docClient.send(command);
    return result.Item as Chapter || null;
  }

  async saveScore(userId: string, timestamp: string, score: number): Promise<void> {
    const command = new PutCommand({
      TableName: process.env.SCORES_TABLE,
      Item: { userId, timestamp, score }
    });
    
    await docClient.send(command);
  }

  getRandomMissions(missions: Mission[], count: number = 4): Mission[] {
    const shuffled = [...missions].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}
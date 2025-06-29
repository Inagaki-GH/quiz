import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

export class QuizStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const chaptersTable = new dynamodb.Table(this, 'ChaptersTable', {
      partitionKey: { name: 'chapterId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    const scoresTable = new dynamodb.Table(this, 'ScoresTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    // Lambda Function
    const quizFunction = new lambda.Function(this, 'QuizFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handlers/quiz.handler',
      code: lambda.Code.fromAsset('../backend/dist'),
      environment: {
        CHAPTERS_TABLE: chaptersTable.tableName,
        SCORES_TABLE: scoresTable.tableName
      }
    });

    chaptersTable.grantReadWriteData(quizFunction);
    scoresTable.grantReadWriteData(quizFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'QuizApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    });

    const integration = new apigateway.LambdaIntegration(quizFunction);
    
    const chapterResource = api.root.addResource('chapter');
    const chapterIdResource = chapterResource.addResource('{chapterId}');
    chapterIdResource.addMethod('GET', integration);

    const answerResource = api.root.addResource('answer');
    answerResource.addMethod('POST', integration);

    // S3 + CloudFront for static hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true
    });

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [{
        s3OriginSource: { s3BucketSource: websiteBucket },
        behaviors: [{ isDefaultBehavior: true }]
      }]
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'WebsiteUrl', { value: distribution.distributionDomainName });
  }
}

const app = new cdk.App();
new QuizStack(app, 'QuizStack');
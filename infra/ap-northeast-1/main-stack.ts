import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class QuizStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // カスタムヘッダーの秘密値
    const customHeaderValue = 'quiz-app-secret-' + Math.random().toString(36).substring(2, 15);

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
      code: lambda.Code.fromAsset('../../backend/src'),
      environment: {
        CHAPTERS_TABLE: chaptersTable.tableName,
        SCORES_TABLE: scoresTable.tableName,
        CUSTOM_HEADER_VALUE: customHeaderValue
      }
    });

    chaptersTable.grantReadWriteData(quizFunction);
    scoresTable.grantReadWriteData(quizFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'QuizApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Quiz-Origin']
      }
    });

    // Proxy integration for all paths
    const integration = new apigateway.LambdaIntegration(quizFunction, {
      proxy: true
    });
    
    // Add proxy resource to handle all paths
    api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true
    });

    // S3 + CloudFront for static hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket');

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    websiteBucket.grantRead(oai);

    // CloudFront Function for URL rewriting and access control
    const urlRewriteFunction = new cloudfront.Function(this, 'UrlRewriteFunction', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Block root access and directory listing
    if (uri === '/' || uri === '') {
        return {
            statusCode: 403,
            statusDescription: 'Forbidden',
            headers: {
                'content-type': { value: 'text/html' }
            },
            body: '<html><body><h1>403 Forbidden</h1><p>Access denied.</p></body></html>'
        };
    }
    
    // /quiz -> /quiz/index.html
    if (uri === '/quiz') {
        request.uri = '/quiz/index.html';
    }
    // /quiz/ -> /quiz/index.html
    else if (uri === '/quiz/') {
        request.uri = '/quiz/index.html';
    }
    
    return request;
}
      `)
    });

    // API Gateway Origin with custom header
    const apiOrigin = new origins.RestApiOrigin(api, {
      customHeaders: {
        'X-Quiz-Origin': customHeaderValue
      }
    });

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      geoRestriction: cloudfront.GeoRestriction.allowlist('JP'),
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(websiteBucket, {
          originAccessIdentity: oai
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [{
          function: urlRewriteFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
        }]
      },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
          compress: true
        },
        '/quiz/*': {
          origin: origins.S3BucketOrigin.withOriginAccessIdentity(websiteBucket, {
            originAccessIdentity: oai
          }),
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        }
      }
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'WebsiteUrl', { value: distribution.distributionDomainName });
    new cdk.CfnOutput(this, 'S3BucketName', { 
      value: websiteBucket.bucketName,
      description: 'Upload frontend files to this S3 bucket'
    });
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { 
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID for cache invalidation'
    });
    new cdk.CfnOutput(this, 'CustomHeaderValue', { 
      value: customHeaderValue,
      description: 'Custom header value for CloudFront origin requests'
    });
    new cdk.CfnOutput(this, 'ChaptersTableName', {
      value: chaptersTable.tableName,
      description: 'DynamoDB Chapters Table Name'
    });
  }
}

const app = new cdk.App();
new QuizStack(app, 'QuizStack', {
  env: { region: 'ap-northeast-1' }
});
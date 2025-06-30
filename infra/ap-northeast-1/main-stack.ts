import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
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
      code: lambda.Code.fromAsset('../../backend/src'),
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

    // Proxy integration for all paths
    const integration = new apigateway.LambdaIntegration(quizFunction, {
      proxy: true
    });
    
    // Add proxy resource to handle all paths
    api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true
    });

    // WAF for API Gateway
    const apiWebAcl = new wafv2.CfnWebACL(this, 'QuizApiWAF', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 100,
              aggregateKeyType: 'IP'
            }
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'QuizApiWAF'
      }
    });

    new wafv2.CfnWebACLAssociation(this, 'QuizApiWAFAssociation', {
      resourceArn: api.deploymentStage.stageArn,
      webAclArn: apiWebAcl.attrArn
    });

    // S3 + CloudFront for static hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket');

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    websiteBucket.grantRead(oai);

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      geoRestriction: cloudfront.GeoRestriction.allowlist('JP'),
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(websiteBucket, {
          originAccessIdentity: oai
        }),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
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
  }
}

const app = new cdk.App();
new QuizStack(app, 'QuizStack', {
  env: { region: 'ap-northeast-1' }
});
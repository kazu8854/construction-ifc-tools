/// <reference types="jest" />
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Infrastructure from '../lib/infrastructure-stack';

test('Stack creates all core resources', () => {
  const app = new cdk.App();
  const stack = new Infrastructure.InfrastructureStack(app, 'MyTestStack');
  const template = Template.fromStack(stack);

  // DynamoDB
  template.resourceCountIs('AWS::DynamoDB::Table', 1);

  // Cognito
  template.resourceCountIs('AWS::Cognito::UserPool', 1);
  template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);

  // Lambda (API + Seeder + CDK helper lambdas for S3 deploy/triggers)
  template.hasResourceProperties('AWS::Lambda::Function', {
    Runtime: 'nodejs20.x',
  });

  // API Gateway
  template.resourceCountIs('AWS::ApiGateway::RestApi', 1);

  // S3 (Website bucket + CDK deploy helper bucket)
  template.hasResourceProperties('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });

  // CloudFront
  template.resourceCountIs('AWS::CloudFront::Distribution', 1);
});

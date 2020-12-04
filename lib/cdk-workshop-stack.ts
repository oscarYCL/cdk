import core = require("@aws-cdk/core");
import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from '@aws-cdk/aws-apigateway';
import { HitCounter } from './hitcounter';
import { TableViewer } from 'cdk-dynamo-table-viewer';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import { SqsSubscription } from "@aws-cdk/aws-sns-subscriptions";
//import {DatabaseInstance, DatabaseInstanceEngine, StorageType} from '@aws-cdk/aws-rds';
import * as rds from '@aws-cdk/aws-rds';
import { DatabaseInstance, DatabaseInstanceEngine, StorageType } from "@aws-cdk/aws-rds";
import { InstanceType, SubnetType, Vpc} from "@aws-cdk/aws-ec2";

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const hello = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'hello.handler'
    });

    const helloWithCounter = new HitCounter(this, 'HelloHitCounter', {
      downstream: hello
    });
    
    const vpc = new ec2.Vpc(this, 'TheVPC', {
   cidr: "10.0.0.0/16",
   maxAzs: 2,
   natGateways: 0,
  
   })
    // defines an API Gateway REST API resource backed by our "hello" function.
    new apigw.LambdaRestApi(this, 'Endpoint', {
      handler: helloWithCounter.handler
    });

    new TableViewer(this, 'ViewHitCounter', {
      title: 'Hello Hits',
      table: helloWithCounter.table
    });
     const topic = new sns.Topic(
      this,
      "SNSTopic",
    );
    const queue = new sqs.Queue(this, "queue");
    const myQueue = new sqs.Queue(this, 'MyQueue');
    topic.addSubscription(new SqsSubscription(queue));
    
    const rds = new DatabaseInstance(this, 'mysql-rds-instance', {
    engine: DatabaseInstanceEngine.MYSQL,
    instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM),
    storageEncrypted: true,
    multiAz: false,
    autoMinorVersionUpgrade: false,
    allocatedStorage: 25,
    storageType: StorageType.GP2,
    deletionProtection: false,
    //masterUsername: 'Admin',
    databaseName: 'mydb',
    vpcSubnets: {
      subnetType: ec2.SubnetType.ISOLATED,
    },
    port: 3306,
    vpc
});



  }
}


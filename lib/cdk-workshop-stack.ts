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
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import * as secretsManager from '@aws-cdk/aws-secretsmanager';
import * as ecs from '@aws-cdk/aws-ecs';
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
     natGateways: 0, //shcool ac can not create natGateway   natGateways: 2
     /*
     subnetConfiguration: [         //since can not create natgateway the subnet can not config
        {
          cidrMask: 24,
          name: 'public subnet1',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'public subnet2',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 22,
          name: 'private subnet1',
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          cidrMask: 22,
          name: 'private subnet2',
          subnetType: ec2.SubnetType.PRIVATE,
        },
        {
          cidrMask: 28,
          name: 'isolated subnet',
          subnetType: ec2.SubnetType.ISOLATED,
        }
        
      
      ],*/
   });
   
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
    multiAz: true,
    autoMinorVersionUpgrade: false,
    allocatedStorage: 10,
    storageType: StorageType.GP2,
    deletionProtection: false,
    //masterUsername: 'Admin',
    databaseName: 'cdk_project',
    deleteAutomatedBackups: false,
    copyTagsToSnapshot: false,
    iamAuthentication: false,
    vpcSubnets: {
      subnetType: ec2.SubnetType.ISOLATED,
    },
    port: 3306,
    vpc
});
 
const secrets = new secretsManager.Secret (this, 'Secret', {
      description: "RDS Secret",
      secretName: "RDSSecret",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: "SECRET",
      }
    });
const expected = {
      engine: "mysql",
      port: 3306,
      username: "rdssecret",
      password: "cdkrdssecretpassword",
    };
 
 
 
 
 
 
const albsg = new ec2.SecurityGroup(this, 'ALBSecurityGroup', { vpc });
const lb = new elbv2.ApplicationLoadBalancer(this, 'ALB_cdk', {
  vpc,
  internetFacing: true,
  securityGroup: albsg, 
});

const securityGroup2 = new ec2.SecurityGroup(this, 'EC2SecurityGroup', { vpc });
  lb.addSecurityGroup(securityGroup2);
  albsg.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));
  albsg.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(80));
  securityGroup2.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443));
  securityGroup2.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(80));

//const autoscaling1 = new autoscaling.AutoScalingGroup(this, 'ASG', {
  //vpc,
  //InstanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO),
  //MachineImage: new ec2.AmazonLinuxImage() // get the latest Amazon Linux image
//});


  }
}
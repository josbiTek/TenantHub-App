const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const config = {
  region: process.env.AWS_REGION || "us-east-1",
};

if (process.env.DYNAMODB_ENDPOINT) {
  config.endpoint = process.env.DYNAMODB_ENDPOINT;
  config.credentials = { accessKeyId: "local", secretAccessKey: "local" };
}

const client = new DynamoDBClient(config);
const docClient = DynamoDBDocumentClient.from(client);

const TABLES = {
  TENANTS: process.env.TENANTS_TABLE || "tenanthub-tenants",
  PROJECTS: process.env.PROJECTS_TABLE || "tenanthub-projects",
  TASKS: process.env.TASKS_TABLE || "tenanthub-tasks",
  PAYMENTS: process.env.PAYMENTS_TABLE || "tenanthub-payments",
};

module.exports = { docClient, TABLES };

const { SSMClient, GetParametersByPathCommand } = require("@aws-sdk/client-ssm");
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const region = process.env.AWS_REGION || "us-east-1";
const USE_SSM = process.env.USE_SSM === "true";

async function loadConfig() {
  if (!USE_SSM) {
    // Local dev — read directly from environment/.env
    return {
      paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,
      paymentCallbackUrl: process.env.PAYMENT_CALLBACK_URL,
      tenantsTable: process.env.TENANTS_TABLE || "tenanthub-tenants",
      projectsTable: process.env.PROJECTS_TABLE || "tenanthub-projects",
      tasksTable: process.env.TASKS_TABLE || "tenanthub-tasks",
      paymentsTable: process.env.PAYMENTS_TABLE || "tenanthub-payments",
    };
  }

  // Production — fetch from AWS
  const ssm = new SSMClient({ region });
  const secrets = new SecretsManagerClient({ region });

  // Fetch all SSM params under /tenanthub/
  const ssmRes = await ssm.send(new GetParametersByPathCommand({
    Path: "/tenanthub/",
    WithDecryption: true,
  }));

  const params = {};
  for (const p of ssmRes.Parameters) {
    const key = p.Name.replace("/tenanthub/", "");
    params[key] = p.Value;
  }

  // Fetch Paystack key from Secrets Manager
  const secretRes = await secrets.send(new GetSecretValueCommand({
    SecretId: "tenanthub/paystack-secret-key",
  }));

  return {
    paystackSecretKey: secretRes.SecretString,
    paymentCallbackUrl: params["payment-callback-url"],
    tenantsTable: params["tenants-table"] || "tenanthub-tenants",
    projectsTable: params["projects-table"] || "tenanthub-projects",
    tasksTable: params["tasks-table"] || "tenanthub-tasks",
    paymentsTable: params["payments-table"] || "tenanthub-payments",
  };
}

module.exports = { loadConfig };

//TODO: test tagging and permissions structure
import * as pulumi from "@pulumi/pulumi";
import * as pulumiservice from "@pulumi/pulumiservice";
import * as azure from "@pulumi/azure-native";

const config = new pulumi.Config();
const orgName = pulumi.getOrganization();

const azureClientId = config.require("azureClientId");
const azureTenantId = config.require("azureTenantId");
const azureSubscriptionId = config.require("azureSubscriptionId");
const azureClientSecret = config.getSecret("azureClientSecret");
const pulumiAccessToken = config.requireSecret("pulumiAccessToken");

// ---------------------------------------------------------------------------
// Resource hook: tag ESC environments with env=wksp after creation
// ---------------------------------------------------------------------------

const tagEnvWksp = new pulumi.ResourceHook("tag-env-wksp", async (args) => {
  const https = require("https");
  const org: string = args.newOutputs?.["organization"];
  const project: string = args.newOutputs?.["project"];
  const env: string = args.newOutputs?.["name"];
  const token = process.env.PULUMI_ACCESS_TOKEN;

  if (!org || !project || !env || !token) return;

  const body = JSON.stringify({ value: "wksp" });
  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.pulumi.com",
        path: `/api/esc/environments/${org}/${project}/${env}/tags/env`,
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.pulumi+8",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res: any) => {
        let data = "";
        res.on("data", (chunk: any) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve();
          else reject(new Error(`Pulumi API ${res.statusCode}: ${data}`));
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
});

// ---------------------------------------------------------------------------
// ESC Environments
// ---------------------------------------------------------------------------

const azureCredentialsYaml = azureClientSecret
  ? pulumi.interpolate`values:
  azure:
    login:
      fn::open::azure-login:
        clientId: ${azureClientId}
        tenantId: ${azureTenantId}
        subscriptionId: ${azureSubscriptionId}
        clientSecret:
          fn::secret: ${azureClientSecret}
  environmentVariables:
    ARM_CLIENT_ID: \${azure.login.clientId}
    ARM_TENANT_ID: \${azure.login.tenantId}
    ARM_CLIENT_SECRET: \${azure.login.clientSecret}
    ARM_SUBSCRIPTION_ID: \${azure.login.subscriptionId}
`
  : pulumi.interpolate`values:
  azure:
    login:
      fn::open::azure-login:
        clientId: ${azureClientId}
        tenantId: ${azureTenantId}
        subscriptionId: ${azureSubscriptionId}
        oidc: true
  environmentVariables:
    ARM_USE_OIDC: 'true'
    ARM_CLIENT_ID: \${azure.login.clientId}
    ARM_TENANT_ID: \${azure.login.tenantId}
    ARM_OIDC_TOKEN: \${azure.login.oidc.token}
    ARM_SUBSCRIPTION_ID: \${azure.login.subscriptionId}
`;

const azureCredentialsEnv = new pulumiservice.Environment(
  "azure-credentials",
  {
    organization: orgName,
    project: "workshop",
    name: "azure-credentials",
    yaml: azureCredentialsYaml,
  },
  { hooks: { afterCreate: [tagEnvWksp] } },
);

const baseConfigEnv = new pulumiservice.Environment(
  "base-config",
  {
    organization: orgName,
    project: "workshop",
    name: "base-config",
    yaml: new pulumi.asset.StringAsset(`
imports:
  - workshop/azure-credentials
values:
  pulumiConfig:
    region: eastus
    environment: workshop
    name: base
`),
  },
  { dependsOn: azureCredentialsEnv, hooks: { afterCreate: [tagEnvWksp] } },
);

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

// Admins: manage shared environments and approve changes.
// Grant members the "Environment Admin" org-level role in Pulumi Cloud settings
// to allow environment creation in the workshop project.
const workspaceAdminsTeam = new pulumiservice.Team("workspace-admins", {
  organizationName: orgName,
  teamType: "pulumi",
  name: "workspace-admins",
  displayName: "Workspace Administrators",
  description:
    "Admin access to shared workshop environments. Eligible approvers for all approval rules.",
});

// Participants: can import base-config into their own environments.
// Grant members the "Environment Creator" org-level role in Pulumi Cloud settings
// to allow them to create their own *-wksp environments in the workshop project.
const workshopParticipantsTeam = new pulumiservice.Team(
  "workshop-participants",
  {
    organizationName: orgName,
    teamType: "pulumi",
    name: "workshop-participants",
    displayName: "Workshop Participants",
    description:
      "Read access to shared workshop environments. Can create and manage their own workspace environments.",
  },
);

// ---------------------------------------------------------------------------
// Approval rules (require 1 approval from a workspace-admin before opening)
// ---------------------------------------------------------------------------

const azureCredentialsApproval = new pulumiservice.ApprovalRule(
  "azure-credentials-approval",
  {
    name: "require-approval",
    environmentIdentifier: {
      organization: orgName,
      project: "workshop",
      name: azureCredentialsEnv.name,
    },
    targetActionTypes: [pulumiservice.TargetActionType.Update],
    enabled: true,
    approvalRuleConfig: {
      allowSelfApproval: false,
      numApprovalsRequired: 1,
      requireReapprovalOnChange: true,
      eligibleApprovers: [{ teamName: "workspace-admins" }],
    },
  },
  { dependsOn: [azureCredentialsEnv, workspaceAdminsTeam] },
);

const baseConfigApproval = new pulumiservice.ApprovalRule(
  "base-config-approval",
  {
    name: "require-approval",
    environmentIdentifier: {
      organization: orgName,
      project: "workshop",
      name: baseConfigEnv.name,
    },
    targetActionTypes: [pulumiservice.TargetActionType.Update],
    enabled: true,
    approvalRuleConfig: {
      allowSelfApproval: false,
      numApprovalsRequired: 1,
      requireReapprovalOnChange: true,
      eligibleApprovers: [{ teamName: "workspace-admins" }],
    },
  },
  { dependsOn: [baseConfigEnv, workspaceAdminsTeam] },
);

// Note: team environment and stack permissions must be configured manually in Pulumi Cloud.
// See README.md for the required permissions for each team.

// ---------------------------------------------------------------------------
// Webhook: create a Pulumi stack whenever a workshop/*-wksp env is created
// ---------------------------------------------------------------------------

const webhookSecret = config.requireSecret("webhookSecret");

const resourceGroup = new azure.resources.ResourceGroup("workshop-rg", {
  resourceGroupName: "workshop-webhook",
  location: "eastus",
});

const storageAccount = new azure.storage.StorageAccount("webhooksa", {
  resourceGroupName: resourceGroup.name,
  sku: { name: azure.storage.SkuName.Standard_LRS },
  kind: azure.storage.Kind.StorageV2,
});

const storageAccountKeys = azure.storage.listStorageAccountKeysOutput({
  resourceGroupName: resourceGroup.name,
  accountName: storageAccount.name,
});
const storageConnectionString = pulumi.interpolate`DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccountKeys.keys[0].value};EndpointSuffix=core.windows.net`;

const codeContainer = new azure.storage.BlobContainer("function-zips", {
  resourceGroupName: resourceGroup.name,
  accountName: storageAccount.name,
  publicAccess: azure.storage.PublicAccess.None,
});

const functionBlob = new azure.storage.Blob("wksp-webhook-zip", {
  resourceGroupName: resourceGroup.name,
  accountName: storageAccount.name,
  containerName: codeContainer.name,
  source: new pulumi.asset.FileArchive("./webhook-handler"),
});

const blobSas = azure.storage.listStorageAccountServiceSASOutput({
  accountName: storageAccount.name,
  resourceGroupName: resourceGroup.name,
  protocols: azure.storage.HttpProtocol.Https,
  sharedAccessExpiryTime: "2030-01-01",
  sharedAccessStartTime: "2024-01-01",
  resource: azure.storage.SignedResource.B,
  permissions: azure.storage.Permissions.R,
  canonicalizedResource: pulumi.interpolate`/blob/${storageAccount.name}/${codeContainer.name}/${functionBlob.name}`,
});
const functionBlobUrl = pulumi.interpolate`https://${storageAccount.name}.blob.core.windows.net/${codeContainer.name}/${functionBlob.name}?${blobSas.serviceSasToken}`;

const appInsights = new azure.applicationinsights.Component("wksp-webhook-ai", {
  resourceGroupName: resourceGroup.name,
  location: resourceGroup.location,
  applicationType: azure.applicationinsights.ApplicationType.Web,
  kind: "web",
  ingestionMode: azure.applicationinsights.IngestionMode.ApplicationInsights,
});

const appServicePlan = new azure.web.AppServicePlan("wksp-webhook-plan", {
  resourceGroupName: resourceGroup.name,
  sku: { name: "Y1", tier: "Dynamic" },
  kind: "FunctionApp",
});

const functionApp = new azure.web.WebApp("wksp-webhook-fn", {
  resourceGroupName: resourceGroup.name,
  serverFarmId: appServicePlan.id,
  kind: "FunctionApp",
  siteConfig: {
    appSettings: [
      { name: "AzureWebJobsStorage", value: storageConnectionString },
      { name: "FUNCTIONS_EXTENSION_VERSION", value: "~4" },
      { name: "FUNCTIONS_WORKER_RUNTIME", value: "node" },
      { name: "WEBSITE_NODE_DEFAULT_VERSION", value: "~20" },
      { name: "WEBSITE_RUN_FROM_PACKAGE", value: functionBlobUrl },
      { name: "PULUMI_ACCESS_TOKEN", value: pulumiAccessToken },
      { name: "WEBHOOK_SECRET", value: webhookSecret },
      { name: "PULUMI_ORG", value: orgName },
      {
        name: "APPINSIGHTS_INSTRUMENTATIONKEY",
        value: appInsights.instrumentationKey,
      },
      {
        name: "APPLICATIONINSIGHTS_CONNECTION_STRING",
        value: appInsights.connectionString,
      },
    ],
  },
  httpsOnly: true,
});

const wkspEnvWebhook = new pulumiservice.Webhook("wksp-env-webhook", {
  organizationName: orgName,
  displayName: "Create stack on workshop/*-wksp environment creation",
  payloadUrl: pulumi.interpolate`https://${functionApp.defaultHostName}/api/wksp-webhook`,
  secret: webhookSecret,
  active: true,
  filters: ["environment_created"],
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const azureCredentialsEnvironmentName = azureCredentialsEnv.name;
export const baseConfigEnvironmentName = baseConfigEnv.name;
export const workspaceAdminsTeamName = workspaceAdminsTeam.name;
export const webhookFunctionUrl = pulumi.interpolate`https://${functionApp.defaultHostName}/api/wksp-webhook`;
export { azureCredentialsYaml };

# ESC Workshop

This workshop walks you through using Pulumi ESC (Environments, Secrets, and Configuration) to manage Azure infrastructure. You will create a workspace environment, configure it with Azure credentials and settings, and trigger an automated deployment.

## Prerequisites

- Access to the Pulumi Cloud organization (`elisabeth-demo`)
- Member of the `workspace-admins` team (or ask an admin to add you)
- No local tools required — everything runs through Pulumi Cloud

---

## Step 1: Create your workspace environment

1. Go to [Pulumi Cloud](https://app.pulumi.com) → **ESC** → **Environments**
2. Select the **workshop** project
3. Click **New environment**
4. Name it `<yourname>-wksp` (e.g. `alice-wksp`)
5. Click **Create**

> The baseline automation detects the new environment and automatically creates a matching Pulumi stack (`workshop/<yourname>`) with deployment settings pointed at this repository.

---

## Step 2: Import the base config

Open your environment in the editor and replace the contents with:

```yaml
imports:
  - workshop/base-config

values:
  pulumiConfig:
    name: <yourname>
```

This imports shared Azure credentials and base configuration (region, environment tag) and sets your resource name. Click **Save**.

---

## Step 3: Set up approvals

Require a review from the `workspace-admins` team before your environment can be opened.

1. In your environment, go to **Settings** → **Approval policies**
2. Click **Add policy**
3. Set:
   - **Target action**: Update
   - **Approvals required**: 1
   - **Allow self-approval**: No
   - **Eligible approvers**: `workspace-admins` team
4. Click **Save**

---

## Step 4: Set up a deployment webhook

Configure your stack to automatically deploy whenever the environment is updated.

1. Go to **Pulumi Cloud** → **Stacks** → **workshop** → `<yourname>`
2. Click **Settings** → **Deployments**
3. Under **Triggers**, enable **Deploy on environment change**
4. Save the settings

From now on, every time you save a change to your `<yourname>-wksp` environment, a `pulumi update` will run automatically against your stack.

---

## Step 5: Configure your environment

Now add the remaining config values to fully specify your infrastructure. Update your environment YAML:

```yaml
imports:
  - workshop/base-config

values:
  pulumiConfig:
    name: <yourname>
    storageAccountKind: StorageV2
```

Click **Save**. If you have approvals enabled, submit the change for review and have a team member approve it.

---

## Step 6: Watch the deployment

1. Go to **Stacks** → **workshop** → `<yourname>` → **Deployments**
2. You should see a new deployment triggered by the environment update
3. Watch the logs — it will create:
   - An Azure Resource Group: `<yourname>-rg`
   - An Azure Storage Account: `<yourname>storage`
4. On success, the **Outputs** tab will show your `storageAccountName`

---

## Baseline reference

The `01-account-baseline` Pulumi program provisions the shared infrastructure that powers this workshop. It is managed separately by workshop administrators.

### What it sets up

| Resource | Description |
|---|---|
| `workshop/azure-credentials` ESC environment | Azure OIDC login (or client secret if configured) |
| `workshop/base-config` ESC environment | Imports credentials; provides `region` and `environment` config |
| `workspace-admins` team | Eligible approvers for all approval rules |
| `workshop-participants` team | For granting participants scoped access |
| Azure Function (`wksp-webhook-fn`) | Listens for `environment_created` events; creates stacks automatically |
| Application Insights | Logging and monitoring for the webhook function |

### How the automation works

When you create a `*-wksp` environment in the `workshop` project, the webhook function:
1. Creates a Pulumi stack `workshop/<yourname>`
2. Links it to your `workshop/<yourname>-wksp` environment as its ESC config source
3. Configures Pulumi Deployments to deploy from the `00-stack-example` directory of this repository

### Inputs (Pulumi config)

| Key | Description |
|---|---|
| `azureClientId` | Service principal client ID |
| `azureTenantId` | Azure AD tenant ID |
| `azureSubscriptionId` | Azure subscription ID |
| `azureClientSecret` | (Optional) Client secret. If omitted, OIDC is used instead |
| `pulumiAccessToken` | Pulumi Cloud token used by the webhook to create stacks |
| `webhookSecret` | HMAC secret for verifying webhook payloads |

### Stack config consumed by `00-stack-example`

These values are expected in the workspace ESC environment (via `base-config` import or direct values):

| Key | Source | Description |
|---|---|---|
| `name` | User-provided | Prefix for all Azure resources |
| `region` | `base-config` | Azure region (e.g. `eastus`) |
| `environment` | `base-config` | Environment tag (e.g. `production`) |
| `storageAccountKind` | User-provided | Azure storage account kind (e.g. `StorageV2`) |

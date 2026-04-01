# Account Baseline

The `01-account-baseline` Pulumi program provisions the shared infrastructure that powers this workshop. It is managed separately by workshop administrators.

## Baseline reference

### What it sets up

| Resource | Description |
|---|---|
| `workshop/azure-credentials` ESC environment | Azure OIDC login (or client secret if configured) |
| `workshop/base-config` ESC environment | Imports credentials; provides `region` and `environment` config |
| `workspace-admins` team | Eligible approvers for all approval rules |
| `workshop-participants` team | For granting participants scoped access |
| Azure Function (`wksp-webhook-fn`) | Listens for `environment_created` events; creates stacks automatically |
| Application Insights | Logging and monitoring for the webhook function |

### Manual setup: custom roles and team permissions

Custom roles require **Pulumi Enterprise or Business Critical**. All workshop stacks and environments are tagged `env: wksp` (applied automatically by the baseline and webhook). Custom roles use tag-based ABAC rules to match these resources.

#### Create the `Workshop Admins` custom role

1. Go to **Settings** → **Roles** → **Create role**
2. Name: `Workshop Admins`
3. Add a **Tag-Based** rule for **Environments**:
   - Tag condition: `env` = `wksp`
   - Permission: **Environment Admin**
4. Add a **Tag-Based** rule for **Stacks**:
   - Tag condition: `env` = `wksp`
   - Permission: **Stack Admin**
5. Add a **Global Entity Access** rule for **Environments**:
   - Permission: **Environment Write** (grants ability to create new environments in any project)
6. Save the role
7. Go to **Settings** → **Teams** → `workspace-admins` → **Roles** → assign `Workshop Admins`

#### Create the `Workshop Participants` custom role

1. Go to **Settings** → **Roles** → **Create role**
2. Name: `Workshop Participants`
3. Add a **Tag-Based** rule for **Environments**:
   - Tag condition: `env` = `wksp`
   - Permission: **Environment Open** (allows importing and resolving environment values)
4. Add a **Tag-Based** rule for **Stacks**:
   - Tag condition: `env` = `wksp`
   - Permission: **Stack Read**
5. Add a **Global Entity Access** rule for **Environments**:
   - Permission: **Environment Write** (grants ability to create their own `*-wksp` environment)
6. Save the role
7. Go to **Settings** → **Teams** → `workshop-participants` → **Roles** → assign `Workshop Participants`

---

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

# Account Baseline

The `01-account-baseline` Pulumi program provisions the shared infrastructure that powers this workshop. It is managed separately by workshop administrators.

## Baseline reference

### What it sets up

| Resource                                     | Description                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `workshop/azure-credentials` ESC environment | Azure OIDC login (or client secret if configured); tagged `env=wksp` on creation    |
| `workshop/base-config` ESC environment       | Imports credentials; provides `region`, `name`, and `environment` config; tagged `env=wksp` on creation |
| Approval rule: `azure-credentials`           | Requires 1 `workspace-admins` approval before the environment can be opened/updated |
| Approval rule: `base-config`                 | Requires 1 `workspace-admins` approval before the environment can be opened/updated |
| `workspace-admins` team                      | Eligible approvers for all approval rules                                            |
| `workshop-participants` team                 | For granting participants scoped access                                              |
| Azure Function (`wksp-webhook-fn`)           | Listens for `environment_created` events; creates and configures stacks automatically |
| Application Insights                         | Logging and monitoring for the webhook function                                      |

### How the automation works

When you create a `*-wksp` environment in the `workshop` project, the webhook function:

1. Creates a Pulumi stack `workshop/<yourname>`
2. Tags the environment with `env=wksp`
3. Links it to your `workshop/<yourname>-wksp` environment as its ESC config source
4. Configures Pulumi Deployments to deploy from the `00-stack-example` directory of this repository

The two shared environments (`azure-credentials`, `base-config`) are tagged `env=wksp` automatically via a Pulumi `afterCreate` resource hook when the baseline stack is first deployed.

---

### Prerequisites

Custom roles require **Pulumi Enterprise or Business Critical**. All workshop stacks and environments are tagged `env: wksp` (applied automatically by the baseline and webhook). Custom roles use tag-based ABAC rules to match these resources.

Create both roles before running the program. The `pulumiAccessToken` used as a config input must have the **Workshop Admins** role so the `afterCreate` hook and webhook can tag environments and create stacks.

#### Create the `Workshop Admins` custom role

1. Go to **Settings** → **Roles** → **Create custom role**
2. Name: `Workshop Admins`
3. Add a **Tag-Based** rule for **Environments**:
   - Tag condition: `env` = `wksp`
   - Permission: **Environment Admin**
4. Add a **Tag-Based** rule for **Stacks**:
   - Tag condition: `env` = `wksp`
   - Permission: **Stack Admin**
5. Click **+ Add rule** again to add an all-environments tagging rule:
   - Entity type: **Environments** → select **Apply to all environments**
   - Under **Set permission**, click **+ Add Custom Permission Set**
   - Name: `Environment Tag`
   - Under **Environment tags**, enable: **Adds a new tag to an environment**
   - Save the permission set, then save the rule
6. Under **Organization Access**, select **Add custom permission set** and enable the following scopes:
   - **Stack management**: Create stack
   - **Environment management**: Create environment, List the tags across all environments
   - **Organization webhooks**: Read organization webhook, Create organization webhook, Update organization webhook
7. Set the **Organization Access** level to **Workshop Admins**, the custom permission set you just created
8. Save the role

#### Create the `Workshop Participants` custom role

1. Go to **Settings** → **Roles** → **Create role**
2. Name: `Workshop Participants`
3. Add a **Tag-Based** rule for **Environments**:
   - Tag condition: `env` = `wksp`
   - Permission: **Environment Read** (allows importing and reading environment values)
4. Add a **Tag-Based** rule for **Stacks**:
   - Tag condition: `env` = `wksp`
   - Permission: **Stack Read**
5. Set the **Organization Access** to **Standard**
6. Save the role

---

### Inputs (Pulumi config)

| Key                   | Description                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `azureClientId`       | Service principal client ID                                                                                   |
| `azureTenantId`       | Azure AD tenant ID                                                                                            |
| `azureSubscriptionId` | Azure subscription ID                                                                                         |
| `azureClientSecret`   | (Optional) Client secret. If omitted, OIDC is used instead                                                   |
| `pulumiAccessToken`   | Pulumi Cloud token with the **Workshop Admins** role; used by the webhook to create stacks and by the afterCreate hook to tag shared environments |
| `webhookSecret`       | HMAC secret for verifying webhook payloads                                                                    |

---

### Deploy and assign team roles

Run the program:

```bash
pulumi up
```

Once the stack is deployed, assign the custom roles to their teams:

- Go to **Settings** → **Teams** → `Workspace Administrators` → **Access** → assign `Workshop Admins`
- Go to **Settings** → **Teams** → `Workshop Participants` → **Access** → assign `Workshop Participants`

---

### Stack config consumed by `00-stack-example`

These values are expected in the workspace ESC environment (via `base-config` import or direct values):

| Key                  | Source        | Description                                   |
| -------------------- | ------------- | --------------------------------------------- |
| `name`               | User-provided | Prefix for all Azure resources                |
| `region`             | `base-config` | Azure region (e.g. `eastus`)                  |
| `environment`        | `base-config` | Environment tag (e.g. `production`)           |
| `storageAccountKind` | User-provided | Azure storage account kind (e.g. `StorageV2`) |

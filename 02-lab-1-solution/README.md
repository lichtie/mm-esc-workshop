# Lab 1: Your First Workspace Environment

This lab walks you through creating a workspace environment, configuring it with Azure credentials and settings, and triggering an automated deployment.

## Prerequisites

- Access to the Pulumi Cloud organization
- Member of the `workshop-participants` team (or ask an admin to add you)
- No local tools required — everything runs through Pulumi Cloud

---

## Step 1: Create your workspace environment

1. Go to [Pulumi Cloud](https://app.pulumi.com) → **ESC** → **Environments**
2. Select the **Create Environment**
3. Set the project name to `workshop`
4. Name it `<yourname>-wksp` (e.g. `alice-wksp`)
5. Click **Create Environment**

> The baseline automation detects the new environment and automatically creates a matching Pulumi stack (`workshop/<yourname>`) with deployment settings pointed at this repository.

---

## Step 2: Set up a deployment webhook

Configure your stack to automatically deploy whenever the environment is updated.

1. Go to **Settings** → **Webhooks**
2. Click **Create Webhook**
3. Select **Deployment** as the **Destination**
4. Provide a **Display Name** and select the created stack to deploy: `workshop/<yourname>`
5. Under **Triggers**, enable **Environment revision created**
6. Select **Create webhook**

From now on, every time you save a change to your `<yourname>-wksp` environment, a `pulumi update` will run automatically against your stack.

---

## Step 3: Configure your environment

Now import the base environment to pull in the default values. Update your environment YAML:

```yaml
imports:
  - workshop/base-config
```

Click **Save**. If you have approvals enabled, submit the change for review and have a team member approve it.

---

## Step 4: Watch the deployment

1. Go to **Stacks** → **workshop** → `<yourname>` → **Deployments**
2. You should see a new deployment triggered by the environment update
3. Watch the logs — it will create:
   - An Azure Resource Group: `base-rg`
   - An Azure Storage Account: `basestorage`

---

## Step 5: Update your environment

Now add the config values to fully specify your infrastructure. Update your environment YAML:

```yaml
imports:
  - workshop/base-config

values:
  pulumiConfig:
    name: <yourname>
```

Click **Save**. If you have approvals enabled, submit the change for review and have a team member approve it. If not, go watch the deployment update the name of your resource group and storage account name.

---

## Cleanup

1. Go to your stack and click **Actions**, select the destroy option
2. Go to **ESC** → **Environments** → `workshop/<yourname>-wksp`, click the three dots next to the save button. Select **Delete environment**
3. Acknowledge the warning and delete

"use strict";

const crypto = require("crypto");
const https = require("https");

module.exports = async function (context, req) {
  // Verify HMAC signature from Pulumi Cloud
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers["pulumi-webhook-signature"];
    if (!signature) {
      context.res = {
        status: 401,
        body: "Missing Pulumi-Webhook-Signature header",
      };
      return;
    }
    const expected = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");
    if (
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      context.res = { status: 401, body: "Invalid signature" };
      return;
    }
  }

  const payload = req.body;
  context.log("Received webhook:", JSON.stringify(payload));

  // Only act on environment_created events
  if (payload.action !== "created") {
    context.res = { status: 200, body: "Ignored: not a created event" };
    return;
  }

  const project = payload.projectName;
  const envName = payload.environmentName;

  // Filter to workshop/*-wksp
  if (project !== "workshop" || !envName || !envName.endsWith("-wksp")) {
    context.res = { status: 200, body: "Ignored: pattern mismatch" };
    return;
  }

  const org = process.env.PULUMI_ORG;
  const targetProject = process.env.TARGET_STACK_PROJECT || "workshop";
  const token = process.env.PULUMI_ACCESS_TOKEN;
  // Stack name: strip the "-wksp" suffix
  const stackName = envName.slice(0, -"-wksp".length);

  context.log(`Creating stack ${org}/${targetProject}/${stackName}`);

  try {
    await createStack(org, targetProject, stackName, token);
    context.log(`Tagging stack and environment for stack ${stackName}`);
    await Promise.all([
      tagStack(org, targetProject, stackName, "env", "wksp", token),
      tagEnvironment(org, "workshop", envName, "env", "wksp", token),
    ]);
    context.log(`Configuring environment for stack ${stackName}`);
    await setStackEnvironment(
      org,
      targetProject,
      stackName,
      `workshop/${envName}`,
      token,
    );
    context.log(`Configuring deployment settings for stack ${stackName}`);
    await setDeploymentSettings(org, targetProject, stackName, token);
    context.res = {
      status: 200,
      body: `Created stack ${org}/${targetProject}/${stackName}`,
    };
  } catch (err) {
    context.log.error("Webhook handler error:", err.message);
    context.res = { status: 500, body: `Error: ${err.message}` };
  }
};

function setDeploymentSettings(org, project, stack, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sourceContext: {
        git: {
          repoURL: "https://github.com/lichtie/mm-esc-workshop.git",
          branch: "refs/heads/main",
          repoDir: "00-stack-example",
        },
      },
    });
    const options = {
      hostname: "api.pulumi.com",
      path: `/api/stacks/${org}/${project}/${stack}/deployments/settings`,
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pulumi+8",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Pulumi API ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function setStackEnvironment(org, project, stack, environment, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ environment });
    const options = {
      hostname: "api.pulumi.com",
      path: `/api/stacks/${org}/${project}/${stack}/config`,
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pulumi+8",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Pulumi API ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function tagStack(org, project, stack, tagName, tagValue, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ name: tagName, value: tagValue });
    const options = {
      hostname: "api.pulumi.com",
      path: `/api/stacks/${org}/${project}/${stack}/tags`,
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pulumi+8",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Pulumi API ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function tagEnvironment(org, project, env, tagName, tagValue, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ name: tagName, value: tagValue });
    const options = {
      hostname: "api.pulumi.com",
      path: `/api/esc/environments/${org}/${project}/${env}/tags`,
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pulumi+8",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Pulumi API ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function createStack(org, project, stack, token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ stackName: stack });
    const options = {
      hostname: "api.pulumi.com",
      path: `/api/stacks/${org}/${project}`,
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.pulumi+8",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else if (res.statusCode === 409) {
          // Stack already exists — treat as success
          resolve({ alreadyExists: true });
        } else {
          reject(new Error(`Pulumi API ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

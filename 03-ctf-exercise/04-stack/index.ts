import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const storageAccountName = config.require("storageAccountName");
const appName = config.require("appName");

if (!storageAccountName.startsWith("wksp")) {
    throw new Error(`CTF stack requires wksp storage account, got: ${storageAccountName}`);
}

export const storageEndpoint = `https://${storageAccountName}.blob.core.windows.net/${appName}`;

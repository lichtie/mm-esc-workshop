import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const storageAccountName = config.require("storageAccountName");
const appName = config.require("appName");

if (!storageAccountName.startsWith("prod")) {
    throw new Error(`Production stack requires production storage account, got: ${storageAccountName}`);
}

export const storageEndpoint = `https://${storageAccountName}.blob.core.windows.net/${appName}`;

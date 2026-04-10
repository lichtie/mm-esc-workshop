import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const region = config.require("region");
const appName = config.require("appName");
const secretKey = config.requireSecret("secretKey");

export const serviceEndpoint = `${appName}.${region}.internal`;
export const secretConfigured = secretKey.apply(k => k ? "configured" : "missing");

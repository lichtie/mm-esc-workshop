import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const appName = config.require("appName");
const region = config.require("region");
const appPort = config.requireNumber("appPort");
const maxRetries = config.requireNumber("maxRetries");

// Calculate exponential backoff ceiling in ms
const maxBackoffMs = Math.pow(2, maxRetries) * 100;

// Build service endpoint
const endpoint = `${appName}.${region}:${appPort}`;

export const serviceEndpoint = endpoint;
export const maxBackoffMilliseconds = maxBackoffMs;

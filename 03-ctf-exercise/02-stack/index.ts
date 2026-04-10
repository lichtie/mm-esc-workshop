import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const region = config.require("region");
const appName = config.require("name");
const environment = config.require("environment");

export const serviceEndpoint = `${appName}.${region}.${environment}.internal`;

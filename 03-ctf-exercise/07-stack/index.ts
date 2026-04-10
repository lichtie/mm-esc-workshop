import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const appName = config.require("name");
const region = config.require("region");

if (appName === "workshop-app") {
    throw new Error(`App name was not overridden: ${appName}`);
}

export const serviceEndpoint = `${appName}.${region}.internal`;

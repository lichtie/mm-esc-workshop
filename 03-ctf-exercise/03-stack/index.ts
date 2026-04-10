import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const databaseHost = config.require("databaseHost");
const appEnvironment = config.require("appEnvironment");

if (appEnvironment !== "production") {
    throw new Error(`Expected production environment, got: ${appEnvironment}`);
}

export const connectionString = `postgresql://${databaseHost}/app`;

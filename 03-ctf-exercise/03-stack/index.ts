import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const databaseHost = config.require("databaseHost");
const appEnvironment = config.require("appEnvironment");

if (appEnvironment !== "wksp") {
    throw new Error(`Expected wksp environment, got: ${appEnvironment}`);
}

export const connectionString = `postgresql://${databaseHost}/app`;

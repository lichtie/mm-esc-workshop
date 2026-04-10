import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const databaseUrl = config.require("databaseUrl");
const logLevel = config.require("logLevel");

if (databaseUrl.includes("dev")) {
    throw new Error(`CTF deployment cannot use dev database: ${databaseUrl}`);
}

export const connectionString = `postgresql://${databaseUrl}/app?sslmode=require`;
export const logConfig = `level=${logLevel}`;

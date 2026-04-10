import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const dbHost = config.require("dbHost");
const dbPassword = config.requireSecret("dbPassword");

const validatedPassword = dbPassword.apply(p => {
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasSpecial = /[^a-zA-Z0-9]/.test(p);
    const isLong = p.length >= 16;
    if (!hasUpper || !hasLower || !hasSpecial || !isLong) {
        throw new Error(`dbPassword does not meet security requirements (min 16 chars, must include uppercase, lowercase, and special characters)`);
    }
    return p;
});

export const connectionString = pulumi.interpolate`postgresql://app:${validatedPassword}@${dbHost}/appdb`;

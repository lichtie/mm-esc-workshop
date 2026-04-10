import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const allowedIPs = config.requireObject<string[]>("allowedIPs");

const hasOffice = allowedIPs.some(ip => ip.startsWith("10.0."));
const hasVpn = allowedIPs.some(ip => ip.startsWith("10.1."));
const hasPartner = allowedIPs.some(ip => ip.startsWith("10.2."));

if (!hasOffice || !hasVpn || !hasPartner) {
    const missing = [
        !hasOffice && "office (10.0.x.x)",
        !hasVpn    && "vpn (10.1.x.x)",
        !hasPartner && "partner (10.2.x.x)",
    ].filter(Boolean).join(", ");
    throw new Error(`Firewall is missing required IP ranges: ${missing}`);
}

export const allowedIPCount = allowedIPs.length;
export const firewallRule = `allow ${allowedIPs.join(", ")}`;

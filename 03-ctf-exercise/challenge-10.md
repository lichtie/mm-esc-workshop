# Challenge 10

The stack `ctfwksp/challenge-10` is deploying a firewall but failing with:

`error: Firewall is missing required IP ranges: vpn (10.1.x.x), partner (10.2.x.x)`

The environment `ctfwksp/challenge-10` already references all the relevant network stacks. The firewall needs the complete allow-list across all of them.

**Success Criteria:** Successful Deployment

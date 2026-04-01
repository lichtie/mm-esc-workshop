import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";

const config = new pulumi.Config();

const name = config.require("name");
const region = config.require("region");
const environment = config.require("environment");
const storageAccountKind = config.require("storageAccountKind");

const tags = { region, environment };

// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup(`${name}-rg`, {
  location: region,
  tags,
});

// Create an Azure Storage Account
const storageAccount = new storage.StorageAccount(`${name}storage`, {
  resourceGroupName: resourceGroup.name,
  sku: {
    name: storage.SkuName.Standard_LRS,
  },
  kind: storageAccountKind,
  tags,
});

// Export the storage account name
export const storageAccountName = storageAccount.name;

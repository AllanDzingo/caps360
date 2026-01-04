terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "rg" {
  name     = "caps360-rg"
  location = "South Africa North"
}

resource "azurerm_postgresql_flexible_server" "db" {
  name                   = "caps360-db-${random_string.suffix.result}"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "13"
  administrator_login    = "caps360admin"
  administrator_password = var.db_password
  storage_mb             = 32768
  sku_name               = "B_Standard_B1ms"
  zone                   = "1"

  tags = {
    Environment = "Production"
    Project     = "CAPS360"
  }
}

resource "azurerm_postgresql_flexible_server_database" "caps360" {
  name      = "caps360"
  server_id = azurerm_postgresql_flexible_server.db.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_access" {
  name             = "allow_all_ips"
  server_id        = azurerm_postgresql_flexible_server.db.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "255.255.255.255"
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

variable "db_password" {
  description = "The password for the PostgreSQL administrator"
  type        = string
  sensitive   = true
}

output "database_host" {
  value = azurerm_postgresql_flexible_server.db.fqdn
}

output "database_user" {
  value = azurerm_postgresql_flexible_server.db.administrator_login
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.caps360.name
}

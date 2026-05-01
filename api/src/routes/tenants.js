const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, ScanCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const tenant = {
      tenantId: uuidv4(),
      name,
      email,
      plan: "free",
      createdAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: TABLES.TENANTS, Item: tenant }));
    res.status(201).json(tenant);
  } catch (err) {
    console.error("Create tenant error:", err.message);
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

router.get("/:tenantId", async (req, res) => {
  try {
    const { Item } = await docClient.send(
      new GetCommand({ TableName: TABLES.TENANTS, Key: { tenantId: req.params.tenantId } })
    );
    if (!Item) return res.status(404).json({ error: "Tenant not found" });
    res.json(Item);
  } catch (err) {
    console.error("Get tenant error:", err.message);
    res.status(500).json({ error: "Failed to get tenant" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { Items } = await docClient.send(new ScanCommand({ TableName: TABLES.TENANTS }));
    res.json(Items || []);
  } catch (err) {
    console.error("List tenants error:", err.message);
    res.status(500).json({ error: "Failed to list tenants" });
  }
});

module.exports = router;

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, QueryCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { tenantId, name, description } = req.body;
    if (!tenantId || !name) {
      return res.status(400).json({ error: "tenantId and name are required" });
    }

    const project = {
      tenantId,
      projectId: uuidv4(),
      name,
      description: description || "",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: TABLES.PROJECTS, Item: project }));
    res.status(201).json(project);
  } catch (err) {
    console.error("Create project error:", err.message);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/tenant/:tenantId", async (req, res) => {
  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLES.PROJECTS,
        KeyConditionExpression: "tenantId = :tid",
        ExpressionAttributeValues: { ":tid": req.params.tenantId },
      })
    );
    res.json(Items || []);
  } catch (err) {
    console.error("List projects error:", err.message);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

router.get("/:tenantId/:projectId", async (req, res) => {
  try {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLES.PROJECTS,
        Key: { tenantId: req.params.tenantId, projectId: req.params.projectId },
      })
    );
    if (!Item) return res.status(404).json({ error: "Project not found" });
    res.json(Item);
  } catch (err) {
    console.error("Get project error:", err.message);
    res.status(500).json({ error: "Failed to get project" });
  }
});

router.delete("/:tenantId/:projectId", async (req, res) => {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.PROJECTS,
        Key: { tenantId: req.params.tenantId, projectId: req.params.projectId },
      })
    );
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("Delete project error:", err.message);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

module.exports = router;

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../db");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { projectId, tenantId, title, assignee } = req.body;
    if (!projectId || !tenantId || !title) {
      return res.status(400).json({ error: "projectId, tenantId, and title are required" });
    }

    const task = {
      projectId,
      taskId: uuidv4(),
      tenantId,
      title,
      assignee: assignee || "Unassigned",
      status: "todo",
      createdAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({ TableName: TABLES.TASKS, Item: task }));
    res.status(201).json(task);
  } catch (err) {
    console.error("Create task error:", err.message);
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.get("/project/:projectId", async (req, res) => {
  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLES.TASKS,
        KeyConditionExpression: "projectId = :pid",
        ExpressionAttributeValues: { ":pid": req.params.projectId },
      })
    );
    res.json(Items || []);
  } catch (err) {
    console.error("List tasks error:", err.message);
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

router.patch("/:projectId/:taskId", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["todo", "in-progress", "done"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: "status must be: todo, in-progress, or done" });
    }

    const { Attributes } = await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TASKS,
        Key: { projectId: req.params.projectId, taskId: req.params.taskId },
        UpdateExpression: "SET #s = :s, updatedAt = :u",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": status, ":u": new Date().toISOString() },
        ReturnValues: "ALL_NEW",
      })
    );
    res.json(Attributes);
  } catch (err) {
    console.error("Update task error:", err.message);
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/:projectId/:taskId", async (req, res) => {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.TASKS,
        Key: { projectId: req.params.projectId, taskId: req.params.taskId },
      })
    );
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("Delete task error:", err.message);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

module.exports = router;

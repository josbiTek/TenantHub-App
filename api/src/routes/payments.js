const express = require("express");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, UpdateCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient, TABLES } = require("../db");

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || "sk_test_xxxxx";
const PAYSTACK_BASE_URL = "https://api.paystack.co";

router.post("/initialize", async (req, res) => {
  try {
    const { tenantId, email, amount, plan } = req.body;
    if (!tenantId || !email || !amount) {
      return res.status(400).json({ error: "tenantId, email, and amount are required" });
    }

    const reference = `th_${uuidv4().slice(0, 12)}`;

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100,
        reference,
        metadata: { tenantId, plan: plan || "pro" },
        callback_url: process.env.PAYMENT_CALLBACK_URL || `http://localhost:8080/payment-callback?reference=${reference}&tenantId=${tenantId}`,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message || "Payment initialization failed" });
    }

    await docClient.send(
      new PutCommand({
        TableName: TABLES.PAYMENTS,
        Item: {
          tenantId,
          paymentId: reference,
          email,
          amount,
          plan: plan || "pro",
          status: "pending",
          authorizationUrl: data.data.authorization_url,
          createdAt: new Date().toISOString(),
        },
      })
    );

    res.status(201).json({
      reference,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
    });
  } catch (err) {
    console.error("Payment init error:", err.message);
    res.status(500).json({ error: "Failed to initialize payment" });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const rawBody = JSON.stringify(req.body);
    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.sendStatus(400);
    }

    const { event, data } = req.body;
    console.log(`Paystack webhook: ${event} | ref: ${data.reference}`);

    if (event === "charge.success") {
      const tenantId = data.metadata?.tenantId;
      const reference = data.reference;

      if (tenantId && reference) {
        await docClient.send(
          new UpdateCommand({
            TableName: TABLES.PAYMENTS,
            Key: { tenantId, paymentId: reference },
            UpdateExpression: "SET #s = :s, paidAt = :p, channel = :c",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: {
              ":s": "success",
              ":p": new Date().toISOString(),
              ":c": data.channel || "unknown",
            },
          })
        );

        await docClient.send(
          new UpdateCommand({
            TableName: TABLES.TENANTS,
            Key: { tenantId },
            UpdateExpression: "SET #p = :p, upgradedAt = :u",
            ExpressionAttributeNames: { "#p": "plan" },
            ExpressionAttributeValues: {
              ":p": data.metadata?.plan || "pro",
              ":u": new Date().toISOString(),
            },
          })
        );
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.sendStatus(200);
  }
});

router.get("/verify/:reference", async (req, res) => {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${req.params.reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });

    const data = await response.json();
    if (!data.status) {
      return res.status(400).json({ error: data.message || "Verification failed" });
    }

    // Update local record on successful verification
    const tenantId = data.data.metadata?.tenantId;
    if (tenantId && data.data.status === "success") {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.PAYMENTS,
          Key: { tenantId, paymentId: data.data.reference },
          UpdateExpression: "SET #s = :s, paidAt = :p, channel = :c",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: {
            ":s": "success",
            ":p": data.data.paid_at,
            ":c": data.data.channel || "unknown",
          },
        })
      ).catch(() => {});

      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.TENANTS,
          Key: { tenantId },
          UpdateExpression: "SET #p = :p, upgradedAt = :u",
          ExpressionAttributeNames: { "#p": "plan" },
          ExpressionAttributeValues: {
            ":p": data.data.metadata?.plan || "pro",
            ":u": new Date().toISOString(),
          },
        })
      ).catch(() => {});
    }

    res.json({
      reference: data.data.reference,
      amount: data.data.amount / 100,
      currency: data.data.currency,
      status: data.data.status,
      channel: data.data.channel,
      paidAt: data.data.paid_at,
      customer: data.data.customer?.email,
    });
  } catch (err) {
    console.error("Verify error:", err.message);
    res.status(500).json({ error: "Failed to verify" });
  }
});

router.get("/tenant/:tenantId", async (req, res) => {
  try {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLES.PAYMENTS,
        KeyConditionExpression: "tenantId = :tid",
        ExpressionAttributeValues: { ":tid": req.params.tenantId },
      })
    );
    res.json(Items || []);
  } catch (err) {
    console.error("List payments error:", err.message);
    res.status(500).json({ error: "Failed to list payments" });
  }
});

module.exports = router;

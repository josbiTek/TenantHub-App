const express = require("express");
const cors = require("cors");
const { loadConfig } = require("./config");
const tenantRoutes = require("./routes/tenants");
const projectRoutes = require("./routes/projects");
const taskRoutes = require("./routes/tasks");
const paymentRoutes = require("./routes/payments");
const healthRoutes = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/payments", paymentRoutes);

async function start() {
  const config = await loadConfig();

  // Expose config to the rest of the app via env (simplest bridge)
  process.env.PAYSTACK_SECRET_KEY = config.paystackSecretKey;
  process.env.PAYMENT_CALLBACK_URL = config.paymentCallbackUrl;
  process.env.TENANTS_TABLE = config.tenantsTable;
  process.env.PROJECTS_TABLE = config.projectsTable;
  process.env.TASKS_TABLE = config.tasksTable;
  process.env.PAYMENTS_TABLE = config.paymentsTable;

  app.listen(PORT, () => {
    console.log(`TenantHub API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to load config:", err);
  process.exit(1);
});

module.exports = app;

"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use((0, import_cors.default)());
app.use(import_express.default.json({ limit: "50mb" }));
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "db.json");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var DEFAULT_USERS_BACKUP = [
  { id: "dev1", username: "Dev123", password: "Pass123", fullName: "\u0645\u062F\u06CC\u0631 \u0633\u06CC\u0633\u062A\u0645", role: "DEVELOPER", avatar: "", phoneNumber: "09121111111", email: "dev@safewatch.ir", telegramUsername: "@Dev123_Support" },
  { id: "u0", username: "Manager123", password: "Pass123", fullName: "\u0645\u062F\u06CC\u0631 \u06A9\u0627\u0631\u062E\u0627\u0646\u0647", role: "PLANT_MANAGER", avatar: "", phoneNumber: "09122222222", email: "manager@safewatch.ir", telegramUsername: "@Manager123_Support" },
  { id: "u1", username: "HrManager123", password: "Pass123", fullName: "\u0645\u062F\u06CC\u0631 \u0645\u0646\u0627\u0628\u0639 \u0627\u0646\u0633\u0627\u0646\u06CC", role: "HR_MANAGER", avatar: "", phoneNumber: "09123333333", email: "hr@safewatch.ir" },
  { id: "u2", username: "HseManager123", password: "Pass123", fullName: "\u0645\u062F\u06CC\u0631 \u0627\u06CC\u0645\u0646\u06CC", role: "HSE_MANAGER", avatar: "", phoneNumber: "09124444444", email: "hse@safewatch.ir" },
  { id: "u3", username: "HseOfficer123", password: "Pass123", fullName: "\u0627\u0641\u0633\u0631 \u0627\u06CC\u0645\u0646\u06CC", role: "HSE_OFFICER", avatar: "", phoneNumber: "09125555555", email: "officer@safewatch.ir" },
  { id: "u4", username: "Security123", password: "Pass123", fullName: "\u0633\u0631\u067E\u0631\u0633\u062A \u0627\u0646\u062A\u0638\u0627\u0645\u0627\u062A", role: "SECURITY_MANAGER", avatar: "", phoneNumber: "09126666666", email: "security@safewatch.ir" },
  { id: "u5", username: "Training123", password: "Pass123", fullName: "\u0645\u0633\u0626\u0648\u0644 \u0622\u0645\u0648\u0632\u0634", role: "TRAINING_MANAGER", avatar: "", phoneNumber: "09127777777", email: "training@safewatch.ir" },
  { id: "u6", username: "Admin123", password: "Pass123", fullName: "\u06A9\u0627\u0631\u0634\u0646\u0627\u0633 \u0627\u062F\u0627\u0631\u06CC", role: "ADMIN_STAFF", avatar: "", phoneNumber: "09128888888", email: "admin@safewatch.ir" }
];
function readDB() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const data = import_fs.default.readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (!parsed.users || !Array.isArray(parsed.users) || parsed.users.length === 0) {
        parsed.users = DEFAULT_USERS_BACKUP;
      } else {
        DEFAULT_USERS_BACKUP.forEach((defUser) => {
          if (!parsed.users.some((u) => u.username === defUser.username)) {
            parsed.users.push(defUser);
          }
        });
      }
      return parsed;
    }
  } catch (err) {
    console.error("Error reading DB, using defaults", err);
  }
  return {
    violations: [],
    rewards: [],
    users: DEFAULT_USERS_BACKUP,
    employees: [],
    violationCodes: [],
    rewardCodes: [],
    settings: null
  };
}
function writeDB(data) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to DB file", err);
  }
}
if (!import_fs.default.existsSync(DB_FILE)) {
  writeDB({
    violations: [],
    rewards: [],
    users: DEFAULT_USERS_BACKUP,
    employees: [],
    violationCodes: [],
    rewardCodes: [],
    settings: null
  });
}
app.get("/api/db", (req, res) => {
  const db = readDB();
  res.json(db);
});
app.post("/api/db", (req, res) => {
  const incoming = req.body;
  const current = readDB();
  let incomingUsers = incoming.users;
  if (!incomingUsers || !Array.isArray(incomingUsers) || incomingUsers.length === 0) {
    incomingUsers = current.users && current.users.length > 0 ? current.users : DEFAULT_USERS_BACKUP;
  }
  const updated = {
    violations: incoming.violations || current.violations,
    rewards: incoming.rewards || current.rewards,
    users: incomingUsers,
    employees: incoming.employees || current.employees,
    violationCodes: incoming.violationCodes || current.violationCodes,
    rewardCodes: incoming.rewardCodes || current.rewardCodes,
    settings: incoming.settings || current.settings
  };
  writeDB(updated);
  res.json({ success: true, db: updated });
});
app.put("/api/db/sync", (req, res) => {
  const data = req.body;
  const current = readDB();
  if (data) {
    if (!data.users || !Array.isArray(data.users) || data.users.length === 0) {
      data.users = current.users && current.users.length > 0 ? current.users : DEFAULT_USERS_BACKUP;
    }
    writeDB(data);
  }
  res.json({ success: true, message: "Synchronized completely" });
});
var CLOUD_CACHE_FILE = import_path.default.join(DATA_DIR, "cloud_sync_state.json");
var CLOUD_FILES_DIR = import_path.default.join(DATA_DIR, "cloud_uploads");
if (!import_fs.default.existsSync(CLOUD_FILES_DIR)) {
  import_fs.default.mkdirSync(CLOUD_FILES_DIR, { recursive: true });
}
app.use("/cloud-files", import_express.default.static(CLOUD_FILES_DIR));
app.post("/api/cloud/test", async (req, res) => {
  const { endpoint, accessKey, secretKey, bucketName } = req.body || {};
  const cleanEndpoint = (endpoint || "").trim();
  if (!cleanEndpoint) {
    return res.status(400).json({ success: false, message: "\u0622\u062F\u0631\u0633 \u0641\u0636\u0627\u06CC \u0627\u0628\u0631\u06CC / End Point \u0627\u0644\u0632\u0627\u0645\u06CC \u0627\u0633\u062A." });
  }
  const targetUrl = cleanEndpoint.startsWith("http://") || cleanEndpoint.startsWith("https://") ? cleanEndpoint : `https://${cleanEndpoint}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6e3);
    let response = null;
    try {
      response = await fetch(targetUrl, { method: "HEAD", signal: controller.signal });
    } catch {
      response = await fetch(targetUrl, { method: "GET", signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (response && (response.ok || response.status < 500)) {
      return res.json({
        success: true,
        endpoint: targetUrl,
        statusCode: response.status,
        message: `\u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u0641\u0636\u0627\u06CC \u0627\u0628\u0631\u06CC (${targetUrl}) \u0628\u0631\u0642\u0631\u0627\u0631 \u0634\u062F. (\u06A9\u062F \u0648\u0636\u0639\u06CC\u062A: ${response.status})`,
        bucket: bucketName || "safewatch-share",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } else {
      return res.status(400).json({
        success: false,
        endpoint: targetUrl,
        statusCode: response ? response.status : 0,
        message: `\u0633\u0631\u0648\u0631 \u0627\u0628\u0631\u06CC \u067E\u0627\u0633\u062E \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0631\u0633\u0627\u0644 \u06A9\u0631\u062F (\u06A9\u062F \u0648\u0636\u0639\u06CC\u062A ${response ? response.status : "\u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647"}). \u0644\u0637\u0641\u0627\u064B \u0622\u062F\u0631\u0633 \u0633\u0631\u0648\u0631 \u0627\u0628\u0631\u06CC \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u0646\u0645\u0627\u06CC\u06CC\u062F.`
      });
    }
  } catch (err) {
    const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
    return res.status(502).json({
      success: false,
      endpoint: targetUrl,
      message: isTimeout ? `\u062E\u0637\u0627\u06CC \u0639\u062F\u0645 \u067E\u0627\u0633\u062E\u200C\u06AF\u0648\u06CC\u06CC \u0633\u0631\u0648\u0631 \u0627\u0628\u0631\u06CC: \u0645\u0647\u0644\u062A \u0632\u0645\u0627\u0646 \u0627\u062A\u0635\u0627\u0644 (6 \u062B\u0627\u0646\u06CC\u0647) \u0628\u0647 \u067E\u0627\u06CC\u0627\u0646 \u0631\u0633\u06CC\u062F.` : `\u062E\u0637\u0627 \u062F\u0631 \u0628\u0631\u0642\u0631\u0627\u0631\u06CC \u0627\u0631\u062A\u0628\u0627\u0637 \u0628\u0627 \u0641\u0636\u0627\u06CC \u0627\u0628\u0631\u06CC (${targetUrl}): ${err.message || "\u0634\u0628\u06A9\u0647 \u063A\u06CC\u0631\u0642\u0627\u0628\u0644 \u062F\u0633\u062A\u0631\u0633 \u0627\u0633\u062A"}`
    });
  }
});
app.post("/api/cloud/sync/push", (req, res) => {
  try {
    const { payload, config } = req.body || {};
    if (payload) {
      import_fs.default.writeFileSync(CLOUD_CACHE_FILE, JSON.stringify(payload, null, 2), "utf8");
      if (payload.violations || payload.rewards) {
        writeDB({
          violations: payload.violations || [],
          rewards: payload.rewards || [],
          users: payload.users || DEFAULT_USERS_BACKUP,
          employees: payload.employees || [],
          violationCodes: payload.violationCodes || [],
          rewardCodes: payload.rewardCodes || [],
          settings: payload.settings || null
        });
      }
    }
    res.json({
      success: true,
      message: "\u062F\u0627\u062F\u0647\u200C\u0647\u0627 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u0641\u0636\u0627\u06CC \u0627\u0628\u0631\u06CC \u067E\u0627\u0631\u0633\u200C\u067E\u06A9 \u0630\u062E\u06CC\u0631\u0647 \u0648 \u062F\u0631 \u0634\u0628\u06A9\u0647 \u0645\u0646\u062A\u0642\u0644 \u0634\u062F.",
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "\u062E\u0637\u0627 \u062F\u0631 \u0627\u0646\u062A\u0642\u0627\u0644 \u062F\u0627\u062F\u0647 \u0628\u0647 \u0641\u0636\u0627\u06CC \u0627\u0628\u0631\u06CC" });
  }
});
app.post("/api/cloud/sync/pull", (req, res) => {
  try {
    if (import_fs.default.existsSync(CLOUD_CACHE_FILE)) {
      const data = import_fs.default.readFileSync(CLOUD_CACHE_FILE, "utf8");
      const payload = JSON.parse(data);
      return res.json({ success: true, payload });
    }
    const currentDb = readDB();
    return res.json({
      success: true,
      payload: {
        timestamp: Date.now(),
        violations: currentDb.violations,
        rewards: currentDb.rewards,
        users: currentDb.users,
        employees: currentDb.employees,
        violationCodes: currentDb.violationCodes,
        rewardCodes: currentDb.rewardCodes,
        settings: currentDb.settings
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062F\u0627\u062F\u0647\u200C\u0647\u0627 \u0627\u0632 \u0641\u0636\u0627\u06CC \u0627\u0628\u0631\u06CC" });
  }
});
app.post("/api/cloud/upload", import_express.default.json({ limit: "50mb" }), (req, res) => {
  try {
    const { fileName, fileData, folder } = req.body || {};
    if (!fileData) {
      return res.status(400).json({ success: false, message: "\u0645\u062D\u062A\u0648\u0627\u06CC \u0641\u0627\u06CC\u0644 \u062E\u0627\u0644\u06CC \u0627\u0633\u062A." });
    }
    const safeFolder = folder ? String(folder).replace(/[^a-zA-Z0-9_-]/g, "") : "evidence";
    const targetDir = import_path.default.join(CLOUD_FILES_DIR, safeFolder);
    if (!import_fs.default.existsSync(targetDir)) {
      import_fs.default.mkdirSync(targetDir, { recursive: true });
    }
    const safeName = `${Date.now()}_${(fileName || "file.jpg").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = import_path.default.join(targetDir, safeName);
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
    import_fs.default.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    const fileUrl = `/cloud-files/${safeFolder}/${safeName}`;
    return res.json({
      success: true,
      url: fileUrl,
      message: "\u0641\u0627\u06CC\u0644 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631 \u0641\u0636\u0627\u06CC \u0627\u0628\u0631\u06CC \u067E\u0627\u0631\u0633\u200C\u067E\u06A9 \u0630\u062E\u06CC\u0631\u0647 \u0648 \u0644\u06CC\u0646\u06A9 \u0634\u0628\u06A9\u0647 \u062A\u0648\u0644\u06CC\u062F \u0634\u062F."
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "\u062E\u0637\u0627 \u062F\u0631 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0641\u0627\u06CC\u0644 \u062F\u0631 \u0641\u0636\u0627\u06CC \u0627\u0628\u0631\u06CC" });
  }
});
app.post("/api/sms/send", async (req, res) => {
  const { config, recipientPhone, message, placeholders } = req.body;
  if (!config || !config.isEnabled) {
    return res.status(400).json({ success: false, message: "SMS is disabled or configuration is missing." });
  }
  const { name, date, reason, type } = placeholders || { name: "\u067E\u0631\u0633\u0646\u0644", date: "-", reason: "-", type: "\u0627\u062E\u0637\u0627\u0631" };
  const provider = config.provider;
  let recipient = recipientPhone ? String(recipientPhone).replace(/[^\d+]/g, "") : "";
  if (recipient.startsWith("+98")) {
    recipient = "0" + recipient.substring(3);
  } else if (recipient.startsWith("98") && recipient.length === 12) {
    recipient = "0" + recipient.substring(2);
  }
  if (provider === "SIMULATOR") {
    return res.json({
      success: true,
      provider: "SIMULATOR",
      message: "\u067E\u06CC\u0627\u0645\u06A9 \u062F\u0631 \u062D\u0627\u0644\u062A \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0631\u0633\u0627\u0644 \u0634\u062F.",
      response: { status: "simulated_success", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
  }
  try {
    let url = "";
    let options = { method: "POST", headers: {} };
    if (provider === "KAVENEGAR") {
      const apiKey = config.apiKey;
      const template = type === "\u0627\u062E\u0637\u0627\u0631" ? config.warningTemplate : config.rewardTemplate;
      const isPattern = !/\s/.test(template || "") && !/{/.test(template || "");
      if (isPattern) {
        const encodedName = encodeURIComponent(name.replace(/\s+/g, "_"));
        const encodedReason = encodeURIComponent(reason.substring(0, 20).replace(/\s+/g, "_"));
        const encodedDate = encodeURIComponent(date.replace(/\//g, "-"));
        url = `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json?receptor=${recipient}&token=${encodedName}&token2=${encodedReason}&token3=${encodedDate}&template=${template}`;
        options = { method: "GET" };
      } else {
        url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`;
        const params = new URLSearchParams();
        params.append("receptor", recipient);
        params.append("sender", config.senderLine || "");
        params.append("message", message);
        options = {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params.toString()
        };
      }
    } else if (provider === "FARAZSMS") {
      url = "https://api.ippanel.com/v1/messages/patterns/send";
      const templateCode = type === "\u0627\u062E\u0637\u0627\u0631" ? config.warningTemplate : config.rewardTemplate;
      options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `AccessKey ${config.apiKey}`
        },
        body: JSON.stringify({
          pattern_code: templateCode,
          originator: config.senderLine || "+983000505",
          recipient,
          values: {
            name,
            date,
            reason,
            type
          }
        })
      };
    } else if (provider === "MELIPAYAMAK") {
      url = "https://rest.payamak.ir/BaseService/SendWithPattern";
      const bodyId = type === "\u0627\u062E\u0637\u0627\u0631" ? config.warningTemplate : config.rewardTemplate;
      options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: config.senderLine,
          // username is in senderLine
          password: config.apiKey,
          // password is in apiKey
          text: `${name};${date};${reason}`,
          to: recipient,
          bodyId: parseInt(bodyId || "0")
        })
      };
    } else if (provider === "SMSIR") {
      url = "https://api.sms.ir/v1/send/verify";
      const templateId = type === "\u0627\u062E\u0637\u0627\u0631" ? config.warningTemplate : config.rewardTemplate;
      options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/plain",
          "x-api-key": config.apiKey
        },
        body: JSON.stringify({
          mobile: recipient,
          templateId: parseInt(templateId || "0"),
          parameters: [
            { name: "name", value: name },
            { name: "date", value: date },
            { name: "reason", value: reason },
            { name: "type", value: type }
          ]
        })
      };
    } else if (provider === "CUSTOM") {
      let customUrl = config.customUrl || "";
      customUrl = customUrl.replace(/{phone}/g, encodeURIComponent(recipient)).replace(/{message}/g, encodeURIComponent(message));
      let headers = {};
      if (config.customHeaders) {
        try {
          headers = JSON.parse(config.customHeaders);
        } catch (e) {
          console.warn("Failed to parse custom SMS headers:", e);
        }
      }
      const method = config.customMethod || "POST";
      let body = void 0;
      if (method === "POST" && config.customBodyTemplate) {
        let bodyStr = config.customBodyTemplate;
        bodyStr = bodyStr.replace(/{phone}/g, recipient).replace(/{message}/g, message).replace(/{name}/g, name).replace(/{date}/g, date).replace(/{reason}/g, reason).replace(/{type}/g, type);
        try {
          body = JSON.parse(bodyStr);
          headers["Content-Type"] = headers["Content-Type"] || "application/json";
          body = JSON.stringify(body);
        } catch (e) {
          body = bodyStr;
        }
      }
      options = {
        method,
        headers,
        body
      };
      url = customUrl;
    }
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    if (response.ok) {
      if (provider === "KAVENEGAR" && data && data.return && data.return.status !== 200) {
        return res.status(400).json({
          success: false,
          provider,
          message: `\u062E\u0637\u0627\u06CC \u0633\u0627\u0645\u0627\u0646\u0647 \u06A9\u0627\u0648\u0647\u200C\u0646\u06AF\u0627\u0631: ${data.return.message} (\u06A9\u062F ${data.return.status})`,
          response: data
        });
      }
      if (provider === "SMSIR" && data && typeof data.status === "number" && data.status !== 1) {
        return res.status(400).json({
          success: false,
          provider,
          message: `\u062E\u0637\u0627\u06CC \u0633\u0627\u0645\u0627\u0646\u0647 Sms.ir: ${data.message || "\u0627\u0631\u0633\u0627\u0644 \u0646\u0627\u0645\u0648\u0641\u0642"}`,
          response: data
        });
      }
      return res.json({
        success: true,
        provider,
        message: "\u067E\u06CC\u0627\u0645\u06A9 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0627\u0632 \u0637\u0631\u06CC\u0642 \u062F\u0631\u06AF\u0627\u0647 \u0641\u0631\u0633\u062A\u0627\u062F\u0647 \u0634\u062F.",
        response: data
      });
    } else {
      let errorMsg = `\u062F\u0631\u06AF\u0627\u0647 \u067E\u06CC\u0627\u0645\u06A9 \u062E\u0637\u0627\u06CC \u06A9\u062F ${response.status} \u0631\u0627 \u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u062F.`;
      if (data) {
        if (provider === "FARAZSMS" && data.message) {
          errorMsg = `\u062E\u0637\u0627\u06CC \u0641\u0631\u0627\u0632 \u0627\u0633\u200C\u0627\u0645\u200C\u0627\u0633: ${data.message}`;
        } else if (data.message) {
          errorMsg = `\u062E\u0637\u0627\u06CC \u062F\u0631\u06AF\u0627\u0647: ${data.message}`;
        }
      }
      return res.status(response.status).json({
        success: false,
        provider,
        message: errorMsg,
        response: data
      });
    }
  } catch (error) {
    console.error("SMS send failed in proxy server:", error);
    return res.status(500).json({
      success: false,
      provider,
      message: `\u062E\u0637\u0627\u06CC \u0633\u06CC\u0633\u062A\u0645\u06CC \u0633\u0631\u0648\u0631 \u062F\u0631 \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645\u06A9: ${error.message || error}`
    });
  }
});
app.post("/api/n8n/trigger", async (req, res) => {
  try {
    const { n8nConfig, payload } = req.body || {};
    if (!n8nConfig) {
      return res.status(400).json({ success: false, message: "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A n8n \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
    }
    const baseUrl = (n8nConfig.baseUrl || "").trim().replace(/\/+$/, "");
    let webhookPath = (n8nConfig.webhookPath || "/webhook/safewatch-events").trim();
    let targetUrl = "";
    if (webhookPath.startsWith("http://") || webhookPath.startsWith("https://")) {
      targetUrl = webhookPath;
    } else {
      if (!webhookPath.startsWith("/")) webhookPath = "/" + webhookPath;
      targetUrl = baseUrl ? `${baseUrl}${webhookPath}` : "";
    }
    if (!targetUrl) {
      return res.status(400).json({ success: false, message: "\u0622\u062F\u0631\u0633 \u0648\u0628\u200C\u0647\u0648\u06A9 n8n \u0645\u0634\u062E\u0635 \u0646\u0634\u062F\u0647 \u0627\u0633\u062A." });
    }
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "SafeWatch-HSE-System/4.9.0"
    };
    if (n8nConfig.apiKey) {
      headers["Authorization"] = `Bearer ${n8nConfig.apiKey}`;
      headers["X-N8N-API-KEY"] = n8nConfig.apiKey;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1e4);
    let response;
    try {
      response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload || {}),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
    const responseData = await response.json().catch(() => null);
    if (response.ok) {
      return res.json({
        success: true,
        statusCode: response.status,
        message: `\u0648\u0628\u200C\u0647\u0648\u06A9 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u0628\u0647 \u0627\u062A\u0648\u0645\u0627\u0633\u06CC\u0648\u0646 n8n (${targetUrl}) \u0627\u0631\u0633\u0627\u0644 \u06AF\u0631\u062F\u06CC\u062F. (\u06A9\u062F: ${response.status})`,
        responseData
      });
    } else {
      return res.status(response.status).json({
        success: false,
        statusCode: response.status,
        message: `\u0633\u0631\u0648\u0631 n8n \u067E\u0627\u0633\u062E \u06A9\u062F ${response.status} \u0627\u0631\u0633\u0627\u0644 \u06A9\u0631\u062F.`,
        responseData
      });
    }
  } catch (err) {
    const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
    return res.status(502).json({
      success: false,
      message: isTimeout ? "\u067E\u0627\u0633\u062E\u200C\u06AF\u0648\u06CC\u06CC \u0633\u0631\u0648\u0631 n8n \u0628\u06CC\u0634 \u0627\u0632 10 \u062B\u0627\u0646\u06CC\u0647 \u0637\u0648\u0644 \u06A9\u0634\u06CC\u062F (\u0645\u0647\u0644\u062A \u0632\u0645\u0627\u0646 \u0628\u0647 \u067E\u0627\u06CC\u0627\u0646 \u0631\u0633\u06CC\u062F)." : `\u062E\u0637\u0627 \u062F\u0631 \u0627\u062A\u0635\u0627\u0644 \u0628\u0647 \u0633\u0631\u0648\u0631 n8n: ${err.message || "\u0634\u0628\u06A9\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A"}`
    });
  }
});
app.post("/api/n8n/webhook-receive", (req, res) => {
  try {
    const body = req.body || {};
    const { action, payload, violations, rewards, employees, users } = body;
    const currentDb = readDB();
    if (action === "SYNC" || action === "IMPORT" || payload && payload.violations) {
      const incoming = payload || body;
      const mergedViolationsMap = /* @__PURE__ */ new Map();
      currentDb.violations.forEach((v) => mergedViolationsMap.set(v.id, v));
      (incoming.violations || []).forEach((v) => {
        if (v && v.id) mergedViolationsMap.set(v.id, v);
      });
      const mergedRewardsMap = /* @__PURE__ */ new Map();
      currentDb.rewards.forEach((r) => mergedRewardsMap.set(r.id, r));
      (incoming.rewards || []).forEach((r) => {
        if (r && r.id) mergedRewardsMap.set(r.id, r);
      });
      const mergedEmpMap = /* @__PURE__ */ new Map();
      currentDb.employees.forEach((e) => mergedEmpMap.set(e.personnelId, e));
      (incoming.employees || []).forEach((e) => {
        if (e && e.personnelId) mergedEmpMap.set(e.personnelId, e);
      });
      const updatedState = {
        ...currentDb,
        violations: Array.from(mergedViolationsMap.values()),
        rewards: Array.from(mergedRewardsMap.values()),
        employees: Array.from(mergedEmpMap.values())
      };
      writeDB(updatedState);
      return res.json({
        success: true,
        message: "\u0628\u0633\u062A\u0647 \u0647\u0645\u06AF\u0627\u0645\u200C\u0633\u0627\u0632\u06CC n8n \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062F\u0631\u06CC\u0627\u0641\u062A \u0648 \u062F\u0631 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u067E\u0631\u0648\u0646\u062F\u0647\u200C\u0647\u0627 \u0627\u062F\u063A\u0627\u0645 \u0634\u062F.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    return res.json({
      success: true,
      message: "\u0631\u0648\u06CC\u062F\u0627\u062F n8n \u062F\u0631\u06CC\u0627\u0641\u062A \u0648 \u062B\u0628\u062A \u06AF\u0631\u062F\u06CC\u062F.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `\u062E\u0637\u0627 \u062F\u0631 \u067E\u0631\u062F\u0627\u0632\u0634 \u0648\u0628\u200C\u0647\u0648\u06A9 \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC n8n: ${err.message}`
    });
  }
});
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", version: "2.0.0" });
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}
start();
//# sourceMappingURL=server.cjs.map

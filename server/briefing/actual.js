import actualApi from "@actual-app/api";
import { decrypt } from "./encryption.js";
import db from "../db/connection.js";

export async function sendBill(billData, userId) {
  const settingsResult = await db.execute({
    sql: "SELECT actual_budget_url, actual_budget_password_encrypted, actual_budget_sync_id FROM ea_settings WHERE user_id = ?",
    args: [userId],
  });

  const settings = settingsResult.rows[0];
  if (!settings?.actual_budget_url || !settings?.actual_budget_sync_id) {
    throw new Error("Actual Budget not configured in EA settings");
  }

  const password = settings.actual_budget_password_encrypted
    ? decrypt(settings.actual_budget_password_encrypted)
    : null;

  const serverURL = settings.actual_budget_url.replace(/\/+$/, "");

  try {
    await actualApi.init({
      serverURL,
      password,
    });
    await actualApi.downloadBudget(settings.actual_budget_sync_id);

    const accounts = await actualApi.getAccounts();

    if (billData.type === "transfer") {
      // Credit card payment: transfer from checking to credit card account
      // Find accounts by name match (user should have matching account names)
      const creditCardAccount = accounts.find(
        (a) =>
          a.name.toLowerCase().includes(billData.payee.toLowerCase()) ||
          billData.payee.toLowerCase().includes(a.name.toLowerCase()),
      );
      const checkingAccount = accounts.find(
        (a) => a.type === "checking" || a.name.toLowerCase().includes("checking"),
      );

      if (creditCardAccount && checkingAccount) {
        await actualApi.addTransactions(checkingAccount.id, [
          {
            date: billData.due_date,
            amount: -Math.round(billData.amount * 100), // Actual uses cents, negative = outflow
            payee_name: billData.payee,
            transfer_id: creditCardAccount.id,
            notes: `Auto-detected bill from EA briefing`,
          },
        ]);
      } else {
        // Fallback: create as regular transaction if we can't find matching accounts
        const defaultAccount = checkingAccount || accounts[0];
        await actualApi.addTransactions(defaultAccount.id, [
          {
            date: billData.due_date,
            amount: -Math.round(billData.amount * 100),
            payee_name: billData.payee,
            notes: `Credit card payment (auto-detected from EA briefing)`,
          },
        ]);
      }
    } else if (billData.type === "income") {
      // Income: positive amount into checking
      const checkingAccount = accounts.find(
        (a) => a.type === "checking" || a.name.toLowerCase().includes("checking"),
      );
      const targetAccount = checkingAccount || accounts[0];

      await actualApi.addTransactions(targetAccount.id, [
        {
          date: billData.due_date,
          amount: Math.round(billData.amount * 100), // positive = inflow
          payee_name: billData.payee,
          notes: `Auto-detected income from EA briefing`,
        },
      ]);
    } else {
      // bill or expense: outflow from checking
      const checkingAccount = accounts.find(
        (a) => a.type === "checking" || a.name.toLowerCase().includes("checking"),
      );
      const targetAccount = checkingAccount || accounts[0];

      await actualApi.addTransactions(targetAccount.id, [
        {
          date: billData.due_date,
          amount: -Math.round(billData.amount * 100),
          payee_name: billData.payee,
          notes: `Auto-detected ${billData.type} from EA briefing`,
        },
      ]);
    }

    await actualApi.sync();
    return { success: true, message: `Sent ${billData.payee} $${billData.amount} to Actual Budget` };
  } finally {
    await actualApi.shutdown().catch(() => {});
  }
}

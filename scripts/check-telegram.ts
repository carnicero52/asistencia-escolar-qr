import { createClient } from "@libsql/client";

const db = createClient({
  url: "file:/home/z/my-project/db/custom.db",
});

async function checkTelegramConfig() {
  console.log("🔍 Verificando configuración de Telegram...\n");

  // Ver todas las columnas
  const tableInfo = await db.execute(`PRAGMA table_info(Negocio)`);
  console.log("📋 Columnas en tabla Negocio:");
  tableInfo.rows.forEach((row) => {
    if (
      (row.name as string).toLowerCase().includes("telegram") ||
      (row.name as string).toLowerCase().includes("token") ||
      (row.name as string).toLowerCase().includes("chat")
    ) {
      console.log(`   ⭐ ${row.name}`);
    }
  });

  console.log("\n📦 Negocios con configuración de Telegram:");
  const result = await db.execute({
    sql: `SELECT id, nombre, slug, 
          notifTelegramBotToken, notifTelegramChatId
          FROM Negocio`,
    args: [],
  });

  result.rows.forEach((row) => {
    console.log(`\n   🏢 ${row.nombre} (${row.slug})`);
    console.log(`      notifTelegramBotToken: ${row.notifTelegramBotToken || "❌ vacío"}`);
    console.log(`      notifTelegramChatId: ${row.notifTelegramChatId || "❌ vacío"}`);
  });
}

checkTelegramConfig().catch(console.error);

import { createClient } from "@libsql/client";

const db = createClient({
  url: "libsql://fideliqr-carnicero52.aws-us-east-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzEzNjkxMjgsImlkIjoiMWQ0ZWE2N2ItOTc2My00MTk0LThjNjMtZWI3YWE1NGM2NmU3IiwicmlkIjoiNGJjNjk1OGYtODQzMi00ZTViLTk2MDItY2JkMTI5OGJlYTk4In0.2cL6hKHKwhApFFY4hHeeGtkgFjLv4pS_Ubd6sgcKcAORzjGy-FZ4Yi583TWL69Z4jPNbmS82L7xzAAFka2JVCA",
});

async function migrate() {
  console.log("🔧 Agregando columnas de conocimiento a Turso...\n");

  // Ver columnas actuales
  const tableInfo = await db.execute(`PRAGMA table_info(Negocio)`);
  const columns = tableInfo.rows.map(r => r.name as string);
  
  console.log(`📋 Columnas actuales: ${columns.length}`);

  // Columnas a agregar
  const columnsToAdd = [
    { name: 'conocimientoBase', sql: 'ALTER TABLE Negocio ADD COLUMN conocimientoBase TEXT' },
    { name: 'conocimientoArchivos', sql: 'ALTER TABLE Negocio ADD COLUMN conocimientoArchivos TEXT' },
    { name: 'modoBot', sql: 'ALTER TABLE Negocio ADD COLUMN modoBot TEXT DEFAULT "hibrido"' },
    { name: 'iaProvider', sql: 'ALTER TABLE Negocio ADD COLUMN iaProvider TEXT DEFAULT "z-ai"' },
    { name: 'iaApiKey', sql: 'ALTER TABLE Negocio ADD COLUMN iaApiKey TEXT' },
    { name: 'iaModelo', sql: 'ALTER TABLE Negocio ADD COLUMN iaModelo TEXT' },
    { name: 'iaTemperature', sql: 'ALTER TABLE Negocio ADD COLUMN iaTemperature REAL DEFAULT 0.7' },
  ];

  for (const col of columnsToAdd) {
    if (columns.includes(col.name)) {
      console.log(`   ⏭️ ${col.name} ya existe`);
    } else {
      try {
        await db.execute(col.sql);
        console.log(`   ✅ ${col.name} agregada`);
      } catch (error: any) {
        if (error.message?.includes('duplicate column')) {
          console.log(`   ⏭️ ${col.name} ya existe`);
        } else {
          console.log(`   ❌ Error en ${col.name}: ${error.message}`);
        }
      }
    }
  }

  // Verificar resultado
  const finalInfo = await db.execute(`PRAGMA table_info(Negocio)`);
  const finalColumns = finalInfo.rows.map(r => r.name as string);
  
  console.log(`\n📊 Columnas finales: ${finalColumns.length}`);
  console.log(`   conocimientoBase: ${finalColumns.includes('conocimientoBase') ? '✅' : '❌'}`);
  console.log(`   modoBot: ${finalColumns.includes('modoBot') ? '✅' : '❌'}`);
  console.log(`   iaProvider: ${finalColumns.includes('iaProvider') ? '✅' : '❌'}`);
}

migrate().catch(console.error);

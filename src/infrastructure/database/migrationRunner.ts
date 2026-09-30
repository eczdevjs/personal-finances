import db from './connection';

async function run() {
  const command = process.argv[2] || 'latest';

  try {
    if (command === 'rollback') {
      console.log('🔄 Executando rollback das migrations...');
      const [batchNo, log] = await db.migrate.rollback();
      if (log.length === 0) {
        console.log('ℹ️ Nenhuma migration para reverter.');
      } else {
        console.log(`✅ Rollback concluído (Batch ${batchNo}). Arquivos revertidos:`, log);
      }
    } else if (command === 'make') {
      const migrationName = process.argv[3];
      if (!migrationName) {
        console.error('❌ Por favor, informe o nome da migration. Ex: npm run migrate:make create_users');
        process.exit(1);
      }
      console.log(`📝 Criando migration: ${migrationName}...`);
      const name = await db.migrate.make(migrationName, { extension: 'ts' });
      console.log(`✅ Migration criada em: ${name}`);
    } else {
      console.log('🚀 Executando migrations para a versão mais recente (latest)...');
      const [batchNo, log] = await db.migrate.latest();
      if (log.length === 0) {
        console.log('ℹ️ Todas as migrations já estão atualizadas.');
      } else {
        console.log(`✅ Migrations executadas com sucesso (Batch ${batchNo}):`, log);
      }
    }
  } catch (error) {
    console.error('❌ Erro durante a execução da migration:', error);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

run();
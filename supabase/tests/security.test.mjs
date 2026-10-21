import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const fixture = JSON.parse((await readFile(new URL('./fixtures/security-schema-before.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
const migration = await readFile(new URL('../migrations/0023_security_hardening.sql', import.meta.url), 'utf8');
const reportsMigration = await readFile(new URL('../migrations/0024_management_reports.sql', import.meta.url), 'utf8');
const reportStockMigration = await readFile(new URL('../migrations/0026_report_current_stock.sql', import.meta.url), 'utf8');
const loansMigration = await readFile(new URL('../migrations/0025_item_loans.sql', import.meta.url), 'utf8');
const loansWithoutDueDateMigration = await readFile(new URL('../migrations/0029_item_loans_without_due_date.sql', import.meta.url), 'utf8');
const serviceOrdersMigration = await readFile(new URL('../migrations/0027_service_orders.sql', import.meta.url), 'utf8');
const serviceOrderPriorityMigration = await readFile(new URL('../migrations/0028_service_order_priority.sql', import.meta.url), 'utf8');
const ids = {
  tenantA: '10000000-0000-4000-8000-000000000001', tenantB: '10000000-0000-4000-8000-000000000002',
  owner: '20000000-0000-4000-8000-000000000001', member: '20000000-0000-4000-8000-000000000002',
  inactive: '20000000-0000-4000-8000-000000000003', ownerB: '20000000-0000-4000-8000-000000000004',
  productA: '30000000-0000-4000-8000-000000000001', productB: '30000000-0000-4000-8000-000000000002',
};
const quote = (value) => `"${value.replaceAll('"', '""')}"`;
const literal = (value) => `'${value.replaceAll("'", "''")}'`;

async function bootstrap(db) {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema private; create schema storage;
    grant usage on schema public, auth, private, storage to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb; $$;
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    grant select, insert, delete on storage.objects to anon, authenticated;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1];
    $$;
  `);
  for (const table of fixture.tables) {
    const columns = fixture.columns.filter((c) => c.table_schema === table.schema_name && c.table_name === table.table_name)
      .sort((a, b) => a.ordinal_position - b.ordinal_position);
    const definitions = columns.map((c) => {
      const type = c.data_type === 'ARRAY' ? 'text[]' : c.data_type === 'numeric'
        ? `numeric(${c.numeric_precision},${c.numeric_scale})` : c.data_type;
      return `${quote(c.column_name)} ${type}${c.is_nullable === 'NO' ? ' not null' : ''}${c.column_default ? ` default ${c.column_default}` : ''}`;
    });
    if (table.table_name === 'user_permissions') definitions.push('primary key (user_id, permission_key)');
    else definitions.push(`primary key (${table.table_name === 'permissions' ? 'key' : 'id'})`);
    if (table.table_name === 'member_invitations') definitions.push('unique (token_hash)');
    const name = `${quote(table.schema_name)}.${quote(table.table_name)}`;
    await db.exec(`create table ${name} (${definitions.join(', ')});`);
    if (table.rls_enabled) await db.exec(`alter table ${name} enable row level security;`);
    if (table.rls_forced) await db.exec(`alter table ${name} force row level security;`);
    if (['users', 'tenants', 'products', 'stock_movements', 'transactions'].includes(table.table_name)) {
      await db.exec(`grant select, insert, update, delete on ${name} to authenticated;`);
    }
  }
  for (const f of fixture.functions) {
    await db.exec(f.definition);
    const signature = `${quote(f.schema_name)}.${quote(f.function_name)}(${f.arguments})`;
    await db.exec(`revoke all on function ${signature} from public, anon, authenticated, service_role;`);
    for (const [role, allowed] of Object.entries(f.execution)) {
      if (allowed) await db.exec(`grant execute on function ${signature} to ${quote(role)};`);
    }
  }
  for (const p of fixture.policies) {
    await db.exec(`create policy ${quote(p.policyname)} on ${quote(p.schemaname)}.${quote(p.tablename)}
      as ${p.permissive} for ${p.cmd} to ${p.roles.map(quote).join(', ')}
      ${p.qual ? `using (${p.qual})` : ''} ${p.with_check ? `with check (${p.with_check})` : ''};`);
  }
  for (const t of fixture.triggers) await db.exec(t.definition);
  // Dados inteiramente fictícios; nunca há conexão ao projeto Supabase.
  await db.exec(`
    insert into public.tenants (id, name, slug) values
      ('${ids.tenantA}', 'Empresa A', 'empresa-a'), ('${ids.tenantB}', 'Empresa B', 'empresa-b');
    insert into public.users (id, tenant_id, email, full_name, role, active) values
      ('${ids.owner}', '${ids.tenantA}', 'owner@example.test', 'Owner A', 'owner', true),
      ('${ids.member}', '${ids.tenantA}', 'member@example.test', 'Member A', 'member', true),
      ('${ids.inactive}', '${ids.tenantA}', 'inactive@example.test', 'Inactive A', 'member', false),
      ('${ids.ownerB}', '${ids.tenantB}', 'ownerb@example.test', 'Owner B', 'owner', true);
    insert into public.products (id, tenant_id, name, cost_price, current_stock) values
      ('${ids.productA}', '${ids.tenantA}', 'Produto A', 25, 10),
      ('${ids.productB}', '${ids.tenantB}', 'Produto B', 50, 20);
  `);
  const permissionsSource = await readFile(new URL('../../src/lib/auth/permissions.ts', import.meta.url), 'utf8');
  const keys = [...permissionsSource.matchAll(/:\s*"([a-z_]+\.[a-z_]+)"/g)].map((m) => m[1]);
  for (const key of keys) await db.exec(`insert into public.permissions (key, module, name) values (${literal(key)}, ${literal(key.split('.')[0])}, ${literal(key)});`);
  await db.exec(`insert into private.user_permissions (user_id, permission_key) values
    ('${ids.member}', 'products.view'), ('${ids.member}', 'products.create'),
    ('${ids.member}', 'products.update'), ('${ids.member}', 'stock.in'),
    ('${ids.member}', 'finance.create'), ('${ids.member}', 'members.invite'),
    ('${ids.member}', 'members.permissions');`);
}

test('migration de segurança: ataques e fluxos permitidos', async (t) => {
  const db = new PGlite();
  let checks = 0;
  async function as(role, user = '') {
    await db.exec(`reset role; set role ${quote(role)}; set request.jwt.claim.sub = ${literal(user)};`);
  }
  async function denied(sql, code = '42501') {
    await assert.rejects(db.exec(sql), (error) => error.code === code);
    checks++;
  }
  async function rows(sql) { return (await db.query(sql)).rows; }
  const createProduct = (cost = '0') => `select public.create_product('Novo', null, null, null, 'un', ${cost}, 10, 0, 0);`;
  const updateProduct = (id, cost = 'null') => `select public.update_product('${id}', 'Editado', null, null, null, 'un', 15, 0, ${cost});`;
  const finance = (status = 'PENDING') => `select public.create_financial_transaction('INCOME', 'Vendas', 'Teste', 10, current_date, '${status}', null, null);`;
  try {
    await bootstrap(db);
    await t.test('reproduz as falhas antes da migration', async () => {
      await as('authenticated', ids.member);
      await db.exec(`update public.users set role = 'owner' where id = '${ids.member}';`);
      await as('postgres');
      assert.equal((await rows(`select role from public.users where id = '${ids.member}'`))[0].role, 'owner');
      await db.exec(`update public.users set role = 'member' where id = '${ids.member}';`);
      await as('authenticated', ids.member);
      assert.equal(Number((await rows("select cost_price from public.list_products('')"))[0].cost_price), 25);
      await as('anon');
      await db.exec(`select public.execute_stock_movement('${ids.productB}', '${ids.tenantB}', 'ADJUST', 999, null, 'Exploit', 999);`);
      await as('postgres');
      assert.equal((await rows(`select current_stock from public.products where id = '${ids.productB}'`))[0].current_stock, 999);
      await db.exec(`update public.products set current_stock = 20 where id = '${ids.productB}'; delete from public.stock_movements;`);
    });
    await as('postgres');
    await db.exec(migration);
    await db.exec(migration); // Reexecução não reabre grants ou policies.

    await t.test('bloqueia APIs legadas e acesso anônimo', async () => {
      for (const role of ['anon', 'authenticated']) {
        await as(role, role === 'authenticated' ? ids.member : '');
        await denied(`select public.execute_stock_movement('${ids.productB}', '${ids.tenantB}', 'ADJUST', 999, null, null, 999);`);
        await denied(`select public.create_tenant_with_admin('Fake', 'fake', '${ids.member}', 'fake@example.test', 'Fake');`);
      }
      await as('anon');
      await denied(createProduct());
      await denied("select * from public.list_products('');");
      assert.equal((await rows("select count(*) from public.get_member_invitation_public(repeat('a', 64))"))[0].count, 0);
    });
    await t.test('bloqueia escrita direta e custo sem permissão', async () => {
      await as('authenticated', ids.member);
      await denied(`update public.users set role = 'owner' where id = '${ids.member}';`);
      await denied(`update public.users set active = true where id = '${ids.inactive}';`);
      await denied('select cost_price from public.products;');
      await denied(`update public.products set current_stock = 999 where id = '${ids.productA}';`);
      await denied('insert into public.transactions (description) values (\'Forged\');');
      assert.equal((await rows("select cost_price from public.list_products('')"))[0].cost_price, null);
      assert.equal((await rows(`select cost_price from public.get_product('${ids.productA}')`))[0].cost_price, null);
      await denied(createProduct('99'));
      await denied(updateProduct(ids.productA, '99'));
      await db.exec(createProduct());
      await db.exec(updateProduct(ids.productA));
      await denied(`select public.execute_stock_movement('${ids.productA}', 'IN', 1, 99, null);`);
      await db.exec(`select public.execute_stock_movement('${ids.productA}', 'IN', 1, null, null);`);
    });
    await t.test('aplica permissões financeiras, de configuração e dashboard', async () => {
      await as('authenticated', ids.member);
      await db.exec(finance());
      await denied(finance('PAID'));
      await denied(finance('CANCELLED'));
      await denied(`select public.set_financial_transaction_status(gen_random_uuid(), 'PAID');`);
      await denied(`select public.delete_financial_transaction(gen_random_uuid());`);
      await denied("select public.update_company_settings('Forged', 'forged');");
      await denied('select public.get_dashboard_stock_summary();');
      await denied('select public.get_dashboard_financial_summary();');
    });
    await t.test('impede delegação de privilégios superiores aos do membro', async () => {
      await as('authenticated', ids.member);
      await denied(`select public.update_member_permissions('${ids.member}', array['finance.delete']);`);
      await denied(`select public.create_member_invitation('new@example.test', repeat('b',64), array['finance.delete'], now() + interval '1 day');`);
      await db.exec(`select public.create_member_invitation('allowed@example.test', repeat('c',64), array['products.view'], now() + interval '1 day');`);
    });
    await t.test('protege uploads por usuário, permissão e status ativo', async () => {
      await as('authenticated', ids.member);
      await db.exec(`insert into storage.objects (bucket_id, name) values ('product-images', '${ids.member}/image.png');`);
      await denied(`insert into storage.objects (bucket_id, name) values ('product-images', '${ids.owner}/image.png');`);
      await denied(`insert into storage.objects (bucket_id, name) values ('product-images', 'image.png');`);
      await as('authenticated', ids.inactive);
      await denied(`insert into storage.objects (bucket_id, name) values ('product-images', '${ids.inactive}/image.png');`);
    });
    await t.test('bloqueia conta inativa e mantém recuperação do status', async () => {
      await as('authenticated', ids.inactive);
      await denied(createProduct());
      await denied("select * from public.list_products('');");
      await denied(`select public.execute_stock_movement('${ids.productA}', 'IN', 1, null, null);`);
      assert.equal((await rows('select public.get_tenant_id() as id'))[0].id, null);
      assert.equal((await rows('select active from public.get_my_account_status()'))[0].active, false);
      assert.equal((await rows('select count(*) from public.tenants'))[0].count, 0);
    });
    await t.test('preserva owner e isolamento entre empresas', async () => {
      await as('authenticated', ids.owner);
      const products = await rows("select * from public.list_products('')");
      assert.ok(products.length > 0 && products.every((p) => p.tenant_id === ids.tenantA));
      assert.equal(Number(products.find((p) => p.id === ids.productA).cost_price), 25);
      assert.equal((await rows(`select count(*) from public.get_product('${ids.productB}')`))[0].count, 0);
      await denied(updateProduct(ids.productB), 'P0002');
      await denied(`select public.execute_stock_movement('${ids.productB}', 'OUT', 1, null, null);`, 'P0002');
      await db.exec(createProduct('5'));
      await db.exec(finance('PAID'));
      await db.exec("select public.update_company_settings('Empresa A editada', 'empresa-a');");
      await rows('select public.get_dashboard_stock_summary()');
      await rows('select public.get_dashboard_financial_summary()');
      await rows('select public.get_my_access_context()');
      await rows('select * from public.list_stock_products()');
      await as('postgres');
      assert.equal((await rows(`select current_stock from public.products where id = '${ids.productB}'`))[0].current_stock, 20);
      assert.equal((await rows(`select name from public.tenants where id = '${ids.tenantB}'`))[0].name, 'Empresa B');
    });
    await t.test('diagnóstico pós-migration confirma todas as proteções estruturais', async () => {
      await as('postgres');
      const verification = await readFile(new URL('../diagnostics/verify_security_hardening.sql', import.meta.url), 'utf8');
      const results = await rows(verification);
      assert.ok(results.length > 0);
      for (const result of results) assert.equal(result.passed, true, result.check_name);
    });
    await t.test('mobile consulta produtos sem acesso geral ao cadastro ou aos custos', async () => {
      await as('authenticated', ids.member);
      await denied('select * from public.list_withdrawal_products();');
      await as('postgres');
      await db.exec(`delete from private.user_permissions where user_id = '${ids.member}';
        insert into private.user_permissions (user_id, permission_key) values ('${ids.member}', 'stock.out');`);
      await as('authenticated', ids.member);
      const products = await rows('select * from public.list_withdrawal_products()');
      assert.ok(products.length > 0);
      assert.ok(products.every((p) => !('cost_price' in p) && p.id !== ids.productB));
      await denied("select * from public.list_products('');");
      await db.exec(`select public.execute_stock_movement('${ids.productA}', 'OUT', 1, null, 'Mobile');`);
    });
    await t.test('relatórios usam período completo e respeitam empresa e permissão', async () => {
      await as('postgres');
      await db.exec(reportsMigration);
      await db.exec(reportsMigration);
      await db.exec(reportStockMigration);
      await db.exec(`delete from public.stock_movements;
        delete from public.transactions;
        insert into public.stock_movements (tenant_id, product_id, type, quantity, created_at) values
          ('${ids.tenantA}', '${ids.productA}', 'IN', 5, now()),
          ('${ids.tenantA}', '${ids.productA}', 'OUT', 3, now()),
          ('${ids.tenantA}', '${ids.productA}', 'ADJUST', 10, now()),
          ('${ids.tenantB}', '${ids.productB}', 'OUT', 99, now());
        insert into public.transactions (tenant_id, type, category, description, amount, due_date, paid_at, status) values
          ('${ids.tenantA}', 'INCOME', 'Serviço', 'Recebido', 100, current_date, current_date, 'PAID'),
          ('${ids.tenantA}', 'EXPENSE', 'Serviço', 'Pago', 40, current_date, current_date, 'PAID'),
          ('${ids.tenantB}', 'EXPENSE', 'Outro', 'Outro tenant', 999, current_date, current_date, 'PAID');`);
      await as('anon');
      await denied('select public.get_stock_report(current_date, current_date, null);');
      await denied('select public.get_financial_report(current_date, current_date);');
      await denied(`select public.get_report_product_current_stock('${ids.productA}');`);
      await as('authenticated', ids.member);
      await denied('select public.get_stock_report(current_date, current_date, null);');
      await denied('select public.get_financial_report(current_date, current_date);');
      await denied(`select public.get_report_product_current_stock('${ids.productA}');`);
      await as('authenticated', ids.inactive);
      await denied('select public.get_stock_report(current_date, current_date, null);');
      await as('postgres');
      await db.exec(`insert into private.user_permissions (user_id, permission_key)
        values ('${ids.member}', 'stock.view');`);
      await as('authenticated', ids.member);
      assert.equal(Number((await rows('select public.get_stock_report(current_date, current_date, null) as report'))[0].report.records), 3);
      assert.ok((await rows('select count(*) from public.list_report_products()'))[0].count > 0);
      assert.equal(Number((await rows(`select public.get_report_product_current_stock('${ids.productA}') as stock`))[0].stock), 10);
      await denied(`select public.get_report_product_current_stock('${ids.productB}');`, 'P0002');
      await denied('select public.get_financial_report(current_date, current_date);');
      await as('postgres');
      await db.exec(`insert into private.user_permissions (user_id, permission_key)
        values ('${ids.member}', 'finance.view');`);
      await as('authenticated', ids.member);
      assert.equal(Number((await rows('select public.get_financial_report(current_date, current_date) as report'))[0].report.paid), 40);
      await as('authenticated', ids.owner);
      const stock = (await rows(`select public.get_stock_report(current_date, current_date, '${ids.productA}') as report`))[0].report;
      assert.equal(Number(stock.incoming), 5);
      assert.equal(Number(stock.outgoing), 3);
      assert.equal(Number(stock.adjustments), 1);
      assert.equal(Number(stock.records), 3);
      assert.equal(stock.products.length, 1);
      const onlyOut = (await rows(`select public.get_stock_report(current_date, current_date, '${ids.productA}', 'OUT') as report`))[0].report;
      assert.equal(Number(onlyOut.outgoing), 3);
      assert.equal(Number(onlyOut.records), 1);
      const financial = (await rows('select public.get_financial_report(current_date, current_date) as report'))[0].report;
      assert.equal(Number(financial.received), 100);
      assert.equal(Number(financial.paid), 40);
      assert.equal(Number(financial.balance), 60);
      assert.equal(financial.categories.length, 2);
      const reportProducts = await rows('select id from public.list_report_products()');
      assert.ok(reportProducts.some((product) => product.id === ids.productA));
      assert.ok(reportProducts.every((product) => product.id !== ids.productB));
      await denied(`select public.get_stock_report(current_date, current_date, '${ids.productB}');`, '22023');
      await denied(`select public.get_stock_report(current_date, current_date, null, 'INVALID');`, '22023');
      await denied('select public.get_stock_report(current_date, current_date - 1, null);', '22023');
    });
    await t.test('empréstimos exigem permissão e impedem entrega duplicada ou entre empresas', async () => {
      await as('postgres');
      await db.exec(loansMigration);
      await as('anon');
      await denied('select * from public.list_loan_items();');
      await denied("select public.save_loan_item('Chave', 'Cópia 1');");
      await as('authenticated', ids.member);
      await denied('select * from public.list_loan_items();');
      await denied("select public.save_loan_item('Chave', 'Cópia 1');");
      await denied('select * from public.loan_items;');
      await as('authenticated', ids.inactive);
      await denied('select * from public.list_loan_items();');
      await as('authenticated', ids.owner);
      const itemA = (await rows("select public.save_loan_item('Chave da sala 204', 'Cópia 1') as id"))[0].id;
      const itemB = (await rows("select public.save_loan_item('Controle do portão', 'Controle 2') as id"))[0].id;
      assert.equal((await rows('select count(*) from public.list_loan_items()'))[0].count, 2);
      const loanId = (await rows(`select public.start_item_loan('${itemA}', 'João Externo', current_date + 1) as id`))[0].id;
      await denied(`select public.start_item_loan('${itemA}', 'Outro', current_date + 1);`, '23505');
      assert.equal((await rows("select count(*) from public.list_item_loans('OPEN')"))[0].count, 1);
      const summary = (await rows('select public.get_item_loan_dashboard() as data'))[0].data;
      assert.equal(Number(summary.open), 1);
      await as('postgres');
      await db.exec(`insert into private.user_permissions(user_id, permission_key) values ('${ids.member}', 'loans.view');`);
      await as('authenticated', ids.member);
      assert.equal((await rows('select count(*) from public.list_loan_items()'))[0].count, 2);
      await denied(`select public.start_item_loan('${itemB}', 'Maria', current_date + 1);`);
      await denied(`select public.finish_item_loan('${loanId}');`);
      await as('postgres');
      await db.exec(`insert into private.user_permissions(user_id, permission_key)
        values ('${ids.member}', 'loans.lend'), ('${ids.member}', 'loans.return');`);
      await as('authenticated', ids.member);
      const memberLoan = (await rows(`select public.start_item_loan('${itemB}', 'Maria', current_date + 1) as id`))[0].id;
      await denied("select public.save_loan_item('Outra chave', 'Cópia 3');");
      await db.exec(`select public.finish_item_loan('${memberLoan}', 'Recebido');`);
      await as('authenticated', ids.ownerB);
      assert.equal((await rows('select count(*) from public.list_loan_items()'))[0].count, 0);
      assert.equal((await rows(`select public.get_open_item_loan('${loanId}') as data`))[0].data, null);
      await denied(`select public.start_item_loan('${itemB}', 'Outra empresa', current_date + 1);`, 'P0002');
      await denied(`select public.finish_item_loan('${loanId}');`, 'P0002');
      await as('authenticated', ids.owner);
      await db.exec(`select public.finish_item_loan('${loanId}', 'Boas condições');`);
      await denied(`select public.finish_item_loan('${loanId}');`, 'P0002');
      assert.equal((await rows("select count(*) from public.list_item_loans('RETURNED')"))[0].count, 2);
      assert.equal((await rows('select available from public.list_loan_items() where id = ' + literal(itemA)))[0].available, true);
      const oldClientLoan = (await rows(`select public.start_item_loan('${itemA}', 'Nova pessoa', current_date + 1) as id`))[0].id;
      await as('postgres');
      await db.exec(loansWithoutDueDateMigration);
      await as('authenticated', ids.owner);
      assert.equal((await rows(`select public.get_open_item_loan('${oldClientLoan}') as data`))[0].data.borrower_name, 'Nova pessoa');
      await db.exec(`select public.finish_item_loan('${oldClientLoan}');`);
      const pendingId = (await rows(`select public.start_item_loan('${itemA}', 'Sem prazo', null) as id`))[0].id;
      const pending = (await rows(`select * from public.list_item_loans('OPEN') where id = '${pendingId}'`))[0];
      assert.equal(pending.due_date, null);
      assert.ok(pending.checked_out_at);
      assert.equal(pending.returned_at, null);
      assert.equal(Number((await rows('select public.get_item_loan_dashboard() as data'))[0].data.open), 1);
      await denied(`select public.start_item_loan('${itemA}', 'Duplicado', null);`, '23505');
      await db.exec(`select public.finish_item_loan('${pendingId}');`);
      const returned = (await rows(`select * from public.list_item_loans('RETURNED') where id = '${pendingId}'`))[0];
      assert.ok(returned.returned_at);
      assert.equal((await rows(`select public.get_open_item_loan('${pendingId}') as data`))[0].data, null);
    });
    await t.test('estoque preserva entradas, retiradas, ajustes e permissões existentes', async () => {
      await as('postgres');
      await db.exec(`delete from private.user_permissions where user_id = '${ids.member}';
        insert into private.user_permissions (user_id, permission_key) values
          ('${ids.member}', 'stock.view'), ('${ids.member}', 'stock.in');`);
      const initial = Number((await rows(`select current_stock from public.products where id = '${ids.productA}'`))[0].current_stock);
      const beforeCount = Number((await rows(`select count(*) from public.stock_movements where product_id = '${ids.productA}'`))[0].count);
      const movement = (type, quantity, cost = 'null') =>
        `select public.execute_stock_movement('${ids.productA}', '${type}', ${quantity}, ${cost}, 'Regressão') as result;`;

      // Uma sessão autenticada representa o mesmo JWT antigo: a autorização é
      // consultada no banco a cada RPC, sem exigir uma claim nova no token.
      await as('authenticated', ids.member);
      await denied(movement('OUT', 1));
      await denied(movement('ADJUST', 1));
      await denied(movement('IN', 1, '12.5'));
      const entry = (await rows(movement('IN', 4)))[0].result;
      assert.equal(Number(entry.old_stock), initial);
      assert.equal(Number(entry.new_stock), initial + 4);
      assert.equal(entry.created_by, ids.member);
      assert.equal(Number((await rows(`select current_stock from public.list_stock_products() where id = '${ids.productA}'`))[0].current_stock), initial + 4);
      const visibleEntry = (await rows(`select * from public.list_stock_movements(500) where id = '${entry.movement_id}'`))[0];
      assert.equal(visibleEntry.movement_type, 'IN');
      assert.equal(visibleEntry.quantity, 4);
      assert.equal(visibleEntry.unit_cost, null);
      await denied(movement('IN', 0), '22023');
      await denied(movement('IN', -1), '22023');
      await denied(movement('OUT', 1), '42501');
      await denied(`select public.execute_stock_movement('${ids.productB}', 'IN', 1, null, null);`, 'P0002');

      await as('postgres');
      await db.exec(`insert into private.user_permissions (user_id, permission_key) values ('${ids.member}', 'stock.out');`);
      await as('authenticated', ids.member);
      await denied(movement('OUT', initial + 5), '22023');
      const withdrawal = (await rows(movement('OUT', 3)))[0].result;
      assert.equal(Number(withdrawal.new_stock), initial + 1);
      await denied(movement('ADJUST', 0));
      await as('postgres');
      await db.exec(`insert into private.user_permissions (user_id, permission_key) values ('${ids.member}', 'stock.adjust');`);
      await as('authenticated', ids.member);
      const adjustment = (await rows(movement('ADJUST', 7)))[0].result;
      assert.equal(Number(adjustment.old_stock), initial + 1);
      assert.equal(Number(adjustment.new_stock), 7);
      assert.equal((await rows(`select * from public.list_stock_movements(500) where id = '${withdrawal.movement_id}'`))[0].movement_type, 'OUT');
      assert.equal((await rows(`select * from public.list_stock_movements(500) where id = '${adjustment.movement_id}'`))[0].movement_type, 'ADJUST');

      await as('postgres');
      assert.equal(Number((await rows(`select current_stock from public.products where id = '${ids.productA}'`))[0].current_stock), 7);
      assert.equal(Number((await rows(`select count(*) from public.stock_movements where product_id = '${ids.productA}'`))[0].count), beforeCount + 3);
      await db.exec(`delete from private.user_permissions where user_id = '${ids.member}';`);
      await as('authenticated', ids.member);
      await denied('select * from public.list_stock_movements(100);');
      await denied('select * from public.list_stock_products();');
      await denied(movement('IN', 1));
      await as('authenticated', ids.inactive);
      await denied(movement('IN', 1));
    });
    await t.test('OS isola empresas, restringe execução e exige principal sem pendências', async () => {
      await as('postgres');
      await db.exec(serviceOrdersMigration);
      await db.exec(serviceOrderPriorityMigration);
      await db.exec(serviceOrderPriorityMigration);
      const create = (principal, assignee) => `select public.create_service_order('Instalar câmera', 'Teste', 'Bloco 2',
        'NORMAL', current_date + 7, '${principal}',
        '[{"title":"Instalar tomada","assignee_id":"${assignee}"},{"title":"Testar câmera","assignee_id":"${principal}","depends_on_previous":true}]'::jsonb) as id;`;
      await as('anon');
      await denied('select public.list_service_orders();');
      await as('authenticated', ids.member);
      await denied(create(ids.owner, ids.member));
      await as('authenticated', ids.owner);
      await denied(create(ids.ownerB, ids.member), '22023');
      await denied(`select public.create_service_order('Instalar câmera', null, null,
        'NORMAL', (now() at time zone 'America/Sao_Paulo')::date - 1,
        '${ids.owner}', '[{"title":"Testar câmera","assignee_id":"${ids.owner}"}]'::jsonb);`, '22023');
      const orderId = (await rows(create(ids.owner, ids.member)))[0].id;
      const detail = (await rows(`select public.get_service_order('${orderId}') as data`))[0].data;
      assert.equal(detail.steps.length, 2);
      const memberStep = detail.steps.find((step) => step.assignee_id === ids.member);
      const ownerStep = detail.steps.find((step) => step.assignee_id === ids.owner);
      assert.equal(ownerStep.depends_on_title, 'Instalar tomada');
      assert.equal(ownerStep.depends_on_completed, false);
      await denied(`select public.complete_service_order('${orderId}');`, '22023');
      await db.exec(`select public.start_service_order('${orderId}');`);
      await denied(`select public.complete_service_order_step('${ownerStep.id}');`, '22023');
      const blocker = (await rows(`select public.add_service_order_blocker('${orderId}', 'EXTERNAL', 'Instalar tomada', 'Almo') as id`))[0].id;
      await denied(`select public.complete_service_order('${orderId}');`, '22023');
      await as('postgres');
      await db.exec(`insert into private.user_permissions(user_id,permission_key) values
        ('${ids.member}','os.view'),('${ids.member}','os.execute'),('${ids.member}','os.complete');`);
      await as('authenticated', ids.member);
      assert.equal((await rows(`select public.get_service_order('${orderId}') as data`))[0].data.status, 'WAITING');
      await denied(`select public.complete_service_order_step('${ownerStep.id}');`);
      await db.exec(`select public.complete_service_order_step('${memberStep.id}', 'Tomada instalada');`);
      await denied(`select public.complete_service_order('${orderId}');`);
      await denied(`select public.resolve_service_order_blocker('${blocker}');`);
      await as('authenticated', ids.ownerB);
      assert.equal((await rows('select public.list_service_orders() as data'))[0].data.length, 0);
      assert.equal((await rows(`select public.get_service_order('${orderId}') as data`))[0].data, null);
      await denied(`select public.start_service_order('${orderId}');`, 'P0002');
      await as('authenticated', ids.owner);
      await db.exec(`select public.resolve_service_order_blocker('${blocker}', 'Conferido');`);
      assert.equal((await rows(`select public.get_service_order('${orderId}') as data`))[0].data.status, 'IN_PROGRESS');
      await denied(`select public.complete_service_order('${orderId}');`, '22023');
      await db.exec(`select public.complete_service_order_step('${ownerStep.id}', 'Câmera testada');`);
      await db.exec(`select public.complete_service_order('${orderId}');`);
      assert.equal((await rows(`select public.get_service_order('${orderId}') as data`))[0].data.status, 'COMPLETED');
      assert.equal(Number((await rows('select public.get_service_order_dashboard() as data'))[0].data.completed), 1);
      const openId = (await rows(create(ids.owner, ids.owner)))[0].id;
      const progressId = (await rows(create(ids.owner, ids.owner)))[0].id;
      const waitingId = (await rows(create(ids.owner, ids.owner)))[0].id;
      await db.exec(`select public.start_service_order('${progressId}');`);
      await db.exec(`select public.start_service_order('${waitingId}');`);
      await db.exec(`select public.add_service_order_blocker('${waitingId}', 'MATERIAL', 'Comprar tomada', 'Compras');`);
      const priorities = (await rows('select public.get_service_order_dashboard() as data'))[0].data.urgent;
      assert.deepEqual(priorities.map((order) => order.id), [waitingId, progressId, openId, orderId]);
      assert.equal(priorities[0].waiting_for, 'Comprar tomada');
      const orderedList = (await rows('select public.list_service_orders() as data'))[0].data;
      assert.deepEqual(orderedList.map((order) => order.id), [waitingId, progressId, openId, orderId]);
      await denied(`select public.complete_service_order('${orderId}');`, '22023');
      await denied(`select * from public.service_orders;`);
      await as('postgres');
      const osVerification = await readFile(new URL('../diagnostics/verify_service_orders.sql', import.meta.url), 'utf8');
      for (const result of await rows(osVerification)) assert.equal(result.passed, true, result.check_name);
    });
    t.diagnostic(`${checks} tentativas indevidas rejeitadas; falhas reproduzidas antes e bloqueadas depois.`);
  } finally {
    await db.close();
  }
});

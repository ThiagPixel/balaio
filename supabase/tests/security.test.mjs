import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const fixture = JSON.parse((await readFile(new URL('./fixtures/security-schema-before.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
const migration = await readFile(new URL('../migrations/0023_security_hardening.sql', import.meta.url), 'utf8');
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
    t.diagnostic(`${checks} tentativas indevidas rejeitadas; falhas reproduzidas antes e bloqueadas depois.`);
  } finally {
    await db.close();
  }
});

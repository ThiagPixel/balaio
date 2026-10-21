// Integração real: execute somente na empresa de QA identificada abaixo.
// A senha vem de LIVE_TEST_PASSWORD ou da primeira linha de stdin; nunca do repo.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const EXPECTED_TENANT_ID = 'c5758765-9038-43a7-826b-bb8504466b86';
const env = Object.fromEntries((await readFile(new URL('../../.env', import.meta.url), 'utf8'))
  .split(/\r?\n/).filter((line) => /^[A-Z_]+=/.test(line))
  .map((line) => { const separator = line.indexOf('='); return [line.slice(0, separator), line.slice(separator + 1)]; }));
const email = process.env.LIVE_TEST_EMAIL ?? 'teste2@qa.com';
const input = createInterface({ input: process.stdin, terminal: false });
const password = process.env.LIVE_TEST_PASSWORD ?? await new Promise((resolve) => input.once('line', resolve));
input.close();

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.code} ${error.message}`);
  return data;
}
async function denied(name, args, code) {
  const { error } = await supabase.rpc(name, args);
  assert.equal(error?.code, code, `${name} deveria rejeitar com ${code}: ${error?.message}`);
}

let productId;
try {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(`Login de QA falhou: ${authError.message}`);
  const access = await rpc('get_my_access_context');
  assert.equal(access.tenant?.id, EXPECTED_TENANT_ID, 'Conta fora da empresa de QA: execução abortada');
  assert.equal(access.tenant?.name, 'Teste');
  assert.equal(access.active, true);
  for (const permission of ['products.create', 'products.view', 'stock.view', 'stock.in', 'stock.out', 'stock.adjust']) {
    assert.ok(access.permissions.includes(permission), `Permissão ausente: ${permission}`);
  }
  console.log('Login, empresa isolada e permissões de estoque: OK');
  if (process.env.LIVE_TEST_ALLOW_WRITES !== '1') {
    console.log('Modo somente leitura: defina LIVE_TEST_ALLOW_WRITES=1 para ensaiar movimentações.');
    process.exitCode = 0;
  } else {
    const marker = randomUUID().slice(0, 8).toUpperCase();
    const sku = `QA-AUTOMATICO-${marker}`;
    productId = await rpc('create_product', {
      p_name: `Teste automático de estoque ${marker}`, p_sku: sku,
      p_description: 'Registro exclusivo da empresa Teste; criado por teste de integração',
      p_image_url: null, p_unit: 'un', p_cost_price: 0, p_sale_price: 0,
      p_min_stock: 0, p_current_stock: 0,
    });
    assert.match(productId, /^[0-9a-f-]{36}$/i);
    const args = (type, quantity) => ({ p_product_id: productId, p_type: type,
      p_quantity: quantity, p_unit_cost: null, p_notes: `Teste automático ${marker}` });
    const entry = await rpc('execute_stock_movement', args('IN', 5));
    assert.equal(entry.new_stock, 5);
    const withdrawal = await rpc('execute_stock_movement', args('OUT', 2));
    assert.equal(withdrawal.old_stock, 5);
    assert.equal(withdrawal.new_stock, 3);
    await denied('execute_stock_movement', args('OUT', 4), '22023');
    const adjustment = await rpc('execute_stock_movement', args('ADJUST', 1));
    assert.equal(adjustment.new_stock, 1);
    const products = await rpc('list_stock_products');
    assert.equal(products.find((product) => product.id === productId)?.current_stock, 1);
    const movements = await rpc('list_stock_movements', { p_limit: 100 });
    for (const [id, type, quantity] of [[entry.movement_id, 'IN', 5], [withdrawal.movement_id, 'OUT', 2], [adjustment.movement_id, 'ADJUST', 1]]) {
      const row = movements.find((movement) => movement.id === id);
      assert.equal(row?.movement_type, type);
      assert.equal(row?.quantity, quantity);
      assert.equal(row?.product_id, productId);
    }
    await rpc('set_product_active', { p_product_id: productId, p_active: false });
    console.log(`Entrada, retirada, ajuste, saldo, histórico e rejeição de retirada excessiva: OK (${sku}; produto desativado)`);
  }
  const anonymous = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: anonymousError } = await anonymous.rpc('list_stock_movements', { p_limit: 1 });
  assert.equal(anonymousError?.code, '42501');
  console.log('Acesso anônimo rejeitado: OK');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (productId) {
    const { error } = await supabase.rpc('set_product_active', { p_product_id: productId, p_active: false });
    if (error) { console.error(`ATENÇÃO: não foi possível desativar o produto de QA ${productId}: ${error.message}`); process.exitCode = 1; }
  }
  await supabase.auth.signOut();
}

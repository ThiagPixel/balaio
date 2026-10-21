import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/service-order-dashboard-links.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { serviceOrderHref, withServiceOrderIds } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

const id = "123e4567-e89b-42d3-a456-426614174000";

test("dashboard antigo associa a OS ao ID autorizado da listagem", () => {
  const [order] = withServiceOrderIds(
    [{ number: 7, title: "Instalar câmera" }],
    [{ number: 7, id }],
  );
  assert.equal(serviceOrderHref(order), `/service-orders/${id}`);
});

test("dashboard nunca cria rota undefined quando o ID não está disponível", () => {
  const [order] = withServiceOrderIds([{ number: 8 }], []);
  assert.equal(serviceOrderHref(order), "/service-orders");
  assert.equal(serviceOrderHref({ id: "undefined" }), "/service-orders");
});

test("dashboard atualizado mantém o próprio ID", () => {
  const [order] = withServiceOrderIds([{ number: 9, id }], []);
  assert.equal(serviceOrderHref(order), `/service-orders/${id}`);
});

import assert from "node:assert/strict";
import { NextResponse } from "next/server";
import { POST as loginPOST } from "../apps/web/app/api/auth/login/route.ts";
import { POST as logoutPOST } from "../apps/web/app/api/auth/logout/route.ts";
import { GET as accessGET } from "../apps/web/app/acceso/[token]/route.ts";
import { GET as chatGET, POST as chatPOST } from "../apps/web/app/api/chat/[clientId]/route.ts";
import { POST as resolveAlertPOST } from "../apps/web/app/api/alerts/[alertId]/resolve/route.ts";
import { POST as createClientPOST } from "../apps/web/app/api/clients/route.ts";
import { POST as metaSyncPOST } from "../apps/web/app/api/meta/sync/route.ts";
import { encodeSession, decodeSession } from "../apps/web/lib/session-core.ts";

function getCookieValue(response: Response, cookieName: string) {
  const setCookie = response.headers.get("set-cookie") ?? "";
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match?.[1] ?? null;
}

export async function runWebTests() {
  const loginResponse = (await loginPOST(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        role: "ceo",
        email: "mario@biaagency.com",
        password: "Bia2026!"
      })
    }) as unknown as Parameters<typeof loginPOST>[0]
  )) as NextResponse;

  assert.equal(loginResponse.status, 200);
  const loginJson = (await loginResponse.json()) as { ok: boolean; redirectTo?: string };
  assert.equal(loginJson.ok, true);
  assert.equal(loginJson.redirectTo, "/dashboard/ceo");

  const loginCookie = getCookieValue(loginResponse, "bia_ops_session");
  assert.ok(loginCookie);
  const loginSession = decodeSession(loginCookie ?? undefined);
  assert.deepEqual(loginSession, {
    userId: "user-ceo",
    role: "ceo",
    email: "mario@biaagency.com"
  });

  const clientResponse = (await accessGET(
    new Request("http://localhost/acceso/fit-and-go") as unknown as Parameters<typeof accessGET>[0],
    { params: { token: "fit-and-go" } }
  )) as NextResponse;

  assert.equal(clientResponse.status, 307);
  assert.match(clientResponse.headers.get("location") ?? "", /\/dashboard\/cliente\/demo-fit$/);
  const clientCookie = getCookieValue(clientResponse, "bia_ops_session");
  assert.ok(clientCookie);
  const clientSession = decodeSession(clientCookie ?? undefined);
  assert.deepEqual(clientSession, {
    userId: "user-demo-fit",
    role: "client",
    email: "operaciones@fitandgo.co",
    clientId: "demo-fit"
  });

  const logoutResponse = (await logoutPOST()) as NextResponse;
  assert.equal(logoutResponse.status, 307);
  assert.match(logoutResponse.headers.get("location") ?? "", /\/auth\/login$/);
  const logoutCookie = logoutResponse.headers.get("set-cookie") ?? "";
  assert.match(logoutCookie, /bia_ops_session=;/);
}

export async function runWebOperationalTests() {
  globalThis.__biaOpsTestSessionCookie = encodeSession({
    userId: "user-expert",
    role: "expert",
    email: "expert@biaagency.com"
  });

  const chatListResponse = (await chatGET(
    new Request("http://localhost/api/chat/demo-fit") as unknown as Parameters<typeof chatGET>[0],
    { params: { clientId: "demo-fit" } }
  )) as NextResponse;
  assert.equal(chatListResponse.status, 200);
  const chatListJson = (await chatListResponse.json()) as { ok: boolean; messages: Array<{ role: string; content: string }> };
  assert.equal(chatListJson.ok, true);
  assert.ok(chatListJson.messages.length >= 2);

  const chatPostResponse = (await chatPOST(
    new Request("http://localhost/api/chat/demo-fit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "Equipo, quiero revisar el presupuesto de la cuenta." })
    }) as unknown as Parameters<typeof chatPOST>[0],
    { params: { clientId: "demo-fit" } }
  )) as NextResponse;
  assert.equal(chatPostResponse.status, 200);
  const chatPostJson = (await chatPostResponse.json()) as { ok: boolean; messages: Array<{ role: string; content: string }> };
  assert.equal(chatPostJson.ok, true);
  assert.equal(chatPostJson.messages.at(-1)?.role, "expert");

  const resolveResponse = (await resolveAlertPOST(
    new Request("http://localhost/api/alerts/alert-casa-roas/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ note: "Se resolvio el ROAS bajo con cambios de segmentacion." })
    }) as unknown as Parameters<typeof resolveAlertPOST>[0],
    { params: { alertId: "alert-casa-roas" } }
  )) as NextResponse;
  assert.equal(resolveResponse.status, 200);
  const resolveJson = (await resolveResponse.json()) as { ok: boolean; alert: { status: string; resolved_by?: string } };
  assert.equal(resolveJson.ok, true);
  assert.equal(resolveJson.alert.status, "resolved");
  assert.equal(resolveJson.alert.resolved_by, "user-expert");

  const createClientResponse = (await createClientPOST(
    new Request("http://localhost/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        business_name: "QA Smoke Store",
        contact_name: "QA Local",
        email: "qa-smoke@example.com",
        whatsapp: "+573000000000",
        country: "Colombia",
        plan_type: "sprint",
        plan_price: 280,
        business_type: "E-commerce",
        category: "QA",
        active_platforms: ["meta"],
        additional_notes: "Created by test suite"
      })
    }) as unknown as Parameters<typeof createClientPOST>[0]
  )) as NextResponse;
  assert.equal(createClientResponse.status, 201);
  const createClientJson = (await createClientResponse.json()) as { ok: boolean; client: { business_name: string } };
  assert.equal(createClientJson.ok, true);
  assert.equal(createClientJson.client.business_name, "QA Smoke Store");

  const metaSyncResponse = (await metaSyncPOST(
    new Request("http://localhost/api/meta/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId: "demo-fit" })
    }) as unknown as Parameters<typeof metaSyncPOST>[0]
  )) as NextResponse;
  assert.equal(metaSyncResponse.status, 200);
  const metaSyncJson = (await metaSyncResponse.json()) as { ok: boolean; mode: string; metrics: unknown[] };
  assert.equal(metaSyncJson.ok, true);
  assert.ok(["demo", "live"].includes(metaSyncJson.mode));
  assert.ok(Array.isArray(metaSyncJson.metrics));

  globalThis.__biaOpsTestSessionCookie = null;
}

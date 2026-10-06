import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getOwnerNetworkHashes,
  hasOwnerCookie,
  invalidateOwnerNetworkCache,
  networkHash,
  networkKey,
  requestIp,
} from "@/lib/owner-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only (proxy.ts). Backs the "Exclude this network" panel on
// /admin/seo: shows whether the request you are looking at would be counted
// as a visitor, and manages the owner_networks list. See lib/owner-request.ts.
//
// The current network is returned to the dashboard so it can be shown, but
// it is never written anywhere: the table holds only hashes and labels.

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function listNetworks() {
  const { data, error } = await adminClient()
    .from("owner_networks")
    .select("id, label, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Cookie and network reported separately, not as one "excluded by": the
// dashboard request always carries the admin cookie, so that alone would
// never reveal whether the network itself is listed.
async function status(req: Request) {
  const ip = requestIp(req);
  const network = ip ? networkKey(ip) : null;
  const hash = network ? networkHash(network) : null;
  return {
    network,
    cookie: hasOwnerCookie(req),
    networkListed: hash !== null && (await getOwnerNetworkHashes()).has(hash),
    networks: await listNetworks(),
  };
}

export async function GET(req: Request) {
  try {
    return NextResponse.json(await status(req));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Adds the network this request came from. There is deliberately no way to
// type an arbitrary address: the only network that can be added is the one
// the dashboard is being viewed from, which is the one that needs excluding.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const label =
      typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 80) : null;

    const ip = requestIp(req);
    const hash = ip ? networkHash(networkKey(ip)) : null;
    if (!hash) {
      return NextResponse.json(
        { error: "No source address on this request, or ADMIN_SESSION_SECRET is not set" },
        { status: 400 }
      );
    }

    const { error } = await adminClient()
      .from("owner_networks")
      .upsert({ network_hash: hash, label }, { onConflict: "network_hash", ignoreDuplicates: true });
    if (error) throw new Error(error.message);

    invalidateOwnerNetworkCache();
    return NextResponse.json(await status(req));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await adminClient().from("owner_networks").delete().eq("id", id);
    if (error) throw new Error(error.message);

    invalidateOwnerNetworkCache();
    return NextResponse.json(await status(req));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

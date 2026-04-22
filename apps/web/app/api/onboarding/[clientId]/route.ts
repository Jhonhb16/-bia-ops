import { NextResponse } from "next/server";
import { updateOnboardingStep } from "@/lib/data-store";

export async function POST(request: Request, { params }: { params: { clientId: string } }) {
  try {
    const body = (await request.json()) as { step: number };
    const step = Number(body.step);
    if (!step || step < 1 || step > 7) {
      return NextResponse.json({ ok: false, error: "Paso invalido" }, { status: 400 });
    }
    await updateOnboardingStep(params.clientId, step);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

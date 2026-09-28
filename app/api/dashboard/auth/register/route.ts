import type { NextRequest } from "next/server";
import { requestOriginIsAllowed } from "../../../../admin-auth";
import { registerTeamUser } from "../../../../team-store";

export async function POST(request: NextRequest) {
  if (!requestOriginIsAllowed(request)) return Response.json({ message: "Запрос отклонён." }, { status: 403 });
  try {
    const input = await request.json() as { name?: unknown; login?: unknown; password?: unknown };
    const user = await registerTeamUser({ name: input.name, login: input.login, password: input.password });
    return Response.json({ user, message: "Заявка на регистрацию отправлена. Вход откроется после одобрения." }, { status: 201 });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "Не удалось зарегистрироваться." }, { status: 400 });
  }
}

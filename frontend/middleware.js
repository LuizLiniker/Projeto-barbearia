import { NextResponse } from "next/server";

// Rotas que exigem autenticação
const ROTAS_PROTEGIDAS = [
  "/tela-agendamento",
  "/admin",
  "/alterar-senha",
];

// Rotas públicas (não redireciona se já autenticado)
const ROTAS_PUBLICAS = ["/login"];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;

  const eRotaProtegida = ROTAS_PROTEGIDAS.some((rota) =>
    pathname.startsWith(rota)
  );

  const eRotaPublica = ROTAS_PUBLICAS.some((rota) =>
    pathname.startsWith(rota)
  );

  // Sem token tentando acessar rota protegida → vai para login
  if (eRotaProtegida && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Com token tentando acessar login → vai para agendamento
  if (eRotaPublica && token) {
    return NextResponse.redirect(
      new URL("/tela-agendamento", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/tela-agendamento/:path*",
    "/admin/:path*",
    "/alterar-senha/:path*",
    "/login",
  ],
};
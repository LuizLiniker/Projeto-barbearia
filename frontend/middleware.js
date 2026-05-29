import { NextResponse } from "next/server"

export function middleware(request) {

    const token =
        request.cookies.get("token")

    const pathname =
        request.nextUrl.pathname

    // rotas públicas
    const rotasPublicas = [
        "/",
        "/login"
    ]

    const rotaPublica =
        rotasPublicas.includes(pathname)

    // se não tiver token
    if (!token && !rotaPublica) {

        return NextResponse.redirect(
            new URL("/login", request.url)
        )
    }

    // se já estiver logado
    // e tentar acessar login
    if (token && rotaPublica) {

        return NextResponse.redirect(
            new URL(
                "/tela-agendamento",
                request.url
            )
        )
    }

    return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
}
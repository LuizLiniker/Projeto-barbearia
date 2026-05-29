"use client"

import "./alterar-senha.css"

import { useState } from "react"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Cookies from "js-cookie"

export default function AlterarSenha() {

    const router = useRouter()

    const [novaSenha, setNovaSenha] =
        useState("")

    const [loading, setLoading] =
        useState(false)

    const API_URL =
        process.env.NEXT_PUBLIC_API_URL

    async function alterarSenha() {

        try {

            setLoading(true)

            const token =
            Cookies.get("token")

            const resposta = await fetch(
                `${API_URL}/alterar-senha`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        novaSenha
                    })
                }
            )

            if (!resposta.ok) {
                throw new Error()
            }

            toast.success(
                "Senha alterada com sucesso"
            )

            router.push("/tela-agendamento")

        } catch (err) {

            console.log(err)

            toast.error(
                "Erro ao alterar senha"
            )

        } finally {

            setLoading(false)
        }
    }

    return (

        <section className="container-alterar">

            <div className="card-alterar">

                <img
                    src="/logo.jpeg"
                    alt="Logo"
                    className="logo-alterar"
                />

                <h1 className="titulo-alterar">
                    Altere sua senha
                </h1>

                <p className="subtitulo-alterar">
                    Por segurança, altere sua senha temporária
                </p>

                <input
                    type="password"
                    placeholder="Digite a nova senha"
                    value={novaSenha}
                    onChange={(e) =>
                        setNovaSenha(e.target.value)
                    }
                    className="input-alterar"
                />

                <button
                    onClick={alterarSenha}
                    className="btn-alterar"
                    disabled={loading}
                >
                    {
                        loading
                        ? "Salvando..."
                        : "Salvar nova senha"
                    }
                </button>

            </div>

        </section>
    )
}
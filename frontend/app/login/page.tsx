"use client"
import "./login.css";
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

export default function Login(){

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [mostraSenha, setMostraSenha] = useState(false)
  const [manterConectado, setManterConectado] = useState(false)

  async function handleLogin(){
    try {
      const resposta = await fetch("http://localhost:3333/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha })
      })

      if (!resposta.ok) throw new Error("Erro ao buscar os dados")

      const dados = await resposta.json()
      console.log(dados)
    } catch(error) {
      console.log("Ocorreu um erro", error)
    }
  }

  return (
    <section className="container">

      {/* ── Barra do título ── */}
      <div className="barra-titulo">
        <h1 className="titulo">✦ Barbearia do Higor ✦</h1>
      </div>

      {/* ── Conteúdo: foto + form ── */}
      <div className="conteudo">

        {/* Foto lado esquerdo */}
        <div className="foto">
          <img
            src="/imagem1.png"
            alt="Barbearia do Higor"
            className="img"
          />
        </div>

        {/* Formulário lado direito */}
        <div className="form">

          <h3 className="titulo">Entre na sua conta</h3>

          {/* E-mail */}
          <label className="label" htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />

          {/* Senha com botão olho */}
          <label className="label" htmlFor="senha">Senha</label>
          <div className="input-senha-wrapper">
            <input
              id="senha"
              type={mostraSenha ? "text" : "password"}
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="input"
            />
            <button
              type="button"
              className="btn-olho"
              onClick={() => setMostraSenha(!mostraSenha)}
              aria-label={mostraSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostraSenha ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Manter conectado + criar conta */}
          <div className="form-rodape">
            <label className="manter-conectado">
              <input
                type="checkbox"
                checked={manterConectado}
                onChange={() => setManterConectado(!manterConectado)}
              />
              Manter conectado
            </label>
            <a href="#" className="link-criar">Criar conta</a>
          </div>

          {/* Botão entrar */}
          <button
            type="button"
            onClick={handleLogin}
            className="btn-entrar"
          >
            Entrar
          </button>

        </div>
      </div>

    </section>
  )
}
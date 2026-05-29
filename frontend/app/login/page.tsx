"use client";

import "./login.css";
import { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Cookies from "js-cookie"

export default function Login() {
const router = useRouter();

const [email, setEmail] = useState("");
const [senha, setSenha] = useState("");
const [mostraSenha, setMostraSenha] = useState(false);
const [manterConectado, setManterConectado] = useState(false);
const [modalAberto, setModalAberto] = useState(false);

const [nome, setNome] = useState("");
const [telefone, setTelefone] = useState("");
const [emailCadastro, setEmailCadastro] = useState("");
const [senhaCadastro, setSenhaCadastro] = useState("");
const [mostraSenhaCadastro, setMostraSenhaCadastro] = useState(false);

const [loadingLogin, setLoadingLogin] = useState(false);
const [loadingCadastro, setLoadingCadastro] = useState(false);

const [modalEsqueciSenha, setModalEsqueciSenha] = useState(false);
const [emailReset, setEmailReset] = useState("");
const [codigo, setCodigo] = useState("");
const [novaSenha, setNovaSenha] = useState("");
const [etapaReset, setEtapaReset] = useState(1);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function handleLogin() {
try {
  setLoadingLogin(true);

  const resposta = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      senha,
    }),
  });

  if (!resposta.ok) {
    throw new Error("Erro ao realizar login");
  }

  const dados = await resposta.json();

  console.log(dados);

  toast.success("Login realizado com sucesso");

  setEmail("");
  setSenha("");

  Cookies.set(
  "token",
  dados.token,
  {
      expires: 7
  }
)

  if (dados.precisaTrocarSenha) {

    router.push("/alterar-senha")
    return
}

if (dados.usuario.tipo === "barbeiro") {
router.push("/admin");
} else {
router.push("/tela-agendamento");
}

} catch (error) {
  console.log(error);

  toast.error("Erro ao realizar login");
} finally {
  setLoadingLogin(false);
}
}

async function handleCadastro() {
try {
  setLoadingCadastro(true);

  const resposta = await fetch(`${API_URL}/usuarios`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
nome,
numero: telefone,
email: emailCadastro,
senha: senhaCadastro,
tipo: "cliente"
}),
  });

  if (!resposta.ok) {
    throw new Error("Erro ao cadastrar");
  }

  const dados = await resposta.json();

  console.log(dados);

  toast.success("Cadastro realizado com sucesso");

  setNome("");
  setTelefone("");
  setEmailCadastro("");
  setSenhaCadastro("");

  setModalAberto(false);

  router.push("/tela-agendamento");
} catch (error) {
  console.log(error);

  toast.error("Erro ao realizar cadastro");
} finally {
  setLoadingCadastro(false);
}
}

function fecharModal() {
setModalAberto(false);

setNome("");
setTelefone("");
setEmailCadastro("");
setSenhaCadastro("");
}

return (
<>
  <section className="container">
    <div className="img-logo">
      <img src="/logo.jpeg" alt="" className="logo" />
    </div>

    <div className="conteudo">
      <div className="foto">
        <img
          src="/imagem1.png"
          alt="Barbearia do Higor"
          className="img"
        />
      </div>

      <div className="form">
        <h3 className="titulo">Entre na sua conta</h3>

        <label className="label" htmlFor="email">
          E-mail
        </label>

        <input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />

        <label className="label" htmlFor="senha">
          Senha
        </label>

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
            aria-label={
              mostraSenha ? "Ocultar senha" : "Mostrar senha"
            }
          >
            {mostraSenha ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>

        <div className="form-rodape">
          <label className="manter-conectado">
            <input
              type="checkbox"
              checked={manterConectado}
              onChange={() =>
                setManterConectado(!manterConectado)
              }
            />

            Manter conectado
          </label>

          <a
            href="#"
            className="link-criar"
            onClick={(e) => {
              e.preventDefault();
              setModalAberto(true);
            }}
          >
            Criar conta
          </a>
          <a
            className="link-esqueci"
            onClick={() => setModalEsqueciSenha(true)}
          >
            Esqueci minha senha
          </a>
        </div>
          
        <button
          type="button"
          onClick={handleLogin}
          className="btn-entrar"
          disabled={loadingLogin}
        >
          {loadingLogin ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  </section>

  {modalAberto && (
    <div
      className="modal-overlay"
      onClick={fecharModal}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-titulo">
            Criar conta
          </h3>

          <button
            type="button"
            className="modal-fechar"
            onClick={fecharModal}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <p className="modal-subtitulo">
          Preencha seus dados para se cadastrar
        </p>

        <div className="modal-campos">
          <label className="label" htmlFor="nome">
            Nome completo
          </label>

          <input
            id="nome"
            type="text"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="input"
          />

          <label
            className="label"
            htmlFor="telefone"
          >
            Telefone
          </label>

          <input
            id="telefone"
            type="tel"
            placeholder="(00) 00000-0000"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="input"
          />

          <label
            className="label"
            htmlFor="email-cadastro"
          >
            E-mail
          </label>

          <input
            id="email-cadastro"
            type="email"
            placeholder="seu@email.com"
            value={emailCadastro}
            onChange={(e) =>
              setEmailCadastro(e.target.value)
            }
            className="input"
          />

          <label
            className="label"
            htmlFor="senha-cadastro"
          >
            Senha
          </label>

          <div className="input-senha-wrapper">
            <input
              id="senha-cadastro"
              type={
                mostraSenhaCadastro
                  ? "text"
                  : "password"
              }
              placeholder="••••••••"
              value={senhaCadastro}
              onChange={(e) =>
                setSenhaCadastro(e.target.value)
              }
              className="input"
            />

            <button
              type="button"
              className="btn-olho"
              onClick={() =>
                setMostraSenhaCadastro(
                  !mostraSenhaCadastro
                )
              }
              aria-label={
                mostraSenhaCadastro
                  ? "Ocultar senha"
                  : "Mostrar senha"
              }
            >
              {mostraSenhaCadastro ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCadastro}
          className="btn-entrar"
          disabled={loadingCadastro}
        >
          {loadingCadastro
            ? "Cadastrando..."
            : "Cadastrar"}
        </button>
      </div>
    </div>
  )}
  {modalEsqueciSenha && (
  <div className="modal-overlay" onClick={() => setModalEsqueciSenha(false)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>

      <h3 className="modal-titulo">Recuperar senha</h3>

      {etapaReset === 1 && (
        <>
          <input
            className="input"
            placeholder="Seu e-mail"
            value={emailReset}
            onChange={(e) => setEmailReset(e.target.value)}
          />

          <button
            className="btn-entrar"
            onClick={async () => {
              const res = await fetch(`${API_URL}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: emailReset }),
              });

              const data = await res.json();

              if (!res.ok) return toast.error(data.erro);

              toast.success("Código enviado (ver console)");

              console.log("CÓDIGO:", data.code);

              setEtapaReset(2);
            }}
          >
            Gerar código
          </button>
        </>
      )}

      {etapaReset === 2 && (
        <>
          <input
            className="input"
            placeholder="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />

          <input
            className="input"
            placeholder="Nova senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />

          <button
            className="btn-entrar"
            onClick={async () => {
              const res = await fetch(`${API_URL}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: emailReset,
                  code: codigo,
                  newPassword: novaSenha,
                }),
              });

              const data = await res.json();

              if (!res.ok) return toast.error(data.erro);

              toast.success("Senha alterada!");

              setModalEsqueciSenha(false);
              setEtapaReset(1);
              setEmailReset("");
            }}
          >
            Alterar senha
          </button>
        </>
      )}

    </div>
  </div>
)}

</>
);
}
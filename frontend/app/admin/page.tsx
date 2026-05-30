"use client";

import "./admin.css";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

interface Agendamento {
  id: number;
  datetime: string;
  nome_cliente: string;
  telefone_cliente: string;
}

export default function Admin() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  async function buscarAgendamentos() {
    try {
      const token = Cookies.get("token");

      const resposta = await fetch(`${API_URL}/api/agendamentos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const dados = await resposta.json();

      setAgendamentos(dados);
    } catch (error) {
      console.log(error);
      toast.error("Erro ao buscar agendamentos");
    } finally {
      setLoading(false);
    }
  }

  async function cancelarAgendamento(id: number) {
    const confirmar = window.confirm("Deseja cancelar este agendamento?");

    if (!confirmar) return;

    try {
      const token = Cookies.get("token");

      const resposta = await fetch(`${API_URL}/api/agendamentos/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resposta.ok) throw new Error();

      toast.success("Agendamento cancelado");

      buscarAgendamentos();
    } catch (error) {
      console.log(error);
      toast.error("Erro ao cancelar");
    }
  }

  useEffect(() => {
    buscarAgendamentos();
  }, []);

  return (
    <section className="container-admin">
      <div className="header-admin">
        <img src="/logo.jpeg" alt="Logo" className="logo-admin" />

        <h1>Painel do Barbeiro</h1>

        <button onClick={buscarAgendamentos} className="btn-atualizar">
          Atualizar
        </button>
      </div>

      {loading ? (
        <p className="mensagem">Carregando agendamentos...</p>
      ) : agendamentos.length === 0 ? (
        <p className="mensagem">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="lista-agendamentos">
          {agendamentos.map((agendamento) => (
            <div key={agendamento.id} className="card-agendamento">

              <h3>
                {agendamento.nome_cliente || "Cliente não informado"}
              </h3>

              <p>
                📞 {agendamento.telefone_cliente || "Sem telefone"}
              </p>

              <p>
                📅{" "}
                {new Date(agendamento.datetime).toLocaleDateString("pt-BR")}
              </p>

              <p>
                ⏰{" "}
                {new Date(agendamento.datetime).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <button
                className="btn-cancelar"
                onClick={() => cancelarAgendamento(agendamento.id)}
              >
                Cancelar Agendamento
              </button>

            </div>
          ))}
        </div>
      )}
    </section>
  );
}